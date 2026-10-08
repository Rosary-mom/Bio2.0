(function () {
  function readBlob(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var raw = String(reader.result || "");
        resolve(raw.indexOf(",") >= 0 ? raw.split(",")[1] : raw);
      };
      reader.onerror = function () { reject(new Error("Datei nicht lesbar")); };
      reader.readAsDataURL(blob);
    });
  }

  function scaleImage(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 1600;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        var scale = Math.min(1, max / Math.max(w, h, 1));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error("Bild nicht skaliert")); return; }
          readBlob(blob).then(function (data) {
            var base = String(file.name || "bild").replace(/\.[^.]+$/, "");
            resolve({ name: base + "-" + w + "x" + h + ".jpg", mime: "image/jpeg", data: data, w: w, h: h });
          }, reject);
        }, "image/jpeg", 0.82);
      };
      img.onerror = function () { reject(new Error("Bild nicht lesbar")); };
      img.src = url;
    });
  }

  async function pack(file) {
    if (!file) return null;
    if (file.type && file.type.indexOf("image/") === 0) return scaleImage(file);
    if (file.size > 8 * 1024 * 1024) throw new Error("Datei größer als 8 MB.");
    return { name: file.name, mime: file.type || "application/octet-stream", data: await readBlob(file) };
  }

  window.rosarySendEsg = async function (field, text, file) {
    var secret = localStorage.getItem("esg_secret") || "";
    if (!secret) throw new Error("Erst nach bezahlter Bestellung.");
    var packed = await pack(file);
    var res = await fetch("https://rosary.health/wp-json/rosary/v1/esg-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: secret,
        field: field,
        text: text || "",
        fileName: packed ? packed.name : "",
        mime: packed ? packed.mime : "",
        data: packed ? packed.data : ""
      })
    });
    var data = await res.json();
    if (!res.ok || !data.ok) throw new Error((data && data.message) || "Abgelehnt");
    return data;
  };
})();
