(function () {
  var UNLOCK_API = "https://rosary.health/wp-json/rosary/v1/esg-unlock";

  function statusEl() {
    return document.getElementById("unlock-status");
  }

  function markUnlocked(secret, orderId) {
    localStorage.setItem("esg_unlock", "true");
    localStorage.setItem("esg_webhook", "/api/webhook");
    if (secret) localStorage.setItem("esg_secret", secret);
    if (orderId) localStorage.setItem("esg_order", String(orderId));
    var webhook = document.getElementById("webhook-url");
    if (webhook) webhook.value = "/api/webhook";
    var input = document.getElementById("secret-input");
    if (input && secret) input.value = secret;
    var st = statusEl();
    if (st) {
      st.innerHTML = '<span class="status-ok">Freigeschaltet. Bestellung'
        + (orderId ? " #" + orderId : "")
        + " ist bezahlt.</span>";
    }
    var box = document.getElementById("session-box");
    if (box) box.style.display = "block";
  }

  async function verify(query) {
    var st = statusEl();
    if (st) st.textContent = "Prüfe Zahlung bei WooCommerce…";
    try {
      var res = await fetch(UNLOCK_API + "?" + query, { method: "GET" });
      var data = await res.json();
      if (data && data.ok && data.secret) {
        markUnlocked(data.secret, data.order);
        return data;
      }
      if (st) {
        st.innerHTML = '<span class="status-err">'
          + ((data && data.message) || "Zahlung noch nicht abgeschlossen.")
          + "</span>";
      }
      return data;
    } catch (e) {
      if (st) {
        st.innerHTML = '<span class="status-err">Woo-Prüfung nicht erreichbar. Snippet Rosary ESG Unlock auf rosary.health aktivieren (Code Snippets, überall ausführen).</span>';
      }
      return null;
    }
  }

  window.unlockWithSecret = function () {
    var input = document.getElementById("secret-input");
    var secret = input ? input.value.trim() : "";
    if (!secret) return;
    verify("secret=" + encodeURIComponent(secret));
  };

  window.requestSession = function () {
    var secret = localStorage.getItem("esg_secret") || "";
    var name = (document.getElementById("session-name") || {}).value || "";
    var email = (document.getElementById("session-email") || {}).value || "";
    var when = (document.getElementById("session-when") || {}).value || "";
    var st = document.getElementById("session-status");
    if (!secret) {
      if (st) st.textContent = "Erst freischalten.";
      return;
    }
    if (!when) {
      if (st) st.textContent = "Wunschtermin fehlt.";
      return;
    }
    if (st) st.textContent = "Sende Terminanfrage…";
    fetch("https://rosary.health/wp-json/rosary/v1/esg-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secret,
        name: String(name).trim(),
        email: String(email).trim(),
        when: String(when).trim()
      })
    }).then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
      .then(function (out) {
        if (st) {
          st.textContent = (out.data && out.data.ok)
            ? "Termin angefragt. Die Mail geht an beide Adressen. Der Raum ist noch nicht automatisch reserviert."
            : ((out.data && (out.data.message || (out.data.data && out.data.data.status))) || "Anfrage abgelehnt.");
        }
      })
      .catch(function () {
        if (st) st.textContent = "Rosary Health nicht erreichbar. Snippet Rosary ESG Unlock neu einfügen.";
      });
  };

  window.addEventListener("load", function () {
    var q = new URLSearchParams(location.search);
    var order = q.get("order");
    var key = q.get("key");
    if (order && key && key.indexOf("wc_order_") === 0) {
      verify("order=" + encodeURIComponent(order) + "&key=" + encodeURIComponent(key));
    }
  });
})();
