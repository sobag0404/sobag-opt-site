(() => {
  function uniqueTextList(values, limit = 10, itemLimit = 240) {
    return [
      ...new Set(
        (Array.isArray(values) ? values : [])
          .map((item) => String(item || "").trim().slice(0, itemLimit))
          .filter(Boolean)
      ),
    ].slice(0, limit);
  }
  
  function imageAttrs(width, height, loading = "lazy") {
    return `width="${width}" height="${height}" loading="${loading}" decoding="async"`;
  }
  
  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  
  function pulseNode(node, className = "is-pop") {
    if (!node || prefersReducedMotion()) return;
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }
  
  function setTextWithPop(node, value) {
    if (!node) return;
    const next = String(value);
    const changed = node.dataset.motionValue !== undefined && node.dataset.motionValue !== next;
    node.textContent = next;
    node.dataset.motionValue = next;
    if (changed) pulseNode(node);
  }
  
  function routeKey(pathname = window.location.pathname) {
    const cleanPath = pathname.replace(/\/+$/, "");
    const lastPart = cleanPath.split("/").filter(Boolean).pop() || "index";
    return lastPart.replace(/\.html$/i, "") || "index";
  }
  
  function navigateWithinSite(url) {
    const targetUrl = new URL(url, window.location.href);
    if (targetUrl.origin !== window.location.origin) {
      window.location.href = targetUrl.href;
      return;
    }
    if (routeKey(targetUrl.pathname) === routeKey(window.location.pathname)) {
      if (targetUrl.hash) document.querySelector(targetUrl.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = targetUrl.href;
  }

  window.SobagCartUtils = Object.freeze({
    uniqueTextList,
    imageAttrs,
    prefersReducedMotion,
    pulseNode,
    setTextWithPop,
    routeKey,
    navigateWithinSite
  });
})();
