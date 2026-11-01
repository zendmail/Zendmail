/**
 * Script injected into the editor canvas iframe (srcDoc, sandbox="allow-scripts"). It only draws the
 * selection/hover overlays and reports user intent to the parent via postMessage; the parent owns all state.
 * Kept as a plain string so it can be embedded without a build step. Contains no "</script" sequence.
 */
export const EDITOR_SCRIPT = String.raw`
(function () {
  var ACCENT = "#0B5FFF";
  var parentWin = window.parent;
  var selectedId = null, hoverId = null;
  function post(m) { m.zm = m.zm || ""; parentWin.postMessage(m, "*"); }
  var css = document.createElement("style");
  css.textContent =
    "html{scroll-behavior:auto}" +
    "[data-block-id]{cursor:default}" +
    ".zm-box{position:absolute;pointer-events:none;z-index:2147483000;box-sizing:border-box;border-radius:2px;transition:top .12s ease,left .12s ease,width .12s ease,height .12s ease,opacity .12s ease}" +
    ".zm-hover{border:1.5px solid " + ACCENT + "66}" +
    ".zm-sel{border:2px solid " + ACCENT + ";box-shadow:0 0 0 1px rgba(255,255,255,.85),inset 0 0 0 1px rgba(255,255,255,.85)}" +
    ".zm-chip{position:absolute;z-index:2147483001;transform:translateY(-100%);background:" + ACCENT + ";color:#fff;font:600 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;letter-spacing:.02em;padding:5px 8px;border-radius:5px 5px 0 0;pointer-events:none;white-space:nowrap}" +
    ".zm-bar{position:absolute;z-index:2147483002;display:flex;gap:1px;background:#fff;border:1px solid #D9DEE8;border-radius:8px;box-shadow:0 4px 14px rgba(16,24,40,.14);padding:2px;transform:translateY(-50%)}" +
    ".zm-bar button{all:unset;box-sizing:border-box;width:26px;height:26px;display:grid;place-items:center;border-radius:6px;cursor:pointer;color:#475467}" +
    ".zm-bar button:hover{background:#F2F4F7;color:#101828}" +
    ".zm-bar button[data-a=remove]:hover{background:#FEE4E2;color:#B42318}" +
    ".zm-el{position:absolute;pointer-events:none;z-index:2147483000;box-sizing:border-box;border:2px solid " + ACCENT + ";border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,.9),inset 0 0 0 1px rgba(255,255,255,.9)}" +
    ".zm-elhover{position:absolute;pointer-events:none;z-index:2147483000;box-sizing:border-box;border:1.5px dashed " + ACCENT + "99;border-radius:3px}" +
    "[data-zm-el]{cursor:grab}" +
    ".zm-h{position:absolute;z-index:2147483003;width:14px;height:14px;background:#fff;border:2px solid " + ACCENT + ";border-radius:50%;transform:translate(-50%,-50%);cursor:ew-resize;box-sizing:border-box;touch-action:none}" +
    ".zm-tip{position:absolute;z-index:2147483004;background:#101828;color:#fff;font:600 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:4px 7px;border-radius:5px;pointer-events:none;transform:translate(-50%,-140%);white-space:nowrap}" +
    ".zm-drop{position:absolute;z-index:2147483004;height:3px;background:" + ACCENT + ";border-radius:2px;pointer-events:none}" +
    ".zm-bar button[data-a=grip]{cursor:grab;touch-action:none}" +
    ".zm-bar svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}";
  document.head.appendChild(css);

  var hoverBox = el("div", "zm-box zm-hover"), selBox = el("div", "zm-box zm-sel"), chip = el("div", "zm-chip"), bar = el("div", "zm-bar");
  var icons = {
    grip: '<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    duplicate: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    remove: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };
  var titles = { grip: "Drag to reorder", up: "Move up", down: "Move down", duplicate: "Duplicate", remove: "Delete" };
  Object.keys(icons).forEach(function (a) {
    var b = document.createElement("button");
    b.setAttribute("data-a", a); b.title = titles[a]; b.setAttribute("aria-label", titles[a]);
    b.innerHTML = '<svg viewBox="0 0 24 24">' + icons[a] + "</svg>";
    bar.appendChild(b);
  });
  var hE = el("div", "zm-h"), hW = el("div", "zm-h"), tip = el("div", "zm-tip"), drop = el("div", "zm-drop");
  hE.setAttribute("data-h", "e"); hW.setAttribute("data-h", "w");
  [hoverBox, selBox, chip, bar, hE, hW, tip, drop].forEach(function (n) { document.body.appendChild(n); });
  bar.style.display = chip.style.display = selBox.style.display = hoverBox.style.display = hE.style.display = hW.style.display = tip.style.display = drop.style.display = "none";
  var selImgIdx = 0, dragging = false, suppressClick = false, selKey = null, hoverEl = null;
  var elBox = el("div", "zm-el"), elHover = el("div", "zm-elhover");
  document.body.appendChild(elBox); document.body.appendChild(elHover);
  elBox.style.display = elHover.style.display = "none";
  // The visible part of an element: the button itself (not its full-width row), the picture, or the text box.
  function visual(node) {
    if (!node) return null;
    if (node.tagName === "IMG") return node;
    var t = node.querySelector(":scope > table"); return t || node;
  }
  function selNode() {
    var s = find(selectedId);
    if (!s || !selKey) return null;
    return selKey === "image" ? curImg() : s.querySelector('[data-zm-el="' + selKey + '"]');
  }
  function elOf(target) {
    if (!target || !target.closest) return null;
    return target.closest("img[data-zm-img]") || target.closest("[data-zm-el]");
  }
  function keyOf(node) { return node.tagName === "IMG" ? "image" : node.getAttribute("data-zm-el"); }
  function curImg() {
    var s = find(selectedId);
    if (!s) return null;
    var imgs = s.querySelectorAll("img[data-zm-img]");
    return imgs.length ? (imgs[selImgIdx] || imgs[0]) : null;
  }
  function placeHandles() {
    var img = editing ? null : curImg();
    if (!img) { hE.style.display = hW.style.display = "none"; return; }
    var r = rect(img), align = img.getAttribute("data-zm-align") || "center";
    hE.style.display = align === "right" ? "none" : "block";
    hW.style.display = align === "left" ? "none" : "block";
    hE.style.top = hW.style.top = (r.top + r.height / 2) + "px";
    hE.style.left = Math.max(10, r.left + r.width - 9) + "px";
    hW.style.left = (r.left + 9) + "px";
  }

  function el(tag, cls) { var n = document.createElement(tag); n.className = cls; return n; }
  function find(id) { return id ? document.querySelector('[data-block-id="' + CSS.escape(id) + '"]') : null; }
  function rect(node) {
    var r = node.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height };
  }
  function place(box, node) {
    if (!node) { box.style.display = "none"; return null; }
    var r = rect(node);
    box.style.display = "block";
    box.style.top = r.top + "px"; box.style.left = r.left + "px"; box.style.width = r.width + "px"; box.style.height = r.height + "px";
    return r;
  }
  function label(node) {
    var t = (node.getAttribute("data-block-type") || "section").replace(/-/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function layout() {
    var h = hoverId && hoverId !== selectedId ? find(hoverId) : null;
    place(hoverBox, h);
    var s = find(selectedId), r = place(selBox, s);
    if (r && s) {
      chip.style.display = "block"; chip.textContent = label(s);
      chip.style.top = r.top + "px"; chip.style.left = r.left + "px";
      bar.style.display = "flex";
      bar.style.top = Math.max(r.top + 18, window.scrollY + 22) + "px";
      bar.style.left = Math.max(8, r.left + r.width - bar.offsetWidth - 10) + "px";
    } else { chip.style.display = bar.style.display = "none"; }
    var sn = selNode(), vis = sn && !editing ? visual(sn) : null;
    if (vis) { var er = rect(vis); elBox.style.display = "block"; elBox.style.top = er.top - 2 + "px"; elBox.style.left = er.left - 2 + "px"; elBox.style.width = er.width + 4 + "px"; elBox.style.height = er.height + 4 + "px"; selBox.style.opacity = ".35"; }
    else { elBox.style.display = "none"; selBox.style.opacity = "1"; }
    var hv = hoverEl && hoverEl !== sn && !dragging ? visual(hoverEl) : null;
    if (hv) { var hr = rect(hv); elHover.style.display = "block"; elHover.style.top = hr.top - 2 + "px"; elHover.style.left = hr.left - 2 + "px"; elHover.style.width = hr.width + 4 + "px"; elHover.style.height = hr.height + 4 + "px"; }
    else elHover.style.display = "none";
    if (!dragging) placeHandles();
  }
  function blockOf(target) { return target && target.closest ? target.closest("[data-block-id]") : null; }

  document.addEventListener("mouseover", function (e) {
    var b = blockOf(e.target), id = b ? b.getAttribute("data-block-id") : null;
    var he = elOf(e.target);
    if (id !== hoverId || he !== hoverEl) { hoverId = id; hoverEl = he; layout(); }
  });
  document.addEventListener("mouseleave", function () { hoverId = null; layout(); });
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".zm-bar button");
    if (btn) { e.preventDefault(); if (btn.getAttribute("data-a") !== "grip") post({ zm: "action", action: btn.getAttribute("data-a"), id: selectedId }); return; }
    e.preventDefault();
    if (suppressClick) { suppressClick = false; return; }
    var b = blockOf(e.target);
    var id = b ? b.getAttribute("data-block-id") : null;
    var part = null;
    selKey = null;
    if (id) {
      var hit = elOf(e.target);
      if (hit) {
        selKey = keyOf(hit); part = selKey;
        if (selKey === "image") { var all = Array.prototype.slice.call(b.querySelectorAll("img[data-zm-img]")); selImgIdx = Math.max(0, all.indexOf(hit)); }
      } else selImgIdx = 0;
    }
    selectedId = id; layout(); post({ zm: "select", id: id, part: part });
  }, true);
  var editing = null;
  function shownText(node) {
    var clone = node.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll("br")).forEach(function (b) { b.replaceWith("\n"); });
    return clone.textContent || "";
  }
  function stopEditing(commit) {
    if (!editing) return;
    var cur = editing; editing = null;
    cur.node.removeAttribute("contenteditable"); cur.node.style.outline = ""; cur.node.style.cursor = "";
    cur.node.removeEventListener("blur", cur.onBlur);
    cur.node.removeEventListener("keydown", cur.onKey);
    if (!commit) { cur.node.innerHTML = cur.before; return; }
    var value = cur.rich ? cur.node.innerHTML : shownText(cur.node);
    post({ zm: "inlineCommit", id: cur.id, original: cur.originalText, rich: cur.rich, text: value });
  }
  var pending = null;
  document.addEventListener("dblclick", function (e) {
    var b = blockOf(e.target);
    if (!b || (e.target.closest && e.target.closest(".zm-bar"))) return;
    e.preventDefault();
    stopEditing(true);
    var id = b.getAttribute("data-block-id"), type = b.getAttribute("data-block-type");
    selectedId = id; layout(); post({ zm: "select", id: id });
    var candidates = [], n = e.target;
    while (n && n !== b && candidates.length < 6) {
      if (n.nodeType === 1 && (n.textContent || "").trim()) candidates.push(n);
      n = n.parentNode;
    }
    if (type === "text") {
      var wrap = b.querySelector("td > div");
      pending = { id: id, nodes: wrap ? [wrap] : [], rich: true };
      if (wrap) post({ zm: "inlineStart", id: id, texts: [] , rich: true });
      return;
    }
    pending = { id: id, nodes: candidates, rich: false };
    post({ zm: "inlineStart", id: id, texts: candidates.map(shownText), rich: false });
  });
  function beginEdit(node, rich, id) {
    var before = node.innerHTML, originalText = shownText(node);
    var onBlur = function () { stopEditing(true); };
    var onKey = function (ev) {
      ev.stopPropagation();
      if (ev.key === "Escape") { ev.preventDefault(); stopEditing(false); }
      else if (ev.key === "Enter" && !ev.shiftKey && !rich) { ev.preventDefault(); stopEditing(true); }
    };
    node.setAttribute("contenteditable", rich ? "true" : "plaintext-only");
    node.style.outline = "2px dashed " + ACCENT; node.style.cursor = "text";
    node.addEventListener("blur", onBlur); node.addEventListener("keydown", onKey);
    editing = { node: node, rich: rich, id: id, before: before, originalText: originalText, onBlur: onBlur, onKey: onKey };
    node.focus();
    var range = document.createRange(); range.selectNodeContents(node);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  }

  document.addEventListener("dragstart", function (e) { if (e.target && e.target.tagName === "IMG") e.preventDefault(); });
  var gesture = null;
  document.addEventListener("pointerdown", function (e) {
    if (editing || e.button > 0) return;
    var t = e.target;
    var h = t.closest && t.closest(".zm-h");
    var grip = t.closest && t.closest(".zm-bar button[data-a=grip]");
    var img = t.closest && t.closest("img[data-zm-img]");
    if (h) {
      var im = curImg(); if (!im) return;
      e.preventDefault();
      var base = parseFloat(im.getAttribute("data-zm-base")) || im.getBoundingClientRect().width;
      var parentW = im.parentElement ? im.parentElement.getBoundingClientRect().width : base;
      var align = im.getAttribute("data-zm-align") || "center";
      gesture = { kind: "resize", img: im, x: e.clientX, w: im.getBoundingClientRect().width, base: base, limit: Math.min(base, parentW), sign: h.getAttribute("data-h") === "e" ? 1 : -1, mult: align === "center" ? 2 : 1 };
      dragging = true; try { h.setPointerCapture(e.pointerId); } catch (x) {}
    } else if (grip && selectedId) {
      e.preventDefault();
      gesture = { kind: "reorder", id: selectedId, to: null };
      dragging = true; try { grip.setPointerCapture(e.pointerId); } catch (x) {}
    } else if (!img && elOf(t) && blockOf(t)) {
      e.preventDefault();
      var node = elOf(t);
      gesture = { kind: "moveEl", node: node, key: keyOf(node), block: blockOf(t).getAttribute("data-block-id"), x: e.clientX, y: e.clientY, moved: false, x0: parseFloat(node.getAttribute("data-zm-x")) || 0, y0: parseFloat(node.getAttribute("data-zm-y")) || 0 };
    } else if (img && blockOf(img)) {
      e.preventDefault();
      gesture = { kind: "move", img: img, block: blockOf(img).getAttribute("data-block-id"), x: e.clientX, y: e.clientY, moved: false, y0: parseFloat(img.getAttribute("data-zm-y")) || 0 };
    }
  }, true);
  document.addEventListener("pointermove", function (e) {
    if (!gesture) return;
    if (gesture.kind === "resize") {
      var w = gesture.w + gesture.sign * (e.clientX - gesture.x) * gesture.mult;
      w = Math.max(Math.min(40, gesture.limit), Math.min(gesture.limit, w));
      gesture.next = w; gesture.img.style.maxWidth = w + "px";
      var pct = w >= gesture.limit * 0.98 && gesture.limit >= gesture.base * 0.98 ? 100 : Math.round(w / gesture.base * 100);
      gesture.pct = Math.max(10, Math.min(100, pct));
      var r = rect(gesture.img);
      tip.style.display = "block"; tip.textContent = gesture.pct + "%  ·  " + Math.round(w) + "px";
      tip.style.left = (r.left + r.width / 2) + "px"; tip.style.top = (r.top + 8) + "px";
      selBox.style.transition = "none"; layout(); placeHandles();
    } else if (gesture.kind === "move") {
      var dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (!gesture.moved && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (!gesture.moved) {
        gesture.moved = true; dragging = true; suppressClick = true;
        if (selectedId !== gesture.block) {
          selectedId = gesture.block;
          var imgsIn = Array.prototype.slice.call(find(selectedId).querySelectorAll("img[data-zm-img]"));
          selImgIdx = Math.max(0, imgsIn.indexOf(gesture.img));
          layout(); post({ zm: "select", id: selectedId, part: null });
        }
      }
      gesture.dx = dx; gesture.dy = dy;
      gesture.img.style.transform = "translate(" + dx + "px," + dy + "px)"; gesture.img.style.position = "relative";
      var mr = gesture.img.getBoundingClientRect();
      tip.style.display = "block"; tip.textContent = "Move";
      tip.style.left = (mr.left + mr.width / 2 + window.scrollX) + "px"; tip.style.top = (mr.top + window.scrollY + 8) + "px";
      selBox.style.transition = "none"; layout();
    } else if (gesture.kind === "moveEl") {
      var ex = e.clientX - gesture.x, ey = e.clientY - gesture.y;
      if (!gesture.moved && Math.abs(ex) < 5 && Math.abs(ey) < 5) return;
      if (!gesture.moved) {
        gesture.moved = true; dragging = true; suppressClick = true; document.body.style.userSelect = "none";
        var changed = selectedId !== gesture.block || selKey !== gesture.key;
        selectedId = gesture.block; selKey = gesture.key;
        if (changed) { layout(); post({ zm: "select", id: selectedId, part: selKey }); }
      }
      gesture.dx = ex; gesture.dy = ey;
      gesture.node.style.transform = "translate(" + ex + "px," + ey + "px)"; gesture.node.style.position = "relative";
      selBox.style.transition = "none"; layout();
    } else if (gesture.kind === "reorder") {
      var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-block-id]")), y = e.clientY + window.scrollY, idx = nodes.length;
      for (var i = 0; i < nodes.length; i++) { var rr = rect(nodes[i]); if (y < rr.top + rr.height / 2) { idx = i; break; } }
      gesture.to = idx;
      var lineY = idx < nodes.length ? rect(nodes[idx]).top : rect(nodes[nodes.length - 1]).top + rect(nodes[nodes.length - 1]).height;
      var wr = rect(nodes[0]);
      drop.style.display = "block"; drop.style.top = (lineY - 1) + "px"; drop.style.left = wr.left + "px"; drop.style.width = wr.width + "px";
    }
  });
  function endGesture(e) {
    if (!gesture) return;
    var g = gesture; gesture = null; dragging = false; document.body.style.userSelect = "";
    if (g.moved || g.kind === "resize" || g.kind === "reorder") { suppressClick = true; window.setTimeout(function () { suppressClick = false; }, 60); }
    tip.style.display = drop.style.display = "none"; selBox.style.transition = "";
    if (g.kind === "resize") { if (g.pct !== undefined) post({ zm: "setField", id: selectedId, path: "imageWidth", value: String(g.pct) }); }
    else if (g.kind === "moveEl") {
      g.node.style.transform = ""; g.node.style.position = "";
      if (g.moved) post({ zm: "setField", id: g.block, path: "offset:" + g.key, value: Math.round(g.x0 + (g.dx || 0)) + "," + Math.round(g.y0 + (g.dy || 0)) });
    }
    else if (g.kind === "move") {
      var ir = g.img.getBoundingClientRect(), par = g.img.parentElement, pr = par.getBoundingClientRect(), cs = window.getComputedStyle(par);
      g.img.style.transform = ""; g.img.style.position = "";
      if (g.moved) {
        var padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
        var free = pr.width - padL - padR - ir.width, xv = "";
        if (free > 4) {
          var xp = Math.max(0, Math.min(100, (ir.left - (pr.left + padL)) / free * 100));
          if (Math.abs(xp - 50) < 3) xp = 50; else if (xp < 3) xp = 0; else if (xp > 97) xp = 100;
          xv = String(Math.round(xp));
        }
        post({ zm: "setField", id: g.block, path: "imagePos", value: xv + "," + Math.round(g.y0 + (g.dy || 0)) });
      }
    } else if (g.kind === "reorder") {
      var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-block-id]"));
      var from = nodes.findIndex(function (n) { return n.getAttribute("data-block-id") === g.id; });
      if (g.to !== null && from >= 0) { var to = g.to > from ? g.to - 1 : g.to; if (to !== from) post({ zm: "moveTo", id: g.id, index: to }); }
    }
    layout();
  }
  document.addEventListener("pointerup", endGesture);
  document.addEventListener("pointercancel", endGesture);
  document.addEventListener("keydown", function (e) {
    if (editing) return;
    if (e.key === "Escape") { selectedId = null; layout(); post({ zm: "select", id: null }); }
    if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) { e.preventDefault(); post({ zm: "history", dir: e.shiftKey ? "redo" : "undo" }); }
    if (selectedId && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); post({ zm: "action", action: "remove", id: selectedId }); }
  });
  window.addEventListener("scroll", function () { layout(); post({ zm: "scroll", y: window.scrollY }); }, { passive: true });
  window.addEventListener("resize", layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(document.body);
  window.addEventListener("load", layout);

  window.addEventListener("message", function (e) {
    if (e.source !== parentWin) return;
    var m = e.data || {};
    if (m.zm === "inlineBegin" && pending && pending.id === m.id) {
      var node = pending.nodes[m.index || 0];
      if (node) beginEdit(node, !!m.rich, m.id);
      pending = null;
    }
    if (m.zm === "select") { if ((m.id || null) !== selectedId) selKey = null; selectedId = m.id || null; layout(); }
    if (m.zm === "scrollTo") { var n = find(m.id); if (n) { var r = rect(n); window.scrollTo({ top: Math.max(0, r.top - 60), behavior: "smooth" }); } }
    if (m.zm === "patch" && typeof m.html === "string" && !editing) {
      // Swap the email content in place (no iframe reload, so no flash and the scroll position is kept).
      var next = new DOMParser().parseFromString(m.html, "text/html");
      var keep = function (n) { return n.nodeType === 1 && (n.classList.contains("zm-box") || n.classList.contains("zm-chip") || n.classList.contains("zm-bar") || n.classList.contains("zm-h") || n.classList.contains("zm-el") || n.classList.contains("zm-elhover") || n.classList.contains("zm-tip") || n.classList.contains("zm-drop") || n.tagName === "SCRIPT"); };
      Array.prototype.slice.call(document.body.childNodes).forEach(function (n) { if (!keep(n)) document.body.removeChild(n); });
      var first = document.body.firstChild;
      Array.prototype.slice.call(next.body.childNodes).forEach(function (n) {
        if (n.nodeType === 1 && n.tagName === "SCRIPT") return;
        document.body.insertBefore(document.importNode(n, true), first);
      });
      document.body.setAttribute("style", next.body.getAttribute("style") || "");
      var oldLink = document.head.querySelector("link[rel=stylesheet]"), newLink = next.head.querySelector("link[rel=stylesheet]");
      if ((oldLink && oldLink.getAttribute("href")) !== (newLink && newLink.getAttribute("href"))) {
        if (oldLink) oldLink.remove();
        if (newLink) document.head.appendChild(document.importNode(newLink, true));
      }
      if (selectedId && !find(selectedId)) { selectedId = null; selKey = null; }
      layout();
    }
    if (m.zm === "restore") { window.scrollTo(0, m.y || 0); selectedId = m.id || selectedId; layout(); }
  });
  post({ zm: "ready" });
})();
`;
