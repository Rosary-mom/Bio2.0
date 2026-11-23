/* vault-collab.js — simulated handoffs of awakened agents, with avatars.
   Static snapshot only. No secrets. No real-person names. */
(function () {
  "use strict";
  window.VAULT_COLLAB_VERSION = "2026-11-23";

  var NS = "http://www.w3.org/2000/svg";
  var XLINK = "http://www.w3.org/1999/xlink";
  var VIEW = { w: 1100, h: 720 };
  var SLOTS = {
    "SC-06": [550, 78],
    "GB-RDIR": [380, 230],
    "GB-REGIE": [720, 230],
    "GB-FIDELIO": [110, 400],
    "GB-ARCHY": [330, 400],
    "GB-DATEN": [550, 400],
    "GB-MARVIN": [770, 400],
    "GB-BUECHER": [990, 400],
    "M4": [550, 530],
    "GB-DOC": [150, 650],
    "MT-ERN": [350, 650],
    "MT-BEW": [530, 650],
    "MT-SCHLAF": [710, 650],
    "MT-EVI": [910, 650]
  };
  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { reduced = false; }

  var raf = 0;
  var particles = [];
  var pathsByKey = {};
  var running = false;
  var lastTs = 0;
  var snapshot = null;

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return;
        if (k === "href") {
          node.setAttribute("href", attrs[k]);
          node.setAttributeNS(XLINK, "href", attrs[k]);
        } else {
          node.setAttribute(k, String(attrs[k]));
        }
      });
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function textNode(value, parent) {
    var t = document.createTextNode(value == null ? "" : String(value));
    if (parent) parent.appendChild(t);
    return t;
  }

  function loadSnapshot(cb) {
    if (window.TEAM_SNAPSHOT && window.TEAM_SNAPSHOT.agents) {
      cb(window.TEAM_SNAPSHOT);
      return;
    }
    fetch("./team-snapshot.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw r.status; return r.json(); })
      .then(cb)
      .catch(function () {
        fetch("/rosary-atlas/team-snapshot.json", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw r.status; return r.json(); })
          .then(cb)
          .catch(function (err) { console.warn("vault-collab: snapshot missing", err); });
      });
  }

  function byId(list) {
    var m = Object.create(null);
    (list || []).forEach(function (a) { m[a.id] = a; });
    return m;
  }

  function avatarSize(agent) {
    if (agent.cluster === "leitung") return 64;
    if (agent.kind === "subagent" || agent.kind === "briefing") return 48;
    return 56;
  }

  function pathD(x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1;
    var mx = (x1 + x2) / 2;
    var my = (y1 + y2) / 2;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bow = Math.min(48, len * 0.18);
    var cx = mx - (dy / len) * bow;
    var cy = my + (dx / len) * bow;
    return "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2;
  }

  function midpoint(path) {
    try {
      var len = path.getTotalLength();
      return path.getPointAtLength(len / 2);
    } catch (e) {
      return { x: 0, y: 0 };
    }
  }

  function renderCluster(root, data) {
    root.textContent = "";
    var agents = data.agents || [];
    var interactions = data.interactions || [];
    var map = byId(agents);
    if (root.classList.contains("collab-floating") && window.innerWidth >= 960) {
      root.classList.add("is-expanded");
    }

    var head = document.createElement("div");
    head.className = "collab-head";
    var h2 = document.createElement("h2");
    textNode(data.title || "Zusammenarbeit", h2);
    head.appendChild(h2);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "collab-toggle";
    btn.id = "collab-expand";
    var expanded = root.classList.contains("is-expanded");
    btn.setAttribute("aria-pressed", expanded ? "true" : "false");
    textNode(root.classList.contains("collab-floating") ? (expanded ? "Kleiner" : "Größer") : "Cluster", btn);
    head.appendChild(btn);
    root.appendChild(head);

    var note = document.createElement("p");
    note.className = "collab-note";
    textNode(data.note || "", note);
    root.appendChild(note);

    var stage = document.createElement("div");
    stage.className = "collab-stage";
    var svg = el("svg", {
      viewBox: "0 0 " + VIEW.w + " " + VIEW.h,
      role: "img",
      "aria-label": "Cluster der erweckten Agenten, Subagents und Bots mit simulierten Übergaben"
    }, stage);
    root.appendChild(stage);

    var defs = el("defs", null, svg);
    el("marker", {
      id: "collab-arrow",
      viewBox: "0 0 10 10",
      refX: 8,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: "auto-start-reverse"
    }, defs).appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#79C7FF" }));
    el("marker", {
      id: "collab-arrow-watch",
      viewBox: "0 0 10 10",
      refX: 8,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: "auto-start-reverse"
    }, defs).appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#F0C14B" }));

    var edgeLayer = el("g", { "class": "collab-edges" }, svg);
    var partLayer = el("g", { "class": "collab-particles", "aria-hidden": "true" }, svg);
    var nodeLayer = el("g", { "class": "collab-nodes" }, svg);

    pathsByKey = {};
    particles = [];

    interactions.forEach(function (ix, i) {
      var a = map[ix.from], b = map[ix.to];
      if (!a || !b) return;
      var pa = SLOTS[a.id], pb = SLOTS[b.id];
      if (!pa || !pb) return;
      var prominent = ix.kind === "handoff" || ix.kind === "watch";
      var color = ix.kind === "watch" ? "#F0C14B" : (prominent ? "#79C7FF" : "#8A6A22");
      var d = pathD(pa[0], pa[1], pb[0], pb[1]);
      var path = el("path", {
        d: d,
        fill: "none",
        stroke: color,
        "stroke-width": prominent ? 3.2 : 1.8,
        "stroke-opacity": prominent ? 0.95 : 0.55,
        "marker-end": ix.kind === "watch" ? "url(#collab-arrow-watch)" : "url(#collab-arrow)"
      }, edgeLayer);
      var key = ix.from + "->" + ix.to + "#" + i;
      pathsByKey[key] = path;
      if (ix.label && prominent) {
        var LABEL_POS = {
          "GB-RDIR->GB-FIDELIO": [200, 285],
          "GB-FIDELIO->GB-ARCHY": [220, 348],
          "GB-ARCHY->GB-RDIR": [250, 250],
          "GB-REGIE->GB-RDIR": [500, 200],
          "SC-06->GB-REGIE": [760, 100],
          "GB-DATEN->M4": [680, 470],
          "GB-REGIE->GB-MARVIN": [880, 310]
        };
        var posL = LABEL_POS[ix.from + "->" + ix.to];
        if (!posL) {
          var mid = midpoint(path);
          posL = [mid.x, mid.y - 14];
        }
        var label = el("text", {
          x: posL[0],
          y: posL[1],
          "text-anchor": "middle",
          fill: "#FFF8E8",
          "font-size": "16",
          "font-weight": "700",
          "paint-order": "stroke",
          stroke: "#120F0C",
          "stroke-width": "5"
        }, edgeLayer);
        textNode(ix.label, label);
      }
      if (prominent) {
        var img = el("image", {
          href: a.avatar,
          width: 22,
          height: 22,
          "aria-hidden": "true"
        }, partLayer);
        el("circle", {
          r: 12,
          fill: "none",
          stroke: color,
          "stroke-width": 2
        }, partLayer);
        // last child is the ring; keep refs on a particle record
        var ring = partLayer.lastChild;
        particles.push({
          key: key,
          t: (i * 0.17) % 1,
          speed: ix.kind === "watch" ? 0.00028 : 0.00042,
          img: img,
          ring: ring,
          href: a.avatar
        });
      }
    });

    agents.forEach(function (agent) {
      var slot = SLOTS[agent.id];
      if (!slot) return;
      var size = avatarSize(agent);
      var g = el("g", { transform: "translate(" + slot[0] + " " + slot[1] + ")" }, nodeLayer);
      var awake = agent.status === "wach";
      el("circle", {
        r: size / 2 + 7,
        fill: "none",
        stroke: awake ? "#3DDC84" : "#8A8678",
        "stroke-width": 4,
        "stroke-dasharray": awake ? "0" : "5 5",
        "class": awake ? "collab-pulse" : ""
      }, g);
      if (awake) {
        var glow = el("circle", {
          r: size / 2 + 11,
          fill: "none",
          stroke: "#3DDC84",
          "stroke-width": 2,
          opacity: "0.45",
          "class": "collab-pulse"
        }, g);
        if (!reduced) {
          var anim = el("animate", {
            attributeName: "r",
            values: (size / 2 + 9) + ";" + (size / 2 + 15) + ";" + (size / 2 + 9),
            dur: "2.4s",
            repeatCount: "indefinite"
          }, glow);
        }
      }
      el("image", {
        href: agent.avatar,
        x: -size / 2,
        y: -size / 2,
        width: size,
        height: size,
        "aria-label": agent.label
      }, g);
      var name = el("text", {
        y: size / 2 + 20,
        "text-anchor": "middle",
        fill: "#FFF8E8",
        "font-size": "18",
        "font-weight": "700"
      }, g);
      textNode(agent.label, name);
      var role = el("text", {
        y: size / 2 + 38,
        "text-anchor": "middle",
        fill: "#E6D7B3",
        "font-size": "16"
      }, g);
      textNode(agent.role, role);
    });

    var legend = document.createElement("ul");
    legend.className = "collab-legend";
    legend.setAttribute("aria-label", "Legende");
    [
      ["wach", "wach"],
      ["schlaf", "schläft"],
      ["handoff", "Übergabe (Avatar wandert)"],
      ["watch", "Wachhund"],
      ["sub", "Subagent"]
    ].forEach(function (row) {
      var li = document.createElement("li");
      var sw = document.createElement("span");
      sw.className = "collab-swatch " + row[0];
      sw.setAttribute("aria-hidden", "true");
      li.appendChild(sw);
      textNode(row[1], li);
      legend.appendChild(li);
    });
    root.appendChild(legend);

    var list = document.createElement("ul");
    list.className = "collab-list";
    list.setAttribute("aria-label", "Status der Rollen");
    agents.forEach(function (agent) {
      var li = document.createElement("li");
      var img = document.createElement("img");
      img.src = agent.avatar;
      img.alt = "";
      img.width = 32;
      img.height = 32;
      li.appendChild(img);
      var lab = document.createElement("span");
      textNode(agent.label + " · " + agent.role, lab);
      li.appendChild(lab);
      var pill = document.createElement("span");
      pill.className = "collab-pill " + (agent.status === "wach" ? "wach" : "schlaf");
      textNode(agent.status === "wach" ? "wach" : "schläft", pill);
      li.appendChild(pill);
      list.appendChild(li);
    });
    root.appendChild(list);

    btn.addEventListener("click", function () {
      if (root.classList.contains("collab-floating")) {
        var on = !root.classList.contains("is-expanded");
        root.classList.toggle("is-expanded", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "Kleiner" : "Größer";
      }
    });
  }

  function tick(ts) {
    if (!running) return;
    if (document.hidden) {
      raf = requestAnimationFrame(tick);
      lastTs = ts;
      return;
    }
    var dt = lastTs ? Math.min(48, ts - lastTs) : 16;
    lastTs = ts;
    particles.forEach(function (p) {
      var path = pathsByKey[p.key];
      if (!path) return;
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      p.t = (p.t + dt * p.speed) % 1;
      var pt = path.getPointAtLength(p.t * len);
      if (p.img) {
        p.img.setAttribute("x", pt.x - 11);
        p.img.setAttribute("y", pt.y - 11);
      }
      if (p.ring) {
        p.ring.setAttribute("cx", pt.x);
        p.ring.setAttribute("cy", pt.y);
      }
    });
    animateOverlay(dt);
    raf = requestAnimationFrame(tick);
  }

  function startAnim() {
    if (reduced || running) return;
    running = true;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }

  function stopAnim() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* Optional pulses on the big Sigma disc, if it is ready. */
  var overlayState = { svg: null, items: [] };

  function ensureOverlay() {
    var canvas = document.getElementById("vg-canvas") || document.getElementById("vg-graph");
    if (!canvas) return null;
    var svg = document.getElementById("vg-collab-overlay");
    if (!svg) {
      svg = el("svg", { id: "vg-collab-overlay", "class": "collab-overlay", "aria-hidden": "true" });
      canvas.appendChild(svg);
    }
    overlayState.svg = svg;
    return svg;
  }

  function graphNodeId(vaultId, label) {
    var api = window.__vg;
    if (!api || !api.graph) return null;
    var found = null;
    api.graph.forEachNode(function (id, a) {
      if (found) return;
      if (a.path === vaultId || a.label === label) found = id;
    });
    return found;
  }

  function toViewport(renderer, nodeId) {
    if (!renderer || nodeId == null) return null;
    try {
      if (typeof renderer.getNodeDisplayData === "function") {
        var d = renderer.getNodeDisplayData(nodeId);
        if (d && typeof d.x === "number") {
          if (typeof renderer.graphToViewport === "function") {
            return renderer.graphToViewport({ x: d.x, y: d.y });
          }
          if (d.displayX != null) return { x: d.displayX, y: d.displayY };
          return { x: d.x, y: d.y };
        }
      }
    } catch (e) { /* renderer not ready */ }
    return null;
  }

  function buildOverlay(data) {
    var svg = ensureOverlay();
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    overlayState.items = [];
    var api = window.__vg;
    if (!api || !api.renderer || !data) return;
    var map = byId(data.agents);
    (data.interactions || []).forEach(function (ix, i) {
      if (ix.kind !== "handoff" && ix.kind !== "watch") return;
      var a = map[ix.from], b = map[ix.to];
      if (!a || !b) return;
      var sid = graphNodeId(a.vaultId, a.label);
      var tid = graphNodeId(b.vaultId, b.label);
      if (sid == null || tid == null) return;
      var path = el("path", { fill: "none", stroke: "none" }, svg);
      var img = el("image", { href: a.avatar, width: 20, height: 20 }, svg);
      overlayState.items.push({
        path: path, img: img, s: sid, t: tid, tpos: (i * 0.2) % 1,
        speed: 0.0004, href: a.avatar
      });
    });
  }

  function animateOverlay(dt) {
    var api = window.__vg;
    var svg = overlayState.svg;
    if (!api || !api.renderer || !svg || !overlayState.items.length) return;
    var renderer = api.renderer;
    var host = svg.parentElement;
    if (host) {
      svg.setAttribute("width", host.clientWidth || 0);
      svg.setAttribute("height", host.clientHeight || 0);
      svg.setAttribute("viewBox", "0 0 " + (host.clientWidth || 0) + " " + (host.clientHeight || 0));
    }
    overlayState.items.forEach(function (it) {
      var a = toViewport(renderer, it.s);
      var b = toViewport(renderer, it.t);
      if (!a || !b) {
        it.img.setAttribute("opacity", "0");
        return;
      }
      it.img.setAttribute("opacity", "0.95");
      var d = pathD(a.x, a.y, b.x, b.y);
      it.path.setAttribute("d", d);
      it.tpos = (it.tpos + dt * it.speed) % 1;
      try {
        var len = it.path.getTotalLength();
        if (!len) return;
        var pt = it.path.getPointAtLength(it.tpos * len);
        it.img.setAttribute("x", pt.x - 10);
        it.img.setAttribute("y", pt.y - 10);
      } catch (e) { /* path not ready */ }
    });
  }

  function placeRoot() {
    var existing = document.getElementById("collab-root");
    if (existing) return existing;
    var root = document.createElement("div");
    root.id = "collab-root";
    var stage = document.getElementById("vg-stage") || document.getElementById("vg-canvas");
    if (stage) {
      root.className = "collab-root collab-floating";
      stage.appendChild(root);
    } else {
      root.className = "collab-root collab-page-block";
      document.body.insertBefore(root, document.body.firstChild);
    }
    return root;
  }

  function addToolbarToggle(root) {
    var tools = document.querySelector("#vg-app .tools");
    if (!tools || document.getElementById("collab-toolbar-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "collab-toolbar-toggle";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "true");
    btn.title = "Zusammenarbeit: Cluster, Status und Übergaben";
    textNode("Zusammenarbeit", btn);
    tools.insertBefore(btn, tools.firstChild);
    btn.addEventListener("click", function () {
      var on = root.classList.contains("collab-hidden");
      root.classList.toggle("collab-hidden", !on);
      var ov = document.getElementById("vg-collab-overlay");
      if (ov) ov.classList.toggle("collab-hidden", !on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) startAnim(); else stopAnim();
    });
  }

  function boot(data) {
    snapshot = data;
    window.TEAM_SNAPSHOT = data;
    var root = placeRoot();
    root.classList.add("collab-root");
    renderCluster(root, data);
    addToolbarToggle(root);
    if (!reduced) startAnim();
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (window.__vg && window.__vg.renderer) {
        buildOverlay(data);
        clearInterval(timer);
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 250);
  }

  function start() {
    loadSnapshot(boot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
