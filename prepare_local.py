# © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。
"""在新电脑上安装本地依赖及公开模型；仅准备阶段需要联网。"""
from pathlib import Path
import subprocess
import sys
import venv

base = Path(__file__).resolve().parent
environment = base / '.model-venv'
python = environment / ('Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if not python.exists():
    venv.create(environment, with_pip=True)
subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(base / 'requirements-local.txt')], check=True)
code = '''from huggingface_hub import snapshot_download
snapshot_download('BAAI/bge-small-zh-v1.5',local_dir='models/bge-small-zh-v1.5',allow_patterns=['config.json','tokenizer*','special_tokens_map.json','vocab.txt','model.safetensors','README.md','LICENSE'])
'''
subprocess.run([str(python), '-c', code], cwd=base, check=True)
subprocess.run([str(python), str(base / 'build_local.py')], check=True)
print('准备完成。Mac 可双击“启动本地模型.command”。')
