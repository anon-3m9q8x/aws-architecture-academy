from pathlib import Path
import json,urllib.request,concurrent.futures,datetime
root=Path(__file__).resolve().parents[1]
qs=json.loads((root/'data/questions.js').read_text().split(' = ',1)[1].rstrip(';\n'))
services=json.loads((root/'data/catalog.js').read_text().split(' = ',1)[1].rstrip(';\n'))
urls=sorted({q['source'] for q in qs}|{s[4] for s in services})
def check(url):
 try:
  with urllib.request.urlopen(url,timeout=20) as r:
   data=r.read().decode('utf-8','replace');return {'url':url,'status':r.status,'finalUrl':r.url,'hasPage':len(data)>500,'textLength':len(data)}
 except Exception as e:return {'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: results=list(ex.map(check,urls))
(root/'docs/SOURCE_CHECK.json').write_text(json.dumps({'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'公式資料URLのHTTP到達確認。教材の専門家レビュー完了を示すものではありません。','results':results},ensure_ascii=False,indent=2))
for r in results:
 if 'error' in r or r['url']!=r['finalUrl']:print(r)
print('sources',len(results),'HTTP200',sum(r.get('status')==200 for r in results))
