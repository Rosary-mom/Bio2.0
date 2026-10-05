#!/usr/bin/env python3
"""Serve the ESG memory on the home LAN for every Multi-PC."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import socket

ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "/esg-multipc.json": ROOT / "memory" / "esg-multipc.json",
    "/.well-known/esg-memory.json": ROOT / ".well-known" / "esg-memory.json",
    "/memory/GROK.md": ROOT / "memory" / "GROK.md",
}

class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, content_type):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/memory"):
            body = json.dumps({"ok": True, "files": sorted(FILES)}, indent=2)
            self._send(200, body, "application/json")
            return
        target = FILES.get(path)
        if not target or not target.is_file():
            self._send(404, '{"error":"not found"}', "application/json")
            return
        kind = "text/markdown; charset=utf-8" if target.suffix == ".md" else "application/json; charset=utf-8"
        self._send(200, target.read_bytes(), kind)

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
    host, port = "0.0.0.0", 8787
    print("ESG memory on http://%s:%s/esg-multipc.json" % (lan_ip(), port))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
