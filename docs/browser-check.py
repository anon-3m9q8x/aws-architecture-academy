from playwright.sync_api import sync_playwright
import json
from pathlib import Path
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:3300');page.wait_for_selector('#scene-count:text-is("3")')
 assert page.locator('#featured article').count()==3
 page.screenshot(path='/workspace/aws-architecture-academy/docs/desktop.png',full_page=True)
 page.locator('[data-page=services]').click();assert page.locator('#catalog article').count()==9
 page.locator('#search').fill('ALB');assert page.locator('#catalog article').count()==1
 page.locator('#search').fill('not-existing');assert page.locator('#catalog article').count()==0
 page.locator('#search').fill('');page.locator('#category').select_option(label='データベース');assert page.locator('#catalog article').count()==2
 page.locator('[data-page=animation]').click()
 for id in ['PX-02','HC-01','LB-01']:
  page.locator('#scene-select').select_option(id);page.wait_for_timeout(100)
  page.locator('#reset').click();assert page.locator('#complete').is_disabled()
  page.locator('#speed').select_option('2');page.locator('#play').click()
  page.wait_for_function("document.getElementById('next').disabled",timeout=20000)
  assert page.locator('#play').inner_text()=='再生'
  page.locator('#previous').click();assert page.locator('#complete').is_disabled()
  page.locator('#next').click();page.locator('#complete').click()
 page.locator('#theme').select_option('light');assert page.locator('html').get_attribute('data-theme')=='light'
 page.reload();page.wait_for_selector('#player:not([hidden])',state='attached');assert page.locator('html').get_attribute('data-theme')=='light'
 page.locator('[data-page=progress]').click();assert page.locator('#history li').count()==3
 for theme in ['dark','light']:
  page.locator('#theme').select_option(theme)
  page.set_viewport_size({'width':375,'height':812})
  for route in ['home','services','animation','roadmap','progress']:
   page.goto('http://127.0.0.1:3300/#'+route);page.wait_for_selector('#player:not([hidden])',state='attached')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(theme,route)
  page.goto('http://127.0.0.1:3300/#home');page.wait_for_selector('#scene-count:text-is("3")');page.screenshot(path=f'/workspace/aws-architecture-academy/docs/mobile-{theme}.png',full_page=True)
 page.emulate_media(reduced_motion='reduce');page.goto('http://127.0.0.1:3300/#animation');page.wait_for_selector('#player:not([hidden])',state='attached');page.locator('#reset').click();page.locator('#play').click();assert 'STEP 2 /' in page.locator('#step-number').inner_text();page.wait_for_timeout(1000);assert 'STEP 2 /' in page.locator('#step-number').inner_text()
 # System theme follows OS without resetting the current scene step.
 page.locator('#theme').select_option('system');page.emulate_media(color_scheme='dark');page.wait_for_function("document.documentElement.dataset.theme==='dark'");assert page.locator('html').get_attribute('data-theme')=='dark'
 page.emulate_media(color_scheme='light');page.wait_for_function("document.documentElement.dataset.theme==='light'");assert page.locator('html').get_attribute('data-theme')=='light';assert 'STEP 2 /' in page.locator('#step-number').inner_text()
 assert errors==[],errors
 browser.close()
print('PASS: home, 9 catalog entries, search/filter, 3 scene playback/completion, previous/next, progress persistence, themes/OS following, 375px all routes in both themes, reduced motion; no JS errors.')
