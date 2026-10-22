/*
 * One consistent set of line icons (24x24, 1.9px stroke, rounded ends),
 * drawn by hand for this project. Icons are always decorative: every
 * button and link also has a visible text label.
 */
const Icons = (function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const PATHS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v10.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V9"/>',
    bag: '<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
    notebook: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v18"/><path d="M12.5 8h3.5M12.5 12h3.5"/>',
    wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><rect x="4" y="7.5" width="16" height="12" rx="2.5"/><path d="M20 12h-3.5a1.75 1.75 0 0 0 0 3.5H20"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.75"/><path d="M6 9.5h.01M18 14.5h.01"/>',
    box: '<path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
    boxPlus: '<path d="M20 11V7.5L12 3 4 7.5v9l8 4.5"/><path d="M4 7.5 12 12l8-4.5"/><path d="M12 12v9"/><path d="M18 14.5v6M15 17.5h6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
    sort: '<path d="M4 6h9M4 12h6M4 18h3"/><path d="M17.5 5v14"/><path d="m14.5 16 3 3 3-3"/>',
    alert: '<path d="M10.3 4 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.2 14.2a6.5 6.5 0 0 1 3.3 5.8"/>',
    userSearch: '<circle cx="10" cy="8" r="4"/><path d="M3 20.5a7 7 0 0 1 10.6-6"/><circle cx="17.5" cy="17.5" r="2.75"/><path d="m21.5 21.5-2-2"/>',
    userPlus: '<circle cx="10" cy="8" r="4"/><path d="M3 20.5a7 7 0 0 1 12.2-4.7"/><path d="M19 14v6M16 17h6"/>',
    report: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 16v-3.5M12 16V8M16 16v-5.5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    exit: '<path d="M10 20.5H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5h4"/><path d="m15.5 16.5 4.5-4.5-4.5-4.5"/><path d="M20 12H9.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.7 2.7L16 9.8"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6h.01"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    chevronRight: '<path d="m9.5 6 6 6-6 6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
    tag: '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7z"/><circle cx="8.5" cy="8.5" r="1.5"/>',
    layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 9.5h5v5h-5z"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    restart: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };

  /** Returns a decorative <svg> icon element. */
  function get(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'icon');
    svg.innerHTML = PATHS[name] || PATHS.info;
    return svg;
  }

  /** The store's logo mark: a small shop with a striped awning. */
  function logo() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML =
      '<rect x="9" y="21" width="30" height="20" rx="2.5" fill="#fff" stroke="#1B2250" stroke-width="2.4"/>' +
      '<rect x="27" y="28" width="7" height="13" rx="1" fill="#DCE1FB" stroke="#1B2250" stroke-width="2.4"/>' +
      '<rect x="14" y="28" width="9" height="7" rx="1" fill="#E3F1E8" stroke="#1B2250" stroke-width="2.4"/>' +
      '<path d="M8 7h32l4 11H4z" fill="#3A47C2"/>' +
      '<path d="M15 7h6l-1 11h-7zM27 7h6l3 11h-7z" fill="#DCE1FB"/>' +
      '<path d="M4 18a5 5 0 0 0 10 0a5 5 0 0 0 10 0a5 5 0 0 0 10 0a5 5 0 0 0 10 0" fill="#3A47C2"/>' +
      '<path d="M14 18a5 5 0 0 0 10 0M34 18a5 5 0 0 0 10 0" fill="#DCE1FB"/>' +
      '<path d="M8 7h32l4 11a5 5 0 0 1-10 0a5 5 0 0 1-10 0a5 5 0 0 1-10 0a5 5 0 0 1-10 0z" fill="none" stroke="#1B2250" stroke-width="2.4" stroke-linejoin="round"/>';
    return svg;
  }

  return { get: get, logo: logo };
})();
