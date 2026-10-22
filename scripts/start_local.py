# © 2026 贵毅_TUFE · 项目来源：https://github.com/liguiyi-hash/job-feedback-matcher
"""从Python3.9以上的系统启动器选择实际可用的Python3.11+。"""
from pathlib import Path
import glob
import os
import shutil
import subprocess
import sys
BASE = Path(__file__).resolve().parents[1]

def candidates():
    override = os.environ.get('MATCHER_PYTHON')
    if override:
        yield override
    yield str(BASE / '.model-venv/bin/python')
    for name in ['python3.12', 'python3.11', 'python3.13', 'python3.14', 'python3']:
        value = shutil.which(name)
        if value:
            yield value
    for pattern in ['/Library/Frameworks/Python.framework/Versions/*/bin/python3',
                    '/opt/homebrew/bin/python3*', '/usr/local/bin/python3*']:
        yield from sorted(glob.glob(pattern))

def choose_python():
    seen = set()
    for value in candidates():
        if value in seen:
            continue
        seen.add(value)
        if not Path(value).is_file() or not os.access(value, os.X_OK):
            continue
        try:
            result = subprocess.run([value, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)'],
                                    capture_output=True, timeout=15)
            if result.returncode == 0:
                return value
        except (OSError, subprocess.TimeoutExpired):
            continue
    return None

def main():
    python = choose_python()
    if not python:
        print('未找到可用的Python 3.11或更高版本。当前系统的python3可能较旧。')
        print('请先安装Python 3.12：https://www.python.org/downloads/')
        print('如已安装，可设置MATCHER_PYTHON为实际解释器路径后重试。')
        return 1
    print('使用解释器：' + python, flush=True)
    if '--check' in sys.argv:
        return 0
    subprocess.run([python, str(BASE / 'verify_integrity.py')], cwd=BASE, check=True)
    env_python = BASE / '.model-venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    ready = env_python.exists() and (BASE / 'models/bge-small-zh-v1.5/model.safetensors').exists()
    if ready:
        ready = subprocess.run([str(env_python), '-c', 'import torch, transformers'],
                               capture_output=True).returncode == 0
    if not ready:
        subprocess.run([python, str(BASE / 'prepare_local.py')], cwd=BASE, check=True)
    return subprocess.call([str(env_python), str(BASE / 'local_server.py')], cwd=BASE)

if __name__ == '__main__':
    raise SystemExit(main())

