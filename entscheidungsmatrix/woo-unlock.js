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

  window.addEventListener("load", function () {
    var q = new URLSearchParams(location.search);
    var order = q.get("order");
    var key = q.get("key");
    if (order && key && key.indexOf("wc_order_") === 0) {
      verify("order=" + encodeURIComponent(order) + "&key=" + encodeURIComponent(key));
    }
  });
})();
