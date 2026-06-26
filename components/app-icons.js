(() => {
  const NS = "http://www.w3.org/2000/svg";
  const iconPaths = {
    "arrow-left": ['<path d="M19 12H5"/>', '<path d="m12 19-7-7 7-7"/>'],
    "badge-percent": ['<path d="M9 9h.01"/>', '<path d="M15 15h.01"/>', '<path d="m15 9-6 6"/>', '<path d="M12 3l2.2 1.3 2.5-.3.9 2.4 2.1 1.5-.9 2.4.9 2.4-2.1 1.5-.9 2.4-2.5-.3L12 21l-2.2-1.3-2.5.3-.9-2.4-2.1-1.5.9-2.4-.9-2.4 2.1-1.5.9-2.4 2.5.3L12 3z"/>'],
    "briefcase": ['<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/>', '<rect x="3" y="6" width="18" height="14" rx="2"/>', '<path d="M3 12h18"/>'],
    "briefcase-business": ['<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/>', '<rect x="3" y="6" width="18" height="14" rx="2"/>', '<path d="M3 12h18"/>'],
    "calculator": ['<rect x="5" y="3" width="14" height="18" rx="2"/>', '<path d="M8 7h8"/>', '<path d="M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01"/>'],
    "check": ['<path d="m5 12 4 4L19 6"/>'],
    "chevron-left": ['<path d="m15 18-6-6 6-6"/>'],
    "chevron-right": ['<path d="m9 18 6-6-6-6"/>'],
    "circle-help": ['<circle cx="12" cy="12" r="10"/>', '<path d="M9.1 9a3 3 0 1 1 5.8 1c-.6 1-1.8 1.4-2.2 2.2"/>', '<path d="M12 17h.01"/>'],
    "container": ['<path d="M3 7h18v10H3z"/>', '<path d="M3 11h18"/>', '<path d="M7 7v10M11 7v10M15 7v10"/>'],
    "copy": ['<rect x="8" y="8" width="11" height="11" rx="2"/>', '<path d="M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'],
    "download": ['<path d="M12 3v12"/>', '<path d="m7 10 5 5 5-5"/>', '<path d="M5 21h14"/>'],
    "external-link": ['<path d="M14 3h7v7"/>', '<path d="M10 14 21 3"/>', '<path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'],
    "factory": ['<path d="M3 21h18"/>', '<path d="M5 21V8l5 3V8l5 3V5h4v16"/>', '<path d="M9 17h1M13 17h1"/>'],
    "file-text": ['<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>', '<path d="M14 2v6h6"/>', '<path d="M8 13h8M8 17h6"/>'],
    "flag": ['<path d="M4 22V4"/>', '<path d="M4 4h13l-1 4 1 4H4"/>'],
    "heart": ['<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>'],
    "layout-grid": ['<rect x="3" y="3" width="7" height="7" rx="1"/>', '<rect x="14" y="3" width="7" height="7" rx="1"/>', '<rect x="3" y="14" width="7" height="7" rx="1"/>', '<rect x="14" y="14" width="7" height="7" rx="1"/>'],
    "layers": ['<path d="m12 2 10 5-10 5L2 7l10-5z"/>', '<path d="m2 17 10 5 10-5"/>', '<path d="m2 12 10 5 10-5"/>'],
    "lock": ['<rect x="5" y="11" width="14" height="10" rx="2"/>', '<path d="M8 11V8a4 4 0 0 1 8 0v3"/>'],
    "mail": ['<rect x="3" y="5" width="18" height="14" rx="2"/>', '<path d="m3 7 9 6 9-6"/>'],
    "message-square-text": ['<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>', '<path d="M8 8h8M8 12h6"/>'],
    "messages-square": ['<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>', '<path d="M7 8h10M7 12h6"/>'],
    "minus": ['<path d="M5 12h14"/>'],
    "phone": ['<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>'],
    "plus": ['<path d="M12 5v14"/>', '<path d="M5 12h14"/>'],
    "package": ['<path d="m21 8-9-5-9 5 9 5 9-5z"/>', '<path d="M3 8v8l9 5 9-5V8"/>', '<path d="M12 13v8"/>'],
    "package-check": ['<path d="m16 16 2 2 4-4"/>', '<path d="M21 10V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l2-1.1"/>', '<path d="M3.3 7 12 12l8.7-5"/>', '<path d="M12 22V12"/>'],
    "panel-top": ['<rect x="3" y="4" width="18" height="16" rx="2"/>', '<path d="M3 9h18"/>'],
    "refresh-cw": ['<path d="M21 12a9 9 0 0 1-15.5 6.4"/>', '<path d="M3 12A9 9 0 0 1 18.5 5.6"/>', '<path d="M18 2v5h-5"/>', '<path d="M6 22v-5h5"/>'],
    "rotate-ccw": ['<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>', '<path d="M3 3v5h5"/>'],
    "save": ['<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>', '<path d="M17 21v-8H7v8"/>', '<path d="M7 3v5h8"/>'],
    "search": ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
    "send": ['<path d="m22 2-7 20-4-9-9-4 20-7z"/>'],
    "settings": ['<circle cx="12" cy="12" r="3"/>', '<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/>'],
    "shield": ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'],
    "shopping-bag": ['<path d="M6 7h12l1 14H5L6 7z"/>', '<path d="M9 7a3 3 0 0 1 6 0"/>'],
    "shopping-basket": ['<path d="M5 11h14l-1.5 9h-11L5 11z"/>', '<path d="m8 11 4-7 4 7"/>'],
    "shopping-cart": ['<circle cx="9" cy="21" r="1"/>', '<circle cx="20" cy="21" r="1"/>', '<path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 6H6"/>'],
    "sliders-horizontal": ['<path d="M3 6h18"/>', '<path d="M3 12h18"/>', '<path d="M3 18h18"/>', '<circle cx="8" cy="6" r="2"/>', '<circle cx="16" cy="12" r="2"/>', '<circle cx="10" cy="18" r="2"/>'],
    "square-stack": ['<rect x="7" y="7" width="10" height="10" rx="1"/>', '<path d="M4 4h10M4 4v10M10 20h10M20 10v10"/>'],
    "tag": ['<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/>', '<path d="M7 7h.01"/>'],
    "trash-2": ['<path d="M3 6h18"/>', '<path d="M8 6V4h8v2"/>', '<path d="M19 6l-1 15H6L5 6"/>', '<path d="M10 11v6M14 11v6"/>'],
    "upload": ['<path d="M12 21V9"/>', '<path d="m7 14 5-5 5 5"/>', '<path d="M5 3h14"/>'],
    "user": ['<circle cx="12" cy="8" r="4"/>', '<path d="M4 21a8 8 0 0 1 16 0"/>'],
    "user-check": ['<circle cx="9" cy="8" r="4"/>', '<path d="M2 21a7 7 0 0 1 12 0"/>', '<path d="m16 11 2 2 4-4"/>'],
    "wifi-off": ['<path d="m2 2 20 20"/>', '<path d="M8.5 16.5a5 5 0 0 1 7 0"/>', '<path d="M2 8.8a15 15 0 0 1 8.2-3.6"/>', '<path d="M14 5.3A15 15 0 0 1 22 8.8"/>'],
    "x": ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
  };
  const fallback = ['<circle cx="12" cy="12" r="8"/>'];

  function toKebab(name) {
    return String(name || "circle").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  }

  function createIconNode(name) {
    const svg = document.createElementNS(NS, "svg");
    const iconName = toKebab(name);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("lucide", `lucide-${iconName}`);
    svg.dataset.lucide = iconName;
    svg.innerHTML = (iconPaths[iconName] || fallback).join("");
    return svg;
  }

  function createIcons(options = {}) {
    const root = options.root || document;
    root.querySelectorAll?.("i[data-lucide]:not([data-lucide-enhanced])").forEach((icon) => {
      const svg = createIconNode(icon.dataset.lucide);
      icon.dataset.lucideEnhanced = "true";
      icon.replaceWith(svg);
    });
  }

  window.lucide = window.lucide || {};
  window.lucide.createIcons = createIcons;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => createIcons(), { once: true });
  } else {
    createIcons();
  }
})();
