# Transfer method

Source notebook: `04_epistemology_and_governance.ipynb`
Colab: https://colab.research.google.com/github/Rosary-mom/Bio2.0/blob/main/04_epistemology_and_governance.ipynb

Three numbers stay in three classes. Do not transfer the class.

| Class | Example | May enter a decision aid? |
| --- | --- | --- |
| measured | tomato kg/bed, soil DHG-TPF, eta_DHG 8.5 | yes, with unit |
| telemetry | ESG 0-1 from gov_telemetry.json | yes, as governance telemetry only |
| author_claim | eta_raw 30000, the "30,000x" line | no. Protocol claim, no unit, not a learner input |

The 30,000x line is the special case that must not be scaled onto other topics. What transfers is the operator: separate the classes, then test whether a cause-effect chain repeats.

## Anonymous chain

Published files set `client` to null. A PC may keep a private sidecar outside git (`memory/private/`, gitignored). Other Grok instances read only the public chain.

A chain is redundant when the same signatures appear in at least two topics or two formats. Early aid fires when Sehen and Sagen are present and Suehnen is not yet recorded.

Aids: `observe` (one format only), `prepare` (signatures match, seat not yet filled or Suehnen just fired), `hold` (claim class leaked into the chain).

Run: `python3 memory/workflows/decide.py memory/patterns/anon-preemptive-veto-2026-09.json`
