"""VS Code runner for the Module 04 Gemini review.

Colab uses the same prompt in 04_epistemology_and_governance.ipynb.
Set GEMINI_API_KEY in the environment. This file does not contain a key.
"""

import json
import os

MEASURED = {
    "evidence": "measured",
    "tomato_kg": {"M_P": 41.006, "M_O": 33.658, "K_P": 36.159, "K_O": 36.709, "unit": "kg/bed"},
    "soil_dhg_tpf": {"manure_end": 153.1, "compost_start_lo": 13.1, "unit": "mg/10g"},
    "eta_DHG": {"value": 8.5, "unit": "1", "class": "derived"},
}
TELEMETRY = {
    "class": "governance_telemetry",
    "allowed_in_enzyme_learner": False,
    "esg_carbon": 0.9412,
    "aggregate_stability": 0.9381,
    "unit": "1",
}
CLAIM = {
    "evidence": "author_claim",
    "eta_raw": 30000,
    "eta_log10": 4.477,
    "assay": None,
    "allowed_in_learner": False,
}


def main() -> None:
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    if not key:
        print(json.dumps({
            "gemini": "skipped",
            "vscode": "set GEMINI_API_KEY, then python notebooks/gemini_review.py",
        }, indent=2))
        return
    from google import genai

    prompt = (
        "Review this Bio 2.0 packet. Keep measured, telemetry, and author_claim separate. "
        "Do not call eta_raw 30000 an enzyme assay. Do not call the NS watch a Clay proof. "
        "German, at most 120 words, then one next notebook step inside those rules.\n"
        + json.dumps({"measured": MEASURED, "telemetry": TELEMETRY, "claim": CLAIM})
    )
    client = genai.Client(api_key=key)
    interaction = client.interactions.create(
        model="gemini-3.8-flash",
        input=prompt,
    )
    print(interaction.output_text)


if __name__ == "__main__":
    main()
