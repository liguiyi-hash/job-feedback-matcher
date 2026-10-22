# © 2026 贵毅_TUFE. 自有代码保留所有权利，见 LICENSE。
"""构建单文件界面及SHA-256文件清单；不包含业务数据。"""
from pathlib import Path
import hashlib, json
from verify_integrity import entries
BASE=Path(__file__).resolve().parent
parts=[('XLSX','vendor/xlsx.full.min.js'),('ENGINE','src/engine.js'),('DATA','src/data.js'),('FINAL_ENGINE','src/final-engine.js'),('LOCAL_APP','src/local-app.js')]
page=(BASE/'src/local.html').read_text()
digest=hashlib.sha256()
for name in ['src/local.html']+[p for _,p in parts]:
    digest.update(name.encode());digest.update((BASE/name).read_bytes())
build_id=digest.hexdigest()
for marker,name in parts:
    code=(BASE/name).read_text().replace('</script','<\\/script')
    if marker=='XLSX': code='/*\n'+(BASE/'vendor/LICENSE-SheetJS.txt').read_text()+'\n*/\n'+code
    page=page.replace('/*__'+marker+'__*/',code)
page=page.replace('__BUILD_ID__',build_id)
(BASE/'本地模型匹配.html').write_text(page)
manifest={'version':'2.0.0+portfolio.1','attribution':'贵毅_TUFE','build_id':build_id,'algorithm':'SHA-256','files':entries(BASE)}
(BASE/'integrity-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('构建完成：2.0.0+portfolio.1；署名：贵毅_TUFE；构建指纹：'+build_id)

