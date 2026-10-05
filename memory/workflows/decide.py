#!/usr/bin/env python3
"""A-posteriori aid. Author claim is an annotation, not a veto."""
import json, sys
from pathlib import Path

def load(path):
    data = json.loads(Path(path).read_text())
    if data.get("client") is not None:
        raise SystemExit("published chain must keep client null")
    return data

def egenden(data):
    steps = {item.get("step") for item in data.get("chain", [])}
    has_unit = any(item.get("unit") for item in data.get("chain", [])) or data.get("unit")
    formats = set(data.get("formats") or [])
    if data.get("format"):
        formats.add(data["format"])
    admin = data.get("client") is None and len(steps) >= 2
    supply = bool(data.get("corpus") or has_unit or data.get("evidence_class") == "reported")
    spread = len(formats) >= 2 or len(data.get("redundant_with") or []) >= 1 or len(data.get("signatures") or []) >= 5
    return {
        "selbst-administrierend": admin,
        "selbst-versorgend": supply,
        "selbst-ausbreitend": spread,
    }

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "memory/patterns/anon-preemptive-veto-2026-09.json"
    data = load(path)
    cols = egenden(data)
    if all(cols.values()):
        aid, why = "decision-capable", "feasibility passed and the spiral repeats; still not a measurement"
    elif cols["selbst-administrierend"] and cols["selbst-versorgend"]:
        aid, why = "feasibility", "corpus or report present; second format still missing"
    else:
        aid, why = "observe", "chain not yet self-supplying"
    annotated = [item.get("text") for item in data.get("chain", []) if item.get("claim_type") == "author_claim"]
    print(json.dumps({
        "id": data.get("id"),
        "client": None,
        "egenden": cols,
        "aid": aid,
        "why": why,
        "author_claim_annotated_not_veto": annotated,
        "not_a_measurement": True,
    }, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
