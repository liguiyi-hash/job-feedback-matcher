# © 2026 贵毅_TUFE. 自有代码保留所有权利，见 LICENSE。
"""检测清单中记录的文件是否被修改；不提供密码学身份认证。"""
from pathlib import Path
import hashlib, json
IGNORE={'.git','.model-venv','node_modules','__pycache__','models'}
def entries(base):
    result={}
    for p in sorted(base.rglob('*')):
        rel=p.relative_to(base)
        if not p.is_file() or any(x in IGNORE for x in rel.parts) or p.name in ['integrity-manifest.json','.DS_Store'] or p.suffix=='.pyc':continue
        result[rel.as_posix()]=hashlib.sha256(p.read_bytes()).hexdigest()
    return result
def verify(base):
    m=json.loads((base/'integrity-manifest.json').read_text())
    actual=entries(base)
    changed=[n for n,v in m['files'].items() if actual.get(n)!=v]
    extra=sorted(set(actual)-set(m['files']))
    if changed or extra:raise SystemExit('校验未通过。变动/缺失：'+str(changed)+'；额外文件：'+str(extra))
    print('校验通过；署名：'+m['attribution']+'；版本：'+m['version'])
if __name__=='__main__':verify(Path(__file__).resolve().parent)

