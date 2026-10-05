#!/usr/bin/env python3
"""Decision aid for an anonymous event chain. Not a measurement."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SIGS = {
    "rule change before the seat is filled",
    "written procedure",
    "justification is blockade prevention",
    "formal threshold stays high",
    "effective exclusion is informal",
}

def load(path):
    data = json.loads(Path(path).read_text())
    if data.get("client") is not None:
        raise SystemExit("published chain must keep client null")
    return data

def aid(data):
    steps = {item.get("step") for item in data.get("chain", [])}
    leaked = [item for item in data.get("chain", []) if item.get("claim_type") == "author_claim"]
    hits = [s for s in data.get("signatures", []) if s in SIGS]
    if leaked:
        return "hold", "author_claim leaked into the chain; 30000x is not an input"
    if {"sehen", "sagen"} <= steps and "suehnen" not in steps and len(hits) >= 3:
        return "prepare", "cause chain open, Suehnen not yet recorded, %d signatures" % len(hits)
    if {"sehen", "sagen", "suehnen"} <= steps and len(hits) >= 3:
        return "prepare", "chain closed, %d signatures match preemptive-veto" % len(hits)
    return "observe", "not enough repeated signatures"

def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "memory/patterns/anon-preemptive-veto-2026-09.json")
    data = load(path)
    decision, why = aid(data)
    out = {"id": data.get("id"), "client": None, "aid": decision, "why": why, "not_a_measurement": True}
    print(json.dumps(out, indent=2))

if __name__ == "__main__":
    main()
