from pathlib import Path
import json,subprocess,tempfile
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {notebook} from './data/notebook.js';console.log(JSON.stringify(notebook))"],cwd=root,text=True));ids={s['id'] for s in data['services']};assert len(ids)==107;assert len(data['edges'])==269;assert len(data['comparisons'])==67
for e in data['edges']:assert e['from'] in ids and e['to'] in ids
scenes=json.loads((root/'data/scenes.json').read_text())['scenes'];assert len(scenes)==13 and len({s['id'] for s in scenes})==13
for s in scenes:
 nodeids={n['id'] for n in s['graph']['nodes']}
 assert all(e['from'] in nodeids and e['to'] in nodeids for e in s['graph']['edges'])
 assert all(t['source'] in nodeids and (not t.get('target') or t['target'] in nodeids) and all(v in nodeids for v in t.get('via',[])) for t in s['steps'])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1500,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:3300/#notebook/ec2')
 assert '107 / 107' in page.locator('#notebook-count').inner_text();assert page.locator('#notebook-detail h2').first.inner_text()=='EC2'
 page.locator('#service-memo').fill('私のテストメモ <img src=x onerror=alert(1)>');page.locator('.favorite-toggle').click();page.locator('#note-complete').click();page.locator('#theme-toggle').click();assert '<img src=x' in page.locator('#service-memo').input_value()
 page.reload();assert '私のテストメモ' in page.locator('#service-memo').input_value();assert page.locator('.favorite-toggle').get_attribute('aria-pressed')=='true';assert page.locator('#note-complete').get_attribute('aria-pressed')=='true';assert page.locator('#notebook-detail img').count()==0
 with page.expect_download() as dl:page.locator('#notebook-export').click()
 download=dl.value;export=json.loads(Path(download.path()).read_text());assert export['notes']['ec2'].startswith('私のテストメモ')
 page.locator('#notebook-import').set_input_files({'name':'notes.json','mimeType':'application/json','buffer':json.dumps({'schemaVersion':1,'notes':{'ec2':'追加メモ','s3':'S3メモ','unknown':'no'},'favorites':['s3','invalid'],'completed':['s3']}).encode()});page.wait_for_function("document.getElementById('notebook-import-status').textContent.includes('取り込みました')")
 assert '追加メモ' in page.locator('#service-memo').input_value() and '私のテストメモ' in page.locator('#service-memo').input_value()
 page.locator('#notebook-import').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'not json'});page.wait_for_function("document.getElementById('notebook-import-status').textContent.includes('取り込めませんでした')")
 page.locator('[data-page=favorites]').click();assert page.locator('#favorites-list article').count()==2
 page.locator('[data-page=home]').click();assert '2 / 107' in page.locator('#notes-fraction').inner_text();assert page.locator('#favorite-count').inner_text()=='2';assert '0 回答' in page.locator('#weekly-summary').inner_text()
 page.locator('#global-search').fill('DynamoDB');page.locator('#global-search').press('Enter');assert '#notebook' in page.url;assert page.locator('#notebook-list a').count()>0;assert page.locator('#notebook-list a').count()<107
 page.goto('http://127.0.0.1:3300/#notebook/sqs');assert page.locator('.comparison-note').count()>0
 page.locator('[data-page=connections]').click();page.locator('#connection-from').select_option('s3');page.locator('#connection-to').select_option('lambda');page.locator('#connection-find').click();assert page.locator('.connection-path li').count()>=1
 page.locator('#connection-to').select_option('s3');page.locator('#connection-find').click();assert '異なる2つ' in page.locator('#connection-result').inner_text()
 page.goto('http://127.0.0.1:3300/#notebook/not-existing');assert '見つかりません' in page.locator('#notebook-detail').inner_text()
 page.locator('[data-page=animation]').click();page.wait_for_selector('#player:not([hidden])');assert page.locator('#scene-select option').count()==13
 for scene in scenes:
  page.locator('#scene-select').select_option(scene['id']);page.locator('#reset').click()
  for i in range(len(scene['steps'])-1):page.locator('#next').click()
  assert page.locator('#complete').is_enabled();page.locator('#previous').click();assert page.locator('#complete').is_disabled()
 for width in [375,768,1500]:
  page.set_viewport_size({'width':width,'height':950})
  for theme in ['light','dark']:
   if page.locator('html').get_attribute('data-theme')!=theme:page.locator('#theme-toggle').click()
   for route in ['home','notebook/ec2','connections','favorites','practice','animation']:
    page.goto('http://127.0.0.1:3300/#'+route)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme,route)
   page.goto('http://127.0.0.1:3300/#home');page.screenshot(path=str(root/f'docs/studyhub-{width}-{theme}.png'),full_page=True)
 assert not errors,errors
 b.close()
print('PASS: 107 unique notes,269 valid relations,67 comparisons,13 scene reference integrity; memo/favorites/completion persistence, export/import merge/error handling, literal HTML safety, global search, relationship search, all13 player controls, responsive themes; no JS errors.')
