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
    ".zm-sel{border:2px solid " + ACCENT + "}" +
    ".zm-chip{position:absolute;z-index:2147483001;transform:translateY(-100%);background:" + ACCENT + ";color:#fff;font:600 11px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;letter-spacing:.02em;padding:5px 8px;border-radius:5px 5px 0 0;pointer-events:none;white-space:nowrap}" +
    ".zm-bar{position:absolute;z-index:2147483002;display:flex;gap:1px;background:#fff;border:1px solid #D9DEE8;border-radius:8px;box-shadow:0 4px 14px rgba(16,24,40,.14);padding:2px;transform:translateY(-50%)}" +
    ".zm-bar button{all:unset;box-sizing:border-box;width:26px;height:26px;display:grid;place-items:center;border-radius:6px;cursor:pointer;color:#475467}" +
    ".zm-bar button:hover{background:#F2F4F7;color:#101828}" +
    ".zm-bar button[data-a=remove]:hover{background:#FEE4E2;color:#B42318}" +
    ".zm-bar svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}";
  document.head.appendChild(css);

  var hoverBox = el("div", "zm-box zm-hover"), selBox = el("div", "zm-box zm-sel"), chip = el("div", "zm-chip"), bar = el("div", "zm-bar");
  var icons = {
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    duplicate: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
    remove: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'
  };
  var titles = { up: "Move up", down: "Move down", duplicate: "Duplicate", remove: "Delete" };
  Object.keys(icons).forEach(function (a) {
    var b = document.createElement("button");
    b.setAttribute("data-a", a); b.title = titles[a]; b.setAttribute("aria-label", titles[a]);
    b.innerHTML = '<svg viewBox="0 0 24 24">' + icons[a] + "</svg>";
    bar.appendChild(b);
  });
  [hoverBox, selBox, chip, bar].forEach(function (n) { document.body.appendChild(n); });
  bar.style.display = chip.style.display = selBox.style.display = hoverBox.style.display = "none";

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
  }
  function blockOf(target) { return target && target.closest ? target.closest("[data-block-id]") : null; }

  document.addEventListener("mouseover", function (e) {
    var b = blockOf(e.target), id = b ? b.getAttribute("data-block-id") : null;
    if (id !== hoverId) { hoverId = id; layout(); }
  });
  document.addEventListener("mouseleave", function () { hoverId = null; layout(); });
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".zm-bar button");
    if (btn) { e.preventDefault(); post({ zm: "action", action: btn.getAttribute("data-a"), id: selectedId }); return; }
    e.preventDefault();
    var b = blockOf(e.target);
    var id = b ? b.getAttribute("data-block-id") : null;
    selectedId = id; layout(); post({ zm: "select", id: id });
  }, true);
  document.addEventListener("keydown", function (e) {
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
    if (m.zm === "select") { selectedId = m.id || null; layout(); }
    if (m.zm === "scrollTo") { var n = find(m.id); if (n) { var r = rect(n); window.scrollTo({ top: Math.max(0, r.top - 60), behavior: "smooth" }); } }
    if (m.zm === "patch" && typeof m.html === "string") {
      // Swap the email content in place (no iframe reload, so no flash and the scroll position is kept).
      var next = new DOMParser().parseFromString(m.html, "text/html");
      var keep = function (n) { return n.nodeType === 1 && (n.classList.contains("zm-box") || n.classList.contains("zm-chip") || n.classList.contains("zm-bar") || n.tagName === "SCRIPT"); };
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
      if (selectedId && !find(selectedId)) selectedId = null;
      layout();
    }
    if (m.zm === "restore") { window.scrollTo(0, m.y || 0); selectedId = m.id || selectedId; layout(); }
  });
  post({ zm: "ready" });
})();
`;
