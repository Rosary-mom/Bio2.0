# ESG Multi-PC memory

Other Grok instances: read `esg-multipc.json` first. Do not redesign scores already listed there. Prefer `live_telemetry`. Use `page_fallback` only if telemetry was not loaded. Never promote `author_claims` into measurements.

LAN: on the home PC run `python3 scripts/serve-esg-lan.py`. Other PCs on the same network then GET `http://<home-ip>:8787/esg-multipc.json`.

Public copies: GitHub Pages and the Vercel project serve the same file.
