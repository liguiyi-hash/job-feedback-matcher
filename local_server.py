# © 2026 贵毅_TUFE · 来源：https://github.com/liguiyi-hash/job-feedback-matcher · 自有代码保留所有权利，见LICENSE。
"""本机 BGE 语义排序服务。推理仅使用本地文件；不调用云端 API。"""
import json
import os
import secrets
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
BASE = Path(__file__).resolve().parent
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()
CACHE = {}
tokenizer = model = None


def encode(texts):
    global tokenizer, model
    import torch
    from transformers import AutoModel, AutoTokenizer
    if model is None:
        path = BASE / 'models/bge-small-zh-v1.5'
        tokenizer = AutoTokenizer.from_pretrained(path, local_files_only=True, trust_remote_code=False)
        model = AutoModel.from_pretrained(path, local_files_only=True, trust_remote_code=False,
                                          use_safetensors=True).eval()
        torch.set_num_threads(min(4, os.cpu_count() or 1))
    missing = list(dict.fromkeys(t for t in texts if t not in CACHE))
    for start in range(0, len(missing), 32):
        batch = missing[start:start + 32]
        data = tokenizer(batch, padding=True, truncation=True, max_length=512, return_tensors='pt')
        with torch.inference_mode():
            vectors = torch.nn.functional.normalize(model(**data).last_hidden_state[:, 0], p=2, dim=1)
        CACHE.update(zip(batch, vectors))
    return torch.stack([CACHE[t] for t in texts])


def score(basis, options):
    # 只接受岗位文本，不需要候选人身份、学历、年龄或联系方式。
    documents = ['岗位：' + o['job'] + '；部门：' + o['department'] + '；业务：' + o['business'] for o in options]
    query = '为这个句子生成表示以用于检索相关文章：' + basis
    with LOCK:
        vectors = encode([query] + documents)
        return (vectors[1:] @ vectors[0]).tolist()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # 不把候选人文本写入访问日志。

    def send(self, status, payload, kind='application/json; charset=utf-8'):
        data = payload.encode() if isinstance(payload, str) else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)

    def host_ok(self):
        return self.headers.get('Host') == f'127.0.0.1:{self.server.server_port}'

    def do_GET(self):
        if not self.host_ok() or self.path != '/':
            return self.send(404, {'error': '路径不存在'})
        page = (BASE / '本地模型匹配.html').read_text().replace('__SESSION_TOKEN__', TOKEN)
        self.send(200, page, 'text/html; charset=utf-8')

    def do_POST(self):
        origin = f'http://127.0.0.1:{self.server.server_port}'
        if not self.host_ok() or self.headers.get('Origin') != origin or self.headers.get('X-Session-Token') != TOKEN:
            return self.send(403, {'error': '仅接受本机页面请求'})
        if self.path != '/api/score':
            return self.send(404, {'error': '路径不存在'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 262144:
                raise ValueError('请求大小不合法')
            data = json.loads(self.rfile.read(size))
            basis, options = data.get('basis'), data.get('options')
            if not isinstance(basis, str) or not 0 < len(basis) <= 4000:
                raise ValueError('匹配依据过长或为空')
            if not isinstance(options, list) or not 1 <= len(options) <= 200:
                raise ValueError('单人反馈数量应在 1 至 200 条之间')
            for option in options:
                if not isinstance(option, dict) or any(not isinstance(option.get(k), str) or len(option[k]) > 4000 for k in ('job', 'department', 'business')):
                    raise ValueError('反馈字段不合法')
            self.send(200, {'scores': score(basis, options), 'model': 'BAAI/bge-small-zh-v1.5'})
        except (ValueError, TypeError, KeyError) as error:
            self.send(400, {'error': str(error)})
        except Exception:
            self.send(500, {'error': '本地模型加载或推理失败，请检查模型文件和依赖是否完整；结果未生成。'})


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    address = f'http://127.0.0.1:{server.server_port}'
    print(f'本地模型匹配助手：{address}\n保持此窗口打开；按 Ctrl+C 停止。', flush=True)
    if '--no-browser' not in os.sys.argv:
        webbrowser.open(address)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
