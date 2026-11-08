// コマンド・ポリシー演習のテスト: パーサー・判定・採点・セキュリティ(エンジン)と、画面の操作・学習記録・同期(ブラウザ)。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {readFile} = require('node:fs/promises');
const {resolve, extname, sep} = require('node:path');
const {pathToFileURL} = require('node:url');

const root = resolve(__dirname, '..');
const load = (p) => import(pathToFileURL(resolve(root, p)).href);

test('command lab engine: syntax, equivalence, over-grant, roles, unsupported, CLI, API, all questions', async () => {
  const {LAB_QUESTIONS, labById, iamEnv} = await load('data/command-lab/index.js');
  const {gradePolicy, gradeGoals, gradeTemplate, gradeChoice} = await load('lab-engine/grade.js');
  const {deployTemplate} = await load('lab-engine/cfn.js');
  const {parseYaml} = await load('lab-engine/yaml.js');
  const {matchPattern, validatePattern} = await load('lab-engine/events.js');
  const {ROADMAP} = await load('data/command-lab/roadmap.js');
  const {newSession, runCli} = await load('lab-engine/simulator-cli.js');
  const {newApiSession, sendRequest, looksLikeSecret} = await load('lab-engine/simulator-api.js');
  const {evaluate} = await load('lab-engine/simulator-iam.js');
  const {parseJson} = await load('lab-engine/json.js');

  // Phase 2 の 80 問(IAM 28 / CLI 22 / API 18 / CloudFormation 12)、各問に根拠資料とレビュー日(AC-13)
  assert.equal(LAB_QUESTIONS.length, 80);
  assert.deepEqual(['iam', 'cli', 'api', 'cfn'].map((c) => LAB_QUESTIONS.filter((q) => q.category === c).length), [28, 22, 18, 12]);
  assert.equal(new Set(LAB_QUESTIONS.map((q) => q.id)).size, 80);
  // ロードマップはすべての問題を 1 回ずつ含む
  const rm = ROADMAP.flatMap((st) => st.ids);
  assert.equal(rm.length, 80);
  assert.deepEqual([...new Set(rm)].sort(), LAB_QUESTIONS.map((q) => q.id).sort());
  for (const q of LAB_QUESTIONS) {
    assert.ok(q.references.length >= 1 && q.references.every((r) => /^https:\/\//.test(r.url)), q.id);
    assert.match(q.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(q.hints.length >= 2 && q.explain.point && q.explain.compare, q.id);
  }
  // すべての模範解答はクリアし、記述・修復の初期状態はクリアしない
  for (const q of LAB_QUESTIONS) {
    if (q.category === 'iam' && q.mode !== 'read') {
      assert.equal(gradePolicy(q, q.model, iamEnv(q)).status, 'pass', q.id);
      assert.notEqual(gradePolicy(q, q.editor.starter, iamEnv(q)).status, 'pass', q.id);
    } else if (q.category === 'cli') {
      const s = newSession(q.editor.env);
      q.model.split('\n').forEach((l) => runCli(s, l));
      assert.equal(gradeGoals(q, s).status, 'pass', q.id);
      if (q.editor.starter) { const s0 = newSession(q.editor.env); q.editor.starter.split('\n').forEach((l) => runCli(s0, l)); assert.notEqual(gradeGoals(q, s0).status, 'pass', q.id); }
    } else if (q.category === 'cfn' && q.mode === 'read') {
      for (const params of [{}, ...Object.values(q.deployParams || {})]) assert.equal(deployTemplate(q.code, {params}).ok, true, q.id);
      assert.equal(gradeChoice(q, q.choices.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0)).status, 'correct', q.id);
    } else if (q.category === 'cfn') {
      assert.equal(gradeTemplate(q, q.model).status, 'pass', q.id);
      assert.notEqual(gradeTemplate(q, q.editor.starter).status, 'pass', q.id);
    } else if (q.category === 'api') {
      const s = newApiSession(q.editor.env); sendRequest(s, q.model);
      assert.equal(gradeGoals(q, s).status, 'pass', q.id);
      const s2 = newApiSession(q.editor.env); sendRequest(s2, q.editor.starter);
      assert.notEqual(gradeGoals(q, s2).status, 'pass', q.id);
    }
  }
  const q1 = labById.get('iam-s3-001'), env1 = iamEnv(q1);
  // AC-03: 不正な JSON は行・列と手掛かりを返す
  const bad = gradePolicy(q1, '{\n  "Version": "2012-10-17",\n  "Statement": [\n    {"Effect": "Allow",}\n  ]\n}', env1);
  assert.equal(bad.status, 'syntax');
  assert.equal(bad.syntax.line, 4);
  assert.match(bad.syntax.hint, /末尾のカンマ/);
  assert.throws(() => parseJson("{'a': 1}"), (e) => /シングルクォート/.test(e.hint) && e.line === 1 && e.col === 2);
  // AC-04: キー順・空白・書き方(配列か文字列か・ステートメントの分割)の違いだけでは不正解にしない
  const variants = [
    '{"Statement":[{"Resource":["arn:aws:s3:::my-bucket/users/${aws:username}/*"],"Action":["s3:PutObject","s3:GetObject"],"Effect":"Allow"}],"Version":"2012-10-17"}',
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*"},{"Effect":"Allow","Action":"s3:PutObject","Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*"}]}',
    '{\n\n"Version" : "2012-10-17" ,\t"Statement" : { "Effect":"Allow", "Action":["s3:getobject","S3:PutObject"], "Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*" } }',
  ];
  for (const v of variants) assert.equal(gradePolicy(q1, v, env1).status, 'pass', v);
  // AC-05: alice は自分のオブジェクトを許可、bob 側・削除は拒否
  const ok = gradePolicy(q1, q1.model, env1);
  assert.equal(ok.cases.find((c) => c.label.includes('alice が自分の users/alice/report.pdf')).got, 'allow');
  assert.equal(ok.cases.find((c) => c.label.includes('alice が bob の')).got, 'implicit-deny');
  assert.equal(ok.cases.find((c) => c.label.includes('削除')).got, 'implicit-deny');
  // AC-06: Resource * や s3:* の過剰な許可はクリアにしない(セキュリティ警告)
  for (const wide of ['{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:*","Resource":"*"}]}', '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::my-bucket/*"}]}']) {
    const r = gradePolicy(q1, wide, env1);
    assert.equal(r.status, 'security');
    assert.ok(r.cases.some((c) => c.overGrant));
  }
  // AC-07: ロールのセッションに ${aws:username} は無いので、無条件に正解扱いしない
  const abac = labById.get('iam-abac-005');
  const roleWithUsername = gradePolicy(abac, abac.editor.starter, iamEnv(abac));
  assert.notEqual(roleWithUsername.status, 'pass');
  assert.ok(roleWithUsername.cases.filter((c) => c.expect === 'allow').every((c) => c.got === 'implicit-deny'));
  // Version を省略すると変数は文字どおり(どれにも一致しない)
  assert.notEqual(gradePolicy(q1, '{"Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*"}]}', env1).status, 'pass');
  // 対応外の条件キー・演算子は deny ではなく unsupported(成功もでっちあげない)
  const unsup = gradePolicy(q1, '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*","Condition":{"StringEquals":{"aws:ViaAWSService":"false"}}}]}', env1);
  assert.equal(unsup.status, 'unsupported');
  assert.ok(unsup.cases.every((c) => c.got !== 'implicit-deny' || c.expect === 'deny'));
  const pol = (st) => [{kind: 'identity', name: 'p', doc: {Version: '2012-10-17', Statement: st}}];
  const alice = {kind: 'iam-user', name: 'alice', account: '111122223333'};
  // 明示的な Deny は Allow より優先・否定の演算子はキーが無いと true(公式の評価論理)
  assert.equal(evaluate({principal: alice, action: 's3:DeleteObject', resource: 'arn:aws:s3:::b/k'}, pol([{Effect: 'Allow', Action: 's3:*', Resource: '*'}, {Effect: 'Deny', Action: 's3:DeleteObject', Resource: '*', Condition: {StringNotEquals: {'aws:PrincipalTag/role': 'admin'}}}])).decision, 'explicit-deny');
  assert.equal(evaluate({principal: alice, action: 's3:GetObject', resource: 'arn:aws:s3:::b/k', context: {'aws:SourceIp': '2001:db8::1'}}, pol([{Effect: 'Allow', Action: 's3:*', Resource: '*', Condition: {IpAddress: {'aws:SourceIp': '2001:db8::/32'}}}])).decision, 'unsupported');

  // AC-08: CLI はオプションの順序・引用符・= の書き方の違いを許容し、未対応は安全に拒否
  const cq = labById.get('cli-ec2-004');
  for (const line of [
    "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId' --output text",
    'aws --output text ec2 describe-instances --query "Reservations[].Instances[].InstanceId" --filters "Name=instance-state-name,Values=running"',
    "aws ec2 describe-instances --output=text --query='Reservations[].Instances[].InstanceId' --filters Name=instance-state-name,Values=running \\\n  --region ap-northeast-1",
  ]) {
    const s = newSession(cq.editor.env); runCli(s, line);
    assert.equal(gradeGoals(cq, s).status, 'pass', line);
  }
  const s = newSession(cq.editor.env);
  const before = JSON.stringify(s.env);
  for (const line of ['rm -rf /', 'aws s3 ls; cat /etc/passwd', 'aws ec2 describe-instances | grep i-', 'aws iam create-user --user-name x', 'aws ec2 describe-instances $(whoami)', 'aws ec2 describe-instances --endpoint-url https://example.com', 'aws sts get-caller-identity --profile prod']) {
    const r = runCli(s, line);
    assert.notEqual(r.status, 'ok', line);
    assert.equal(r.exit, 252, line);
  }
  assert.equal(JSON.stringify(s.env), before);
  const typo = runCli(s, 'aws ec2 describe-instances --instance-id i-0a1b2c3d4e5f60004');
  assert.match(typo.stderr, /Unknown options: --instance-id/);
  assert.match(typo.hint, /--instance-ids/);
  const denied = runCli(s, 'aws s3 ls s3://my-bucket/');
  assert.equal(denied.code, 'AccessDenied');
  assert.match(denied.stderr, /is not authorized to perform: s3:ListBucket/);
  // AC-09: API はメソッド・本文・認可を評価して模擬レスポンスを返す
  const aq = labById.get('api-validate-004');
  const send = (req) => sendRequest(newApiSession(aq.editor.env), req).response?.status;
  const url = 'https://a1b2c3d4e5.execute-api.ap-northeast-1.amazonaws.com/prod/orders';
  const good = {method: 'POST', url, headers: 'Authorization: Bearer eyJ.alice.valid\nContent-Type: application/json', body: '{"productId":"item-3","quantity":2}'};
  assert.equal(send(good), 201);
  assert.equal(send({...good, method: 'PUT'}), 403);
  assert.equal(send({...good, headers: 'Content-Type: application/json'}), 401);
  assert.equal(send({...good, headers: 'Authorization: Bearer eyJ.alice.expired\nContent-Type: application/json'}), 401);
  assert.equal(send({...good, body: '{"productId":"item-3","quantity":0}'}), 400);
  assert.equal(send({...good, body: '{"productId":"item-3",'}), 400);
  // 本物の認証情報らしい文字列は処理しない
  assert.equal(looksLikeSecret('Authorization: AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20261108/us-east-1/s3/aws4_request'), true);
  assert.equal(looksLikeSecret('aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'), true);
  assert.equal(looksLikeSecret('Credential=SIMULATED-alice/20261108/ap-northeast-1/s3/aws4_request, SignedHeaders=host;x-amz-date, Signature=simulated-not-a-real-signature'), false);
  assert.equal(sendRequest(newApiSession(aq.editor.env), {...good, headers: good.headers + '\nX-Debug: AKIAIOSFODNN7EXAMPLE'}).status, 'secret');

  // Phase 2: 信頼ポリシー(Service / Federated)・KMS のキーポリシー・SCP の例外
  const trust = (pr) => [{kind: 'trust', name: 't', account: '111122223333', doc: {Version: '2012-10-17', Statement: [{Effect: 'Allow', Principal: pr, Action: ['sts:AssumeRole', 'sts:AssumeRoleWithWebIdentity']}]}}];
  const roleArn = 'arn:aws:iam::111122223333:role/r';
  assert.equal(evaluate({principal: {kind: 'service', service: 'lambda.amazonaws.com'}, action: 'sts:AssumeRole', resource: roleArn, resourceAccount: '111122223333'}, trust({Service: 'lambda.amazonaws.com'})).decision, 'allow');
  assert.equal(evaluate({principal: {kind: 'service', service: 'ec2.amazonaws.com'}, action: 'sts:AssumeRole', resource: roleArn, resourceAccount: '111122223333'}, trust({Service: 'lambda.amazonaws.com'})).decision, 'implicit-deny');
  const key = (st) => ({kind: 'key', name: 'k', account: '111122223333', doc: {Version: '2012-10-17', Statement: st}});
  const kmsAdmin = {kind: 'identity', name: 'i', to: ['user:alice'], doc: {Version: '2012-10-17', Statement: [{Effect: 'Allow', Action: 'kms:*', Resource: '*'}]}};
  const kreq = {principal: alice, action: 'kms:Decrypt', resource: 'arn:aws:kms:ap-northeast-1:111122223333:key/k1', resourceAccount: '111122223333'};
  // キーポリシーがルートに委任していなければ、IAM ポリシーだけでは使えない
  assert.equal(evaluate(kreq, [kmsAdmin, key([{Effect: 'Allow', Principal: {AWS: 'arn:aws:iam::111122223333:role/App'}, Action: 'kms:Decrypt', Resource: '*'}])]).decision, 'implicit-deny');
  assert.equal(evaluate(kreq, [kmsAdmin, key([{Effect: 'Allow', Principal: {AWS: 'arn:aws:iam::111122223333:root'}, Action: 'kms:*', Resource: '*'}])]).decision, 'allow');
  assert.equal(evaluate(kreq, [key([{Effect: 'Allow', Principal: {AWS: 'arn:aws:iam::111122223333:root'}, Action: 'kms:*', Resource: '*'}])]).decision, 'implicit-deny');

  // Phase 2: YAML と CloudFormation(参照・依存の順序・循環・条件・未解決の参照・行番号)
  const y = parseYaml('a: !Ref B\nb:\n  - !GetAtt C.Arn\n  - - x\n    - y\nc: |\n  line1\n  line2\n');
  assert.deepEqual(y.value, {a: {Ref: 'B'}, b: [{'Fn::GetAtt': ['C', 'Arn']}, ['x', 'y']], c: 'line1\nline2\n'});
  const tpl = 'Resources:\n  B:\n    Type: AWS::S3::Bucket\n  R:\n    Type: AWS::IAM::Role\n    Properties:\n      AssumeRolePolicyDocument: {}\n  F:\n    Type: AWS::Lambda::Function\n    Properties:\n      Role: !GetAtt R.Arn\n      Code: {ZipFile: x}\n      Environment: {Variables: {B: !Ref B}}\n';
  const dep = deployTemplate(tpl, {stackName: 's'});
  assert.equal(dep.ok, true);
  assert.ok(dep.order.indexOf('F') > dep.order.indexOf('R') && dep.order.indexOf('F') > dep.order.indexOf('B'));
  assert.match(dep.resources.F.props.Role, /^arn:aws:iam::111122223333:role\//);
  const cyc = deployTemplate('Resources:\n  A:\n    Type: AWS::SQS::Queue\n    DependsOn: B\n  B:\n    Type: AWS::SQS::Queue\n    DependsOn: A\n');
  assert.match(cyc.errors[0].msg, /Circular dependency/);
  const typoT = deployTemplate('Resources:\n  B:\n    Type: AWS::S3::Bucket\n    Properties:\n      VersioningConfig: {Status: Enabled}\n');
  assert.equal(typoT.errors[0].line, 5);
  assert.match(typoT.errors[0].msg, /extraneous key \[VersioningConfig\]/);
  assert.match(deployTemplate('Resources:\n  P:\n    Type: AWS::S3::BucketPolicy\n    Properties:\n      Bucket: !Ref Nope\n      PolicyDocument: {}\n').errors[0].msg, /Unresolved resource dependencies \[Nope\]/);
  const unsT = deployTemplate('Resources:\n  X:\n    Type: AWS::Foo::Bar\n');
  assert.ok(unsT.unsupported.length && !unsT.errors.length);
  const condT = 'Parameters:\n  Env: {Type: String, Default: dev}\nConditions:\n  P: !Equals [!Ref Env, prod]\nResources:\n  Q:\n    Type: AWS::SQS::Queue\n    Condition: P\n  R:\n    Type: AWS::SQS::Queue\n    Properties:\n      VisibilityTimeout: !If [P, 300, 30]\n';
  assert.deepEqual(deployTemplate(condT).order, ['R']);
  assert.equal(deployTemplate(condT, {params: {Env: 'prod'}}).resources.R.props.VisibilityTimeout, 300);
  // Phase 2: EventBridge のパターン(AND / OR・numeric・値は配列)
  const pat = {source: ['app.orders'], detail: {total: [{numeric: ['>=', 10000]}]}};
  assert.equal(matchPattern(pat, {source: 'app.orders', detail: {total: 25000}}), true);
  assert.equal(matchPattern(pat, {source: 'app.orders', detail: {total: '25000'}}), false);
  assert.equal(matchPattern(pat, {source: 'other', detail: {total: 25000}}), false);
  assert.throws(() => validatePattern({source: 'app.orders'}), /must be an object or an array/);
  // Phase 2: CLI・API の追加の操作
  const vq = labById.get('cli-sts-012');
  const vs = newSession(vq.editor.env);
  assert.equal(runCli(vs, 'aws sts assume-role --role-arn arn:aws:iam::111122223333:role/VendorAccess --role-session-name vendor').code, 'AccessDenied');
  assert.equal(runCli(vs, 'aws sts assume-role --role-arn arn:aws:iam::111122223333:role/VendorAccess --role-session-name vendor --external-id vx-2026-0042 --duration-seconds 7200').code, 'ValidationError');
  assert.equal(runCli(vs, 'aws dynamodb put-item --table-name Orders --item \'{"orderId": {"S": "o-1001"}}\' --condition-expression "attribute_not_exists(orderId)"').code, 'ConditionalCheckFailedException');
  assert.equal(runCli(vs, 'aws cloudformation validate-template --template-body template.yaml').code, 'ValidationError');
  assert.match(runCli(vs, 'aws kms describe-key --key-id alias/app-data --query KeyMetadata.KeyId --output text').stdout, /^1234abcd-/);
  const eq = labById.get('api-events-015');
  const es = newApiSession(eq.editor.env);
  const evr = sendRequest(es, {...eq.model, body: JSON.stringify({Entries: [{Source: 'app.orders', DetailType: 'OrderPlaced', Detail: {total: 1}}]})});
  assert.equal(evr.response.data.FailedEntryCount, 1);
  assert.equal(evr.response.data.Entries[0].ErrorCode, 'MalformedDetail');
});

test('command lab browser: routes, grading, persistence, account sync, mobile, no AWS traffic', {timeout: 120000}, async () => {
  const {chromium} = require('playwright');
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/aws-architecture-academy\//, '/');
      const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      const mime = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png'};
      const body = await readFile(file);
      res.writeHead(200, {'Content-Type': mime[extname(file)] || 'text/plain'}); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/aws-architecture-academy/`;
  const origin = 'https://academy-test.supabase.co';
  const id = '00000000-0000-4000-8000-000000000001';
  const rows = new Map(), errors = [], awsCalls = [];
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  const eventually = async (fn) => { for (let i = 0; i < 120; i++) { if (await fn()) return; await new Promise((r) => setTimeout(r, 50)); } assert.fail('Expected condition was not reached'); };
  async function device(viewport, configured) {
    const context = await browser.newContext({viewport, serviceWorkers: 'block'});
    await context.route('**/config.js', (route) => route.fulfill({contentType: 'text/javascript', body: `window.ACADEMY_CONFIG={enabled:${configured},supabaseUrl:'${origin}',supabasePublishableKey:'sb_publishable_test'};`}));
    await context.route(/amazonaws\.com/, (route) => { awsCalls.push(route.request().url()); route.abort(); });
    await context.route(origin + '/**', async (route) => {
      const req = route.request(), u = new URL(req.url()), body = req.postDataJSON();
      const json = (data, status = 200) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify(data)});
      const now = Math.floor(Date.now() / 1000);
      const token = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url') + '.' + Buffer.from(JSON.stringify({sub: id, aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now, session_id: id})).toString('base64url') + '.test';
      if (u.pathname === '/auth/v1/token') return json({access_token: token, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, user: {id, email: 'alice@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {provider: 'email'}, user_metadata: {}, created_at: new Date().toISOString()}});
      if (u.pathname === '/auth/v1/user') return json({id, email: 'alice@example.test'});
      if (u.pathname === '/auth/v1/logout') return json({});
      if (u.pathname === '/rest/v1/academy_accounts') return json(rows.has(id) ? [rows.get(id)] : []);
      if (u.pathname === '/rest/v1/rpc/save_academy_state') {
        const old = rows.get(id);
        if ((old?.revision || 0) !== body.p_expected_revision) return json({code: 'PT409', message: 'conflict'}, 409);
        const row = {user_id: id, data: body.p_data, revision: (old?.revision || 0) + 1}; rows.set(id, row); return json([row]);
      }
      return json({message: 'unknown'}, 404);
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => Number(document.getElementById('svc-total')?.textContent) > 0);
    return {page, context};
  }
  async function login(page) {
    await page.locator('[data-account="login"]').click();
    await page.locator('#accountForm input[name="email"]').fill('alice@example.test');
    await page.locator('#accountForm input[name="password"]').fill('test-password-123');
    await page.locator('#accountForm button[type="submit"]').click();
    await eventually(async () => (await page.locator('.account-email').textContent()) === 'alice@example.test');
  }
  const MODEL = '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::my-bucket/users/${aws:username}/*"}]}';
  try {
    // ゲスト: 一覧 → 問題 → 採点 → 再読み込みでも下書き・進捗が残る(AC-01・AC-10)
    const g = await device({width: 1440, height: 950}, false);
    await g.page.evaluate(() => { location.hash = 'command-lab'; });
    await eventually(async () => (await g.page.locator('.cl-card').count()) === 80);
    await g.page.locator('.cl-card[href="#command-lab/iam-s3-001"]').click();
    await g.page.locator('.cl-ta').waitFor();
    await g.page.locator('.cl-ta').fill('{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:*","Resource":"*"}]}');
    await g.page.locator('.cl-ta').press('Control+Enter'); // キーボードで実行(AC-11)
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'セキュリティ警告');
    await g.page.locator('.cl-ta').fill(MODEL);
    await g.page.locator('.cl-run').click();
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'テスト成功');
    assert.equal(await g.page.locator('.cl-explain .cl-step').count(), 7);
    await g.page.waitForTimeout(900); // 下書きの保存(遅延書き込み)を待つ
    await g.page.reload();
    await g.page.locator('.cl-ta').waitFor();
    assert.equal(await g.page.locator('.cl-ta').inputValue(), MODEL);
    assert.match(await g.page.locator('.cl-stats').textContent(), /クリア済み/);
    await g.page.goBack();
    await eventually(async () => (await g.page.evaluate(() => location.hash)) === '#command-lab');
    await g.page.locator('.cl-card').first().waitFor();
    assert.match(await g.page.locator('.cl-card[href="#command-lab/iam-s3-001"] .bd-st').textContent(), /クリア/);
    await g.page.evaluate(() => { location.hash = 'home'; });
    assert.equal(await g.page.locator('#lab-solved').textContent(), '1 / 80');
    // Phase 2: ロードマップ・分野別の成績、CloudFormation の模擬デプロイ、行の印、図鑑からの関連演習
    await g.page.evaluate(() => { location.hash = 'command-lab'; });
    await g.page.locator('.cl-roadmap .cl-rm-step').first().waitFor();
    assert.equal(await g.page.locator('.cl-rm-step').count(), 10);
    assert.match(await g.page.locator('.cl-rm-step').first().textContent(), /1 \/ 5/);
    await g.page.locator('.cl-stats-panel summary').click();
    assert.match(await g.page.locator('.cl-stats-panel').innerText(), /CloudFormation/);
    await g.page.evaluate(() => { location.hash = 'command-lab/cfn-sg-003'; });
    await g.page.locator('.cl-ta').waitFor();
    await g.page.locator('.cl-run').click();
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'セキュリティ警告');
    await g.page.locator('.cl-ta').fill('Resources:\n  WebSg:\n    Type: AWS::EC2::SecurityGroup\n    Properties:\n      Description: x\n');
    await g.page.locator('.cl-run').click();
    assert.equal(await g.page.locator('.cl-gut span.err').count() >= 1, true);
    const {CFN_QUESTIONS} = await load('data/command-lab/questions-cfn.js');
    await g.page.locator('.cl-ta').fill(CFN_QUESTIONS.find((q) => q.id === 'cfn-sg-003').model);
    await g.page.locator('.cl-run').click();
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'テスト成功');
    assert.match(await g.page.locator('.cl-order').first().innerText(), /WebSg/);
    assert.equal(await g.page.locator('a.cl-next').count(), 1);
    await g.page.evaluate(() => { location.hash = 'command-lab/iam-s3-004'; });
    await g.page.locator('.cl-ta').fill('{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::my-bucket/*"},{"Effect":"Allow","Action":"s3:GetObject","Principal":"*","Resource":"*"}]}');
    await g.page.locator('.cl-run').click();
    assert.ok(await g.page.locator('.cl-gut span.err').count() >= 1);
    assert.ok(await g.page.locator('.cl-goto').count() >= 1);
    await g.page.evaluate(() => { location.hash = 'command-lab/cfn-read-012'; });
    await g.page.locator('.cl-sig select').selectOption('1');
    await g.page.locator('.cl-sig button').click();
    assert.match(await g.page.locator('.cl-result').innerText(), /BacklogAlarm/);
    await g.page.evaluate(() => { location.hash = 'services/kms'; });
    await g.page.locator('.ex-lab').first().waitFor();
    assert.ok(await g.page.locator('.ex-lab').count() >= 4);
    // 既存機能の主要画面(AC-02)
    for (const [hash, sel] of [['services', '#services .ex-card'], ['build', '#build .bd-card'], ['practice', '#quiz-start']]) {
      await g.page.evaluate((h) => { location.hash = h; }, hash);
      await g.page.locator(sel).first().waitFor();
    }
    // 不正な問題 ID は一覧へ戻す
    await g.page.evaluate(() => { location.hash = 'command-lab/no-such'; });
    await eventually(async () => (await g.page.evaluate(() => location.hash)) === '#command-lab');
    // CLI・API も画面から実行(AC-08・AC-09)
    await g.page.evaluate(() => { location.hash = 'command-lab/cli-sts-001'; });
    await g.page.locator('.cl-cmd').fill('aws sts get-caller-identity --output text --query Account');
    await g.page.locator('.cl-cmd').press('Enter');
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'テスト成功');
    await g.page.locator('.cl-cmd').fill('aws s3 ls | grep secret');
    await g.page.locator('.cl-cmd').press('Enter');
    assert.match(await g.page.locator('.cl-out').innerText(), /シェルの記号/);
    await g.page.evaluate(() => { location.hash = 'command-lab/api-get-001'; });
    await g.page.locator('.cl-url').fill('https://a1b2c3d4e5.execute-api.ap-northeast-1.amazonaws.com/prod/items/item-2');
    await g.page.locator('.cl-run').click();
    assert.equal(await g.page.locator('.cl-statusline').textContent(), 'HTTP/1.1 200 OK');
    assert.equal(await g.page.locator('.cl-status strong').textContent(), 'テスト成功');
    // 入力はテキストとして表示し、HTML として解釈しない
    await g.page.evaluate(() => { location.hash = 'command-lab/cli-s3ls-002'; });
    await g.page.locator('.cl-cmd').fill('aws s3 ls s3://<img src=x onerror=alert(1)>/');
    await g.page.locator('.cl-cmd').press('Enter');
    assert.equal(await g.page.locator('.cl-out img').count(), 0);
    // スマホ: 問題 / エディター / 結果 のタブと下部の実行ボタン(AC-11)
    await g.page.setViewportSize({width: 390, height: 844});
    await g.page.evaluate(() => { location.hash = 'command-lab/iam-s3-003'; });
    await g.page.locator('.cl-tabs').waitFor();
    assert.equal(await g.page.locator('.cl-work').isVisible(), false);
    await g.page.locator('.cl-tab', {hasText: 'エディター'}).click();
    assert.equal(await g.page.locator('.cl-work').isVisible(), true);
    await g.page.locator('.cl-mbar .primary').click();
    assert.equal(await g.page.locator('.cl-result').isVisible(), true);
    assert.equal(await g.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    // ログインした端末で解くと、学習記録がアカウントに同期され、別の端末にも反映される(AC-10)
    const a = await device({width: 1440, height: 950}, true);
    await login(a.page);
    await a.page.evaluate(() => { location.hash = 'command-lab/iam-s3-002'; });
    await a.page.locator('.cl-choice input').first().check();
    await a.page.locator('.cl-run').click();
    assert.equal(await a.page.locator('.cl-status strong').textContent(), '正解');
    await eventually(() => rows.get(id)?.data.records['aaa.commandLab.progress.v1']?.items?.['iam-s3-002']?.cleared === true);
    const b = await device({width: 1440, height: 950}, true);
    await login(b.page);
    await b.page.evaluate(() => { location.hash = 'home'; });
    await eventually(async () => (await b.page.locator('#lab-solved').textContent()) === '1 / 80');
    assert.equal(await b.page.evaluate(() => window.AcademyAccount.isLearningKey('aaa.commandLab.progress.v1') && window.AcademyAccount.isLearningKey('aaa.commandLab.drafts.v1')), true);
    // 壊れた学習記録は読み飛ばし、画面は動き続ける
    await g.page.evaluate(() => localStorage.setItem('aaa.commandLab.progress.v1', JSON.stringify({schemaVersion: 1, items: {'iam-s3-001': {attempts: 'x', cleared: 'yes'}, 'bogus': {cleared: true}}})));
    await g.page.reload();
    await g.page.evaluate(() => { location.hash = 'command-lab'; });
    await eventually(async () => (await g.page.locator('.cl-card').count()) === 80);
    // シミュレーションは AWS の実環境へ通信しない(AC-12)
    assert.deepEqual(awsCalls, []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise((r) => server.close(r)); }
});
