# ESG-Cockpit (EKIR / EAIR)

Interaktives Entscheidungs-Cockpit zur Essay-Fassung **Emergente KI-Forschung als anwendbare Revolution** (v2, 2. Nov. 2026).  
Zielpfad für späteres Hochladen (noch **nicht** gepusht):  
`https://colab.research.google.com/github/Rosary-mom/Bio2.0/blob/main/k3/ESG_Cockpit.ipynb`

## Start in Colab
1. Laufzeit → Laufzeittyp → **T4-GPU**
2. Alle Zellen von oben nach unten ausführen
3. Cockpit läuft **ohne** LLM vollständig; LLM optional (Qwen2.5-7B-Instruct 4-Bit, Fallback 1.5B, Apache-2.0, kein API-Key)

## Abschnitte
0. Setup / Seeds  
1. Evidenzleiter & Klassen  
2. Eingaberegister mit Provenienz  
3. η-Trennung (`eta_DHG` / `eta_enz` / `eta_claim`)  
4. ESG-Kennzahlen 0,9399 / 0,9150 / 0,9375  
5. Q-Hebel-Modellkurve (Engine-Formel, fester Seed 42)  
6. Bodenkorrelationen Kledke Tab. 13/20  
7. Agenda-Rosarium-Matrix A/B/C (B = online beworbene Beef-Snacks)  
8. Sieben Maßgaben + ESG-Lösungen  
9. Entscheidungs-Panel mit Formel \(S_{ESG}=w_E E+w_S S+w_G G\) und Gates  
10. **RKW-Cockpit (schlafend) zuschalten** — Standard OFF; fünf Scout-Codes  
11. LLM-Assistent (optional)  
12. JSON-Export

## RKW-Modul
Gruppe „RKW-Scouts & Kategorien (Schlaf)“: RKW-Innovation, Uni-Campus, Live-Learn-Earn, Sales-Channels, MicroLiving.  
Offline, keine Live-APIs. ESG-Kopplungen über die dokumentierte Domain hinaus = **Vorschlag**.

## Headless-Test (Box)
```bash
COCKPIT_HEADLESS=1 SKIP_LLM=1 MPLBACKEND=Agg \
  jupyter nbconvert --to notebook --execute cockpit/ESG_Cockpit.ipynb
```
LLM wurde im Test **gestubbt** (`SKIP_LLM=1`). Ergebnis: `PROTOCOL LOCK ACTIVE`, \(S_{ESG}\approx 0{,}9308\).

## Dateien
- `ESG_Cockpit.ipynb` — Quelle
- `ESG_Cockpit.executed.ipynb` — Testlauf
- `dashboard_main.png` — Composite der Hauptcharts
- `cockpit_state.json` — exportierter Zustand
- Einzelcharts: `dashboard_*.png`

## Regeln
Keine privaten Daten, keine API-Keys im Notebook.  
ITC-Metrik: UNFCCC Momentum for Change Lighthouse, Reg.-Nr. **A-6855949784** (dokumentiert).
