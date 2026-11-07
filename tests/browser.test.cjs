const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const {resolve, extname, sep} = require('node:path');
const {chromium} = require('playwright');

const root = resolve(__dirname, '..');
const accounts = {
  'alice@example.test':'00000000-0000-4000-8000-000000000001',
  'bob@example.test':'00000000-0000-4000-8000-000000000002'
};
const origin = 'https://academy-test.supabase.co';
function session(email) {
  const now = Math.floor(Date.now()/1000), id = accounts[email];
  const claims = {sub:id, aud:'authenticated', role:'authenticated', exp:now+3600, iat:now, session_id:id};
  const token = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.test';
  return {access_token:token, refresh_token:'test-refresh-'+email, token_type:'bearer', expires_in:3600, expires_at:now+3600, user:{id, email, aud:'authenticated', role:'authenticated', app_metadata:{provider:'email'}, user_metadata:{}, created_at:new Date().toISOString()}};
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function eventually(fn) {
  for(let i=0;i<100;i++){if(await fn())return;await sleep(50);}
  assert.fail('Expected condition was not reached');
}

test('browser: learning records, migration, two-device sync, isolation, conflicts and offline recovery', {timeout:90000}, async () => {
  const server = createServer(async (req,res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/aws-architecture-academy\//,'/');
      const file = resolve(root, '.'+(pathname==='/'?'/index.html':pathname));
      if (!file.startsWith(root+sep)) {res.writeHead(403).end();return;}
      const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
      const contents=await readFile(file);
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain'}); res.end(contents);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const url = `http://127.0.0.1:${server.address().port}/aws-architecture-academy/`;
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const rows = new Map(), errors=[];
  async function device(viewport={width:390,height:844}, configured=true) {
    const context = await browser.newContext({viewport,serviceWorkers:'block'});
    const state={online:true,failRead:false};
    if(configured)await context.route('**/config.js', route=>route.fulfill({contentType:'text/javascript',body:`window.ACADEMY_CONFIG={enabled:true,supabaseUrl:'${origin}',supabasePublishableKey:'sb_publishable_test'};`}));
    await context.route(origin+'/**', async route=>{
      if(!state.online){await route.abort('internetdisconnected');return;}
      const req=route.request(), u=new URL(req.url()), body=req.postDataJSON();
      const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(u.pathname==='/auth/v1/signup')return json({user:{id:accounts[body.email],email:body.email},session:null});
      if(u.pathname==='/auth/v1/recover')return json({});
      if(u.pathname==='/auth/v1/token')return json(session(body.email || 'alice@example.test'));
      if(u.pathname==='/auth/v1/logout')return json({});
      const token=req.headers().authorization?.split(' ')[1];
      const id=token?.split('.').length===3?JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub:null;
      if(u.pathname==='/auth/v1/user')return json({id,email:Object.keys(accounts).find(k=>accounts[k]===id)});
      if(u.pathname==='/rest/v1/academy_accounts'){
        if(state.failRead)return json({message:'unavailable'},503);
        return json(rows.has(id)?[rows.get(id)]:[]);
      }
      if(u.pathname==='/rest/v1/rpc/save_academy_state'){
        if(body.p_user_id!==id)return json({code:'42501',message:'wrong account'},403);
        const old=rows.get(id);
        if((old?.revision||0)!==body.p_expected_revision)return json({code:'PT409',message:'conflict'},409);
        const row={user_id:id,data:body.p_data,revision:(old?.revision||0)+1};rows.set(id,row);return json([row]);
      }
      return json({message:'unknown fixture route'},404);
    });
    const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url); await page.waitForFunction(()=>Number(document.getElementById('svc-total')?.textContent)>0);
    return {page,context,state};
  }
  async function login(page,email='alice@example.test') {
    await page.locator('[data-account="login"]').click();
    await page.locator('#accountForm input[name="email"]').fill(email);
    await page.locator('#accountForm input[name="password"]').fill('test-password-123');
    await page.locator('#accountForm button[type="submit"]').click();
    await eventually(async()=> (await page.locator('.account-email').textContent())===email);
    await page.waitForFunction(()=>Number(document.getElementById('svc-total')?.textContent)>0);
  }
  async function openService(page, id='ec2') {
    await page.evaluate(id=>{location.hash='services/'+id},id);
    await page.locator('.memo-text').waitFor();
  }
  async function home(page) {
    await page.evaluate(()=>{location.hash='home'});
    await page.locator('#home').waitFor({state:'visible'});
  }
  async function answer(page) {
    await page.evaluate(()=>{location.hash='practice'});
    await page.locator('#quiz-start').click();
    const good=await page.evaluate(async()=>{
      const {questions}=await import('./data/questions.js');
      const q=questions.find(q=>q.prompt===document.getElementById('quiz-prompt').textContent);
      return q.choices.flatMap((c,i)=>c.correct?[i]:[]);
    });
    for(const i of good)await page.locator('#quiz-choices input').nth(i).check();
    await eventually(async()=>await page.locator('#attempt-count').textContent()==='1');
    await page.locator('#quiz-exit').click();
    await home(page);
  }
  try {
    const a=await device(), b=await device();
    await a.page.locator('[data-account="login"]').click();
    await a.page.locator('[data-account="signup"]').click();
    await a.page.locator('input[name="email"]').fill('alice@example.test');
    await a.page.locator('input[name="password"]').fill('test-password-123');
    await a.page.locator('#accountForm button').click();
    await eventually(async()=> (await a.page.locator('#accountMessage').textContent()).includes('確認メール'));
    assert.equal(rows.size,0);
    await a.page.locator('#accountOverlay [data-account="login"]').click();
    await a.page.locator('[data-account="reset"]').click();
    await a.page.locator('input[name="email"]').fill('alice@example.test');
    await a.page.locator('#accountForm button').click();
    await eventually(async()=> (await a.page.locator('#accountMessage').textContent()).includes('確認メール'));
    await a.page.locator('[data-account="close"]').click();
    // Existing guest notes, completion, attempts and workspace stay out of the account until explicit import.
    await openService(a.page);
    await a.page.locator('.memo-text').fill('EC2 の復習 <script>literal</script>');
    await a.page.locator('.ex-done-btn').click();
    await answer(a.page);
    await a.page.evaluate(()=>{location.hash='build'});
    await a.page.locator('.bd-card').first().click();
    const problemId=await a.page.evaluate(()=>location.hash.split('/')[1]);
    await a.page.locator('.bd-pi').first().click();
    await home(a.page);
    await login(a.page);
    assert.equal(rows.size,0);
    assert.equal(await a.page.locator('#attempt-count').textContent(),'0');
    a.page.once('dialog',d=>d.accept());
    await Promise.all([a.page.waitForEvent('load'),a.page.locator('[data-account="import"]').click()]);
    const alice=accounts['alice@example.test'],bob=accounts['bob@example.test'];
    await eventually(()=>rows.get(alice)?.data.records['aaa.practice.attempts.v1']?.length===1);
    await a.page.waitForFunction(()=>Number(document.getElementById('svc-total')?.textContent)>0);
    await login(b.page);
    assert.equal(await b.page.locator('#attempt-count').textContent(),'1');
    await openService(b.page);
    assert.equal(await b.page.locator('.memo-text').inputValue(),'EC2 の復習 <script>literal</script>');
    assert.equal(await b.page.locator('.ex-done-btn').getAttribute('aria-pressed'),'true');
    assert.equal(await b.page.locator('.memo-text script').count(),0);
    // The same saved workspace is available on another device.
    await b.page.evaluate(id=>{location.hash='build/'+id},problemId);
    await b.page.locator('.bd-prob').waitFor();
    assert.equal(await b.page.locator('.bd-pi[aria-pressed="true"]').count(),1);
    await home(b.page);
    // Let page-navigation writes settle before syncing the other device.
    await eventually(async()=> (await b.page.locator('#accountBar').innerText()).includes('同期済み'));
    await a.page.locator('[data-account="refresh"]').click();
    await a.page.waitForFunction(()=>Number(document.getElementById('svc-total')?.textContent)>0);
    // A real edited memo, persisted while offline, survives reload.
    await openService(b.page);
    await eventually(async()=> (await b.page.locator('#accountBar').innerText()).includes('同期済み'));
    b.state.online=false;
    await b.page.locator('.memo-text').fill('オフラインの追記');
    await sleep(800);
    await b.page.reload();await b.page.locator('.memo-text').waitFor();
    assert.equal(await b.page.locator('.memo-text').inputValue(),'オフラインの追記');
    // The first device advances the revision without silently replacing the pending edit.
    await a.page.reload();await a.page.waitForFunction(()=>Number(document.getElementById('svc-total')?.textContent)>0);
    await openService(a.page);
    await a.page.locator('.memo-text').fill('別端末の更新');
    await eventually(()=>rows.get(alice)?.data.records['aaa.notebook.v1']?.notes.ec2==='別端末の更新');
    b.state.online=true;
    await b.page.locator('[data-account="refresh"]').click();
    await b.page.locator('[data-account="cloud"]').waitFor();
    assert.equal(rows.get(alice).data.records['aaa.notebook.v1'].notes.ec2,'別端末の更新');
    b.page.once('dialog',d=>d.accept());
    await b.page.locator('[data-account="replace"]').click();
    await eventually(()=>rows.get(alice).data.records['aaa.notebook.v1'].notes.ec2==='オフラインの追記');
    // Refreshing study content requires confirmation; home refresh is automatic.
    await a.page.locator('#global-search').focus(); // prevent auto refresh until the explicit action
    a.page.once('dialog',d=>d.accept());
    await a.page.locator('[data-account="refresh"]').click();
    await eventually(async()=>await a.page.locator('.memo-text').inputValue()==='オフラインの追記');
    await home(b.page);
    await eventually(async()=> (await b.page.locator('#accountBar').innerText()).includes('同期済み'));
    await b.page.locator('[data-account="logout"]').click();
    await eventually(async()=> (await b.page.locator('.account-email').textContent())==='この端末だけで利用中');
    assert.equal(await b.page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('aaa.account.'))),false);
    await login(b.page,'bob@example.test');
    assert.equal(await b.page.locator('#attempt-count').textContent(),'0');
    await openService(b.page);
    assert.equal(await b.page.locator('.memo-text').inputValue(),'');
    await b.page.locator('.memo-text').fill('Bob only');
    await eventually(()=>rows.get(bob)?.data.records['aaa.notebook.v1']?.notes.ec2==='Bob only');
    assert.equal(rows.get(alice).data.records['aaa.notebook.v1'].notes.ec2,'オフラインの追記');
    assert.equal(await b.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    // A failed first cloud read blocks editing rather than writing an empty account.
    const c=await device();c.state.failRead=true;
    await c.page.locator('[data-account="login"]').click();
    await c.page.locator('input[name="email"]').fill('alice@example.test');
    await c.page.locator('input[name="password"]').fill('test-password-123');
    await c.page.locator('#accountForm button').click();
    await c.page.getByRole('heading',{name:'データを読み込めませんでした'}).waitFor();
    await c.page.keyboard.press('Escape');
    assert.equal(await c.page.locator('#siteShell').evaluate(n=>n.inert),true);
    // The pending SQL setup must not stop the public learning site.
    const guest=await device({width:1440,height:1000},false);
    assert.equal(await guest.page.locator('[data-account="login"]').isDisabled(),true);
    await openService(guest.page);
    await guest.page.locator('.memo-text').fill('Guest persisted');
    await guest.page.reload();await guest.page.locator('.memo-text').waitFor();
    assert.equal(await guest.page.locator('.memo-text').inputValue(),'Guest persisted');
    for(const width of [375,768,1440]){
      await guest.page.setViewportSize({width,height:950});await home(guest.page);
      assert.equal(await guest.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await guest.page.screenshot({path:'/tmp/academy-account-desktop.png',fullPage:true});
    await home(b.page);
    await b.page.evaluate(()=>window.scrollTo(0,0));
    await b.page.screenshot({path:'/tmp/academy-account-mobile.png'});
    // Learning still works when localStorage is disabled.
    const blockedContext=await browser.newContext();
    await blockedContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}}));
    const blocked=await blockedContext.newPage();blocked.on('pageerror',e=>errors.push(e.message));
    await blocked.goto(url);await openService(blocked);
    await blocked.locator('.memo-text').fill('memory only');
    assert.equal(await blocked.locator('#storage-warning').isVisible(),true);
    assert.equal(await blocked.locator('.memo-text').inputValue(),'memory only');
    await blockedContext.close();
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
});
