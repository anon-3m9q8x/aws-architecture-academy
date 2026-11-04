from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];qs=json.loads((root/'data/questions.js').read_text().split(' = ',1)[1].rstrip(';\n'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page()
 page.goto('http://127.0.0.1:3300/#practice');page.locator('#quiz-domain').select_option('セキュリティ');page.locator('#quiz-limit').select_option('40');page.locator('#quiz-start').click()
 checked=False
 while True:
  q=next(q for q in qs if q['prompt']==page.locator('#quiz-prompt').inner_text())
  if q['selectCount']>1:
   good=[i for i,c in enumerate(q['choices']) if c['correct']];bad=next(i for i,c in enumerate(q['choices']) if not c['correct'])
   page.locator('#quiz-choices input').nth(good[0]).check();assert page.locator('#quiz-submit').is_disabled()
   page.locator('#quiz-choices input').nth(good[1]).check();assert page.locator('#quiz-submit').is_enabled()
   page.locator('#quiz-choices input').nth(bad).check();assert page.locator('#quiz-submit').is_disabled()
   page.locator('#quiz-choices input').nth(good[1]).uncheck();assert page.locator('#quiz-submit').is_enabled()
   page.locator('#quiz-submit').click();assert page.locator('.feedback-wrong').is_visible();before=page.locator('#attempt-count').inner_text()
   page.locator('#answer-form').evaluate("form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");assert page.locator('#attempt-count').inner_text()==before
   checked=True;break
  for i,c in enumerate(q['choices']):
   if c['correct']:page.locator('#quiz-choices input').nth(i).check()
  page.locator('#quiz-submit').click();page.locator('#quiz-next').click()
 assert checked
 page.locator('[data-page=animation]').click();page.wait_for_selector('#player:not([hidden])');page.emulate_media(reduced_motion='reduce');page.locator('#reset').click();page.locator('#play').click();assert 'STEP 2' in page.locator('#step-number').inner_text();page.wait_for_timeout(1000);assert 'STEP 2' in page.locator('#step-number').inner_text()
 # Storage blocked must not prevent learning or theme changes.
 other=browser.new_context();blocked=other.new_page();blocked.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})");blocked.goto('http://127.0.0.1:3300/#practice');blocked.locator('#quiz-start').click();blocked.locator('#theme-toggle').click();assert blocked.locator('#storage-warning').is_visible();assert blocked.locator('#quiz-prompt').is_visible()
 browser.close()
print('PASS: partial/extra multiple-choice selections blocked, wrong set rejected, duplicate submit ignored, reduced-motion player, storage-denied fallback.')
