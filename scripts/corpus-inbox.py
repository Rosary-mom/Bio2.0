#!/usr/bin/env python3
"""Home-network inbox. Writes a file only after the human confirm flag."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "memory" / "private" / "inbox"
INBOX.mkdir(parents=True, exist_ok=True)

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, kind="application/json"):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Human-Auth")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/inbox":
            self._send(404, '{"error":"not found"}')
            return
        files = sorted(p.name for p in INBOX.iterdir() if p.is_file())
        self._send(200, json.dumps({"ok": True, "files": files}))

    def do_POST(self):
        if self.headers.get("X-Human-Auth") != "freigegeben":
            self._send(403, '{"error":"human authorization required"}')
            return
        slot = (self.headers.get("X-Slot") or "unsorted").replace("/", "-")
        name = Path(self.headers.get("X-Filename") or "upload.bin").name
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 20_000_000:
            self._send(400, '{"error":"size"}')
            return
        target = INBOX / f"{slot}--{name}"
        target.write_bytes(self.rfile.read(length))
        self._send(200, json.dumps({"ok": True, "path": str(target.relative_to(ROOT))}))

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.address_string(), fmt % args))

def lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()

if __name__ == "__main__":
    print("inbox http://%s:8788/inbox" % lan_ip())
    ThreadingHTTPServer(("0.0.0.0", 8788), Handler).serve_forever()
