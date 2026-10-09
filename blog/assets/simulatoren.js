/* Gründer-Rohmodell – Simulatoren a–f, /DREAM · ESTIMATOR · EXECUTOR.
   Nur Zahlen aus dem Leitfaden (Stand 09.10.2026). Orientierung, keine Beratung. */
(function (root) {
  'use strict';
  var GRENZE = { gmbhStamm: 25000, gmbhEinzahlung: 12500, ruecklageQuote: 0.25,
    kuVorjahr: 25000, kuLaufend: 100000, zfuMin: 1050, zfuZulassung: 1.5, zfuVorlaeufig: 2.0,
    zfuCafeteria: 0.5, ratenMonate: 3, asyncSchwelle: 0.5 };
  function n(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* a) UG-Rücklage, § 5a Abs. 3 und 5 GmbHG */
  function ugRuecklage(p) {
    var basis = Math.max(0, n(p.jahresueberschuss) - n(p.verlustvortrag));
    var zufuehrung = r2(basis * GRENZE.ruecklageQuote);
    var ruecklage = r2(n(p.ruecklageBisher) + zufuehrung);
    var summe = r2(n(p.stammkapital) + ruecklage);
    var fehl = r2(Math.max(0, GRENZE.gmbhStamm - summe));
    var jahre = fehl === 0 ? 1 : (zufuehrung > 0 ? 1 + Math.ceil(fehl / zufuehrung) : null);
    return { basis: basis, zufuehrung: zufuehrung, ruecklage: ruecklage, summe: summe, fehlbetrag: fehl, jahreGesamt: jahre };
  }
  /* b) Kleinunternehmerregelung § 19 UStG (Stand 2026) */
  function kleinunternehmer(p) {
    var vj = n(p.vorjahr), lj = n(p.laufend);
    if (p.gruendungsjahr) {
      var ok1 = lj <= GRENZE.kuVorjahr;
      return { moeglich: ok1, regel: 'Gründungsjahr: nur die 25.000-€-Grenze (BMF-Schreiben 18.03.2025)', hart: false };
    }
    var ok = vj <= GRENZE.kuVorjahr && lj <= GRENZE.kuLaufend;
    return { moeglich: ok, regel: 'Vorjahr ≤ 25.000 € und laufendes Jahr ≤ 100.000 €',
      hart: vj <= GRENZE.kuVorjahr && lj > GRENZE.kuLaufend };
  }
  /* c) ZFU-Gebühr, AVerwGebO NRW Tarifstelle 13.2.1–13.2.3 */
  function zfuGebuehr(p) {
    var preis = n(p.preis);
    var zul = Math.max(preis * GRENZE.zfuZulassung, GRENZE.zfuMin);
    var vorl = Math.max(preis * GRENZE.zfuVorlaeufig, GRENZE.zfuMin);
    return { zulassung: r2(zul), vorlaeufig: r2(vorl), cafeteria: r2(zul * GRENZE.zfuCafeteria),
      mindestgebuehrGreift: preis * GRENZE.zfuZulassung < GRENZE.zfuMin };
  }
  /* d) Teilleistungen ≤ 3 Monate, § 2 Abs. 2 FernUSG */
  function raten(p) {
    var preis = n(p.preis), monate = Math.max(1, Math.round(n(p.monate)) || 1);
    var abschnitte = Math.ceil(monate / GRENZE.ratenMonate);
    var cent = Math.round(preis * 100), vergeben = 0, liste = [];
    for (var i = 0; i < abschnitte; i++) {
      var von = i * GRENZE.ratenMonate + 1, bis = Math.min(monate, von + GRENZE.ratenMonate - 1);
      var betrag = i === abschnitte - 1 ? cent - vergeben : Math.round(cent * (bis - von + 1) / monate);
      vergeben += betrag;
      liste.push({ nr: i + 1, monate: von === bis ? 'Monat ' + von : 'Monate ' + von + '–' + bis, betrag: betrag / 100 });
    }
    return { abschnitte: abschnitte, rate: liste[0].betrag, proMonat: r2(preis / monate), liste: liste };
  }
  /* e) Überwiegende räumliche Trennung: > 50 % asynchron (ZFU-Fragebogen) */
  function asynchron(p) {
    var async = n(p.videoStunden) + n(p.selbstlernStunden) + (p.liveAufgezeichnet ? n(p.liveStunden) : 0);
    var gesamt = n(p.videoStunden) + n(p.selbstlernStunden) + n(p.liveStunden);
    var anteil = gesamt > 0 ? async / gesamt : 0;
    var k5 = anteil > GRENZE.asyncSchwelle;
    var alle = !!(p.entgelt && p.vertrag && p.vermittlung && p.kontrolle && k5);
    return { asyncStunden: async, gesamtStunden: gesamt, anteil: anteil, kriterium5: k5, alleFuenf: alle };
  }
  /* f) Live Learn & Earn – Mikro-Einkommen aus Live-Sessions */
  function liveEarn(p) {
    var umsatz = r2(n(p.teilnehmende) * n(p.preis) * n(p.termineProMonat) * n(p.monate));
    var ku = kleinunternehmer({ vorjahr: p.vorjahr, laufend: umsatz, gruendungsjahr: p.gruendungsjahr });
    return { umsatz: umsatz, proMonat: r2(n(p.monate) > 0 ? umsatz / n(p.monate) : 0),
      kleinunternehmer: ku, vorkasseHinweis: p.aufgezeichnet ? 'pruefen' : 'live' };
  }
  /* ESTIMATOR: Anteil erledigter Checklistenpunkte (gleich gewichtet) */
  function estimator(erledigt, gesamt) { return gesamt > 0 ? Math.round(1000 * erledigt / gesamt) / 10 : 0; }

  var SIM = { GRENZE: GRENZE, ugRuecklage: ugRuecklage, kleinunternehmer: kleinunternehmer, zfuGebuehr: zfuGebuehr,
    raten: raten, asynchron: asynchron, liveEarn: liveEarn, estimator: estimator };
  if (typeof module !== 'undefined' && module.exports) { module.exports = SIM; }
  root.GR_SIM = SIM;
  if (typeof document === 'undefined') { return; }

  /* ---------- DOM ---------- */
  var eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
  var pct = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 });
  function $(id) { return document.getElementById(id); }
  function val(id) { var e = $(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : 0; }
  var HINWEIS = '<span class="orient">Orientierung, keine Beratung</span>';
  function out(id, html) { var e = $(id); if (e) { e.innerHTML = html + ' ' + HINWEIS; } }

  var render = {
    a: function () {
      var r = ugRuecklage({ jahresueberschuss: val('a-jue'), verlustvortrag: val('a-vv'), stammkapital: val('a-stamm'), ruecklageBisher: val('a-bisher') });
      out('a-out', 'Pflicht-Rücklage dieses Jahr: <strong>' + eur.format(r.zufuehrung) + '</strong> (25 % von ' + eur.format(r.basis) + '). ' +
        'Stammkapital + Rücklage: ' + eur.format(r.summe) + '. ' +
        (r.fehlbetrag === 0 ? 'Die 25.000 € sind rechnerisch erreicht – der Wechsel zur GmbH braucht trotzdem eine Kapitalerhöhung mit HR-Eintragung (§ 5a Abs. 5 GmbHG).' :
         (r.jahreGesamt ? 'Bei gleichbleibendem Überschuss rechnerisch nach etwa <strong>' + r.jahreGesamt + ' Jahren</strong> bei 25.000 € (fehlen noch ' + eur.format(r.fehlbetrag) + ').' :
          'Ohne Überschuss wächst die Rücklage nicht.')));
    },
    b: function () {
      var r = kleinunternehmer({ vorjahr: val('b-vj'), laufend: val('b-lj'), gruendungsjahr: val('b-gj') });
      out('b-out', (r.moeglich ? '<strong>Kleinunternehmerregelung rechnerisch möglich.</strong> ' : '<strong>Grenze überschritten – Kleinunternehmerregelung rechnerisch nicht möglich.</strong> ') +
        'Regel: ' + r.regel + '.' + (r.hart ? ' Achtung harte Grenze: Schon der Umsatz, mit dem 100.000 € überschritten werden, ist steuerpflichtig.' : ''));
    },
    c: function () {
      var r = zfuGebuehr({ preis: val('c-preis') });
      out('c-out', 'Zulassung (13.2.1): <strong>' + eur.format(r.zulassung) + '</strong>' + (r.mindestgebuehrGreift ? ' – Mindestgebühr greift' : '') +
        ' · vorläufige Zulassung (13.2.2): ' + eur.format(r.vorlaeufig) + ' · Cafeteria-Lehrgang (13.2.3): ' + eur.format(r.cafeteria) + '.');
    },
    d: function () {
      var r = raten({ preis: val('d-preis'), monate: val('d-monate') });
      var li = r.liste.map(function (x) { return '<li>Rate ' + x.nr + ' (' + x.monate + '): ' + eur.format(x.betrag) + '</li>'; }).join('');
      out('d-out', '<strong>' + r.abschnitte + ' Teilleistungen</strong> für jeweils höchstens 3 Monate (anteilig ' + eur.format(r.proMonat) + ' pro Monat):<ol>' + li + '</ol>Vorauszahlung des Gesamtpreises und Einschreibegebühren sind bei zulassungspflichtigem Fernunterricht unzulässig.');
    },
    e: function () {
      var r = asynchron({ videoStunden: val('e-video'), selbstlernStunden: val('e-selbst'), liveStunden: val('e-live'), liveAufgezeichnet: val('e-rec'),
        entgelt: val('e-k1'), vertrag: val('e-k2'), vermittlung: val('e-k3'), kontrolle: val('e-k4') });
      out('e-out', 'Asynchron: ' + r.asyncStunden + ' von ' + r.gesamtStunden + ' Std. = <strong>' + pct.format(r.anteil) + '</strong> → Kriterium 5 ' +
        (r.kriterium5 ? '<strong>erfüllt</strong> (mehr als 50 %).' : 'nicht erfüllt (50 % oder weniger).') + ' ' +
        (r.alleFuenf ? 'Alle fünf Prüffragen bejaht: <strong>Zulassungspflicht wahrscheinlich</strong> – ZFU-Fragebogen ausfüllen und dokumentieren.' :
         'Nicht alle fünf Prüffragen bejaht – Ergebnis mit dem ZFU-Fragebogen bestätigen und dokumentieren.'));
    },
    f: function () {
      var r = liveEarn({ teilnehmende: val('f-tn'), preis: val('f-preis'), termineProMonat: val('f-termine'), monate: val('f-monate'),
        aufgezeichnet: val('f-rec'), vorjahr: val('f-vj'), gruendungsjahr: val('f-gj') });
      out('f-out', 'Umsatz: <strong>' + eur.format(r.umsatz) + '</strong> (≈ ' + eur.format(r.proMonat) + ' pro Monat). ' +
        (r.kleinunternehmer.moeglich ? 'Liegt innerhalb der Kleinunternehmergrenzen (§ 19 UStG). ' : 'Überschreitet die Kleinunternehmergrenzen (§ 19 UStG). ') +
        (r.vorkasseHinweis === 'live' ? 'Live-synchron ohne abrufbare Aufzeichnung: laut ZFU keine räumliche Trennung – Vorkasse möglich, Ergebnis dokumentieren.' :
         'Aufzeichnungen zählen asynchron – Anteil mit Simulator e prüfen; bei Zulassungspflicht keine Vorkasse.'));
    }
  };
  function bind() {
    Object.keys(render).forEach(function (k) {
      var box = $('sim-' + k); if (!box) { return; }
      box.addEventListener('input', render[k]); box.addEventListener('change', render[k]); render[k]();
      var btn = box.querySelector('[data-beispiel]');
      if (btn) { btn.addEventListener('click', function () {
        var ex = JSON.parse(btn.getAttribute('data-beispiel'));
        Object.keys(ex).forEach(function (id) { var e = $(id); if (!e) { return; } if (e.type === 'checkbox') { e.checked = !!ex[id]; } else { e.value = ex[id]; } });
        render[k]();
      }); }
    });
    /* /DREAM */
    document.querySelectorAll('[data-dream]').forEach(function (b) {
      b.addEventListener('click', function () { $('dream-out').textContent = b.getAttribute('data-text'); });
    });
    /* ESTIMATOR + EXECUTOR über die Checkliste 6.1 */
    var boxes = Array.prototype.slice.call(document.querySelectorAll('input.task'));
    function est() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      var v = estimator(done, boxes.length);
      if ($('est-val')) { $('est-val').textContent = v.toFixed(1).replace('.', ',') + ' %'; $('est-bar').style.width = v + '%';
        $('est-msg').textContent = done + ' von ' + boxes.length + ' Checklistenpunkten erledigt (gleich gewichtet, Orientierung, keine Beratung).'; }
    }
    boxes.forEach(function (b) { b.addEventListener('change', est); }); est();
    var ex = $('btn-exec');
    if (ex) {
      ex.addEventListener('click', function () {
        boxes.forEach(function (b) { b.parentNode.classList.remove('next'); });
        var nxt = boxes.filter(function (b) { return !b.checked; })[0];
        if (!nxt) { $('exec-out').textContent = 'EXECUTOR: Alle Punkte abgehakt. Jetzt mit Steuerberatung, Anwalt und IHK gegenprüfen.'; return; }
        nxt.parentNode.classList.add('next'); nxt.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        $('exec-out').textContent = 'EXECUTOR – nächster Schritt: ' + nxt.parentNode.textContent.trim();
      });
      $('btn-reset').addEventListener('click', function () { boxes.forEach(function (b) { b.checked = false; b.parentNode.classList.remove('next'); }); est(); $('exec-out').textContent = 'Zurückgesetzt.'; });
      $('btn-manifest').addEventListener('click', function () {
        var txt = boxes.map(function (b) { return (b.checked ? '[x] ' : '[ ] ') + b.parentNode.textContent.trim(); }).join('\n');
        $('manifest').value = 'Gründer-Rohmodell – Checkliste (' + new Date().toLocaleDateString('de-DE') + ')\n' + txt; $('manifest').hidden = false;
      });
    }
    /* Videos: erst nach Klick (DSGVO) */
    document.querySelectorAll('button.yt').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = document.createElement('iframe'); var id = b.getAttribute('data-id');
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        f.title = b.getAttribute('data-title'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
        f.loading = 'lazy'; f.referrerPolicy = 'strict-origin-when-cross-origin';
        b.parentNode.replaceChild(f, b);
      });
    });
    var c = $('btn-contrast');
    if (c) { c.addEventListener('click', function () { document.body.classList.toggle('hc'); c.setAttribute('aria-pressed', document.body.classList.contains('hc')); }); }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', bind); } else { bind(); }
})(typeof window !== 'undefined' ? window : globalThis);
