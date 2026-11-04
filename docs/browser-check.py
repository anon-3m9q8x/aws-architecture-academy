from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
qs=json.loads((root/'data/questions.js').read_text().split(' = ',1)[1].rstrip(';\n'))
assert len(qs)==40 and len({q['id'] for q in qs})==40
assert sum(q['selectCount']>1 for q in qs)==8
for q in qs:
 assert len(q['choices'])==(5 if q['selectCount']>1 else 4)
 assert sum(c['correct'] for c in q['choices'])==q['selectCount']
 assert all(c['explanation'] for c in q['choices'])
by_prompt={q['prompt']:q for q in qs}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3300');page.wait_for_selector('#scene-count:text-is("3")',state='attached')
 assert page.locator('#service-count').inner_text()=='40'
 page.locator('[data-page=services]').click();assert page.locator('#catalog article').count()==42
 page.locator('#search').fill('Fargate');assert page.locator('#catalog article').count()==2
 page.locator('#search').fill('');page.locator('#category').select_option(label='アプリ統合');assert page.locator('#catalog article').count()==4
 page.locator('[data-page=practice]').click();page.locator('#quiz-cert').select_option('CLF');assert '13 問' in page.locator('#pool-count').inner_text()
 page.locator('#quiz-cert').select_option('all');page.locator('#quiz-limit').select_option('5');page.locator('#quiz-start').click()
 q=by_prompt[page.locator('#quiz-prompt').inner_text()];wrong=[i for i,c in enumerate(q['choices']) if not c['correct']][:q['selectCount']]
 for i in wrong:page.locator('#quiz-choices input').nth(i).check()
 page.locator('#quiz-submit').click();assert page.locator('#quiz-feedback .feedback-wrong').count()==1
 assert page.locator('#attempt-count').inner_text()=='1'
 page.locator('#quiz-exit').click();page.locator('#quiz-mode').select_option('wrong');assert '1 問' in page.locator('#pool-count').inner_text()
 page.locator('#quiz-start').click();q=by_prompt[page.locator('#quiz-prompt').inner_text()]
 for i,c in enumerate(q['choices']):
  if c['correct']:page.locator('#quiz-choices input').nth(i).check()
 page.locator('#quiz-submit').click();assert page.locator('#quiz-feedback .feedback-correct').count()==1
 page.locator('#quiz-next').click();assert page.locator('#quiz-result').is_visible()
 page.get_by_role('button',name='設定に戻って学習を続ける').click();assert '0 問' in page.locator('#pool-count').inner_text();assert page.locator('#quiz-start').is_disabled()
 page.locator('#quiz-mode').select_option('all');page.locator('#quiz-limit').select_option('40');page.locator('#quiz-start').click()
 seen=set()
 for _ in range(40):
  q=by_prompt[page.locator('#quiz-prompt').inner_text()];seen.add(q['id']);assert page.locator('#quiz-submit').is_disabled()
  for i,c in enumerate(q['choices']):
   if c['correct']:page.locator('#quiz-choices input').nth(i).check()
  # Theme must preserve selections and the current question.
  page.locator('#theme-toggle').click();assert page.locator('#quiz-choices input:checked').count()==q['selectCount']
  page.locator('#quiz-submit').click();assert page.locator('#quiz-feedback .feedback-correct').count()==1
  assert page.locator('#quiz-feedback .explanation').count()==len(q['choices'])
  page.locator('#quiz-next').click()
 assert len(seen)==40 and '40 / 40' in page.locator('#quiz-result').inner_text()
 assert page.locator('#attempt-count').inner_text()=='42'
 page.reload();page.wait_for_selector('#scene-count:text-is("3")',state='attached');assert page.locator('#attempt-count').inner_text()=='42';assert page.locator('#mistake-count').inner_text()=='0'
 page.locator('[data-page=progress]').click();assert '40 / 40 問に回答' in page.locator('#practice-history').inner_text()
 page.locator('[data-page=animation]').click();page.locator('#next').click();assert 'STEP 2' in page.locator('#step-number').inner_text();page.locator('#theme-toggle').click();assert 'STEP 2' in page.locator('#step-number').inner_text()
 for width in [375,768,1440]:
  page.set_viewport_size({'width':width,'height':950})
  for theme in ['dark','light']:
   if page.locator('html').get_attribute('data-theme')!=theme:page.locator('#theme-toggle').click()
   for route in ['home','services','practice','animation','roadmap','progress']:
    page.goto('http://127.0.0.1:3300/#'+route)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,theme,route)
   page.goto('http://127.0.0.1:3300/#home');page.screenshot(path=str(root/f'docs/learning-{width}-{theme}.png'),full_page=True)
 page.locator('[data-page=practice]').click();page.locator('#quiz-start').click()
 page.set_viewport_size({'width':375,'height':812});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(root/'docs/learning-practice-mobile.png'),full_page=True)
 page.locator('#theme-system').click();page.emulate_media(color_scheme='dark');page.wait_for_function("document.documentElement.dataset.theme==='dark'");page.emulate_media(color_scheme='light');page.wait_for_function("document.documentElement.dataset.theme==='light'")
 assert not errors,errors
 browser.close()
print('PASS: 40 questions / 8 multi-select / all explanations, 42 catalog entries, filtering, wrong-answer review, exact grading, 40/40 full session, 42 attempts persisted, theme toggle preserves answers and player step, 375/768/1440px in both themes for 6 routes, OS following, zero JS errors.')
