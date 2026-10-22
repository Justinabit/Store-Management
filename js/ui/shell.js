/*
 * The app shell: left navigation, top bar (page title, breadcrumb, one-line
 * description), the text-size control, the compact menu for small screens,
 * and the goodbye screen shown after Exit.
 */

/** Every screen registers itself here (see the files in js/ui/). */
const Screens = {};

const Shell = (function () {
  const TEXT_SIZE_KEY = 'sari-sari-store-text-size';
  /** Smaller, normal, larger, largest (percent of the browser's text size). */
  const TEXT_SIZES = [87.5, 100, 120, 140];

  /**
   * From this width up (in rem, so it grows with the text size) the menu sits
   * beside the page. Below it, the phone layout is used: an app bar with a
   * Menu button that opens the menu full screen.
   */
  const WIDE_FROM_REM = 60;

  let appEl;
  let navOpen = false;

  function init() {
    appEl = document.getElementById('app');

    document.querySelectorAll('[data-logo]').forEach(function (el) {
      el.appendChild(Icons.logo());
    });

    // Icons for every navigation item (the text labels are already in the HTML).
    document.querySelectorAll('[data-icon]').forEach(function (el) {
      const iconEl = Icons.get(el.getAttribute('data-icon'));
      const node = el.classList.contains('nav-link') ? UI.h('span', { class: 'nav-icon' }, iconEl) : iconEl;
      el.insertBefore(node, el.firstChild);
    });

    initTextSize();

    document.getElementById('menu-btn').addEventListener('click', openNav);
    document.getElementById('nav-close').addEventListener('click', closeNav);
    window.addEventListener('resize', updateLayout);
    updateLayout();
  }

  // ----- Page header ----------------------------------------------------

  /**
   * Sets the title (h1), the one-sentence description, the breadcrumb and
   * the highlighted navigation item for the current screen.
   */
  function setPage(page) {
    document.getElementById('page-title').textContent = page.title;
    document.getElementById('page-lead').textContent = page.lead || '';
    document.title = page.title + ' - Sari-Sari Store';

    const crumbHolder = document.getElementById('breadcrumb');
    UI.clear(crumbHolder);
    if (page.breadcrumb && page.breadcrumb.length) {
      crumbHolder.hidden = false;
      crumbHolder.appendChild(UI.h('ol', null, page.breadcrumb.map(function (crumb, i) {
        const last = i === page.breadcrumb.length - 1;
        return UI.h('li', null, last
          ? UI.h('span', { 'aria-current': 'page', text: crumb.label })
          : UI.h('a', { href: crumb.href, text: crumb.label }));
      })));
    } else {
      crumbHolder.hidden = true;
    }

    document.querySelectorAll('.nav-link[data-nav]').forEach(function (link) {
      if (link.getAttribute('data-nav') === page.nav) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // ----- Text size (the only preference that is remembered) -------------

  function initTextSize() {
    let saved = 100;
    try {
      saved = parseFloat(window.localStorage.getItem(TEXT_SIZE_KEY)) || 100;
    } catch (e) {
      saved = 100;   // storage may be blocked; the app works without it
    }
    if (TEXT_SIZES.indexOf(saved) === -1) {
      saved = 100;
    }
    document.querySelectorAll('[data-text-size]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTextSize(parseFloat(btn.getAttribute('data-text-size')), true);
      });
    });
    applyTextSize(saved, false);
  }

  function applyTextSize(percent, remember) {
    document.documentElement.style.fontSize = percent + '%';
    document.querySelectorAll('[data-text-size]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(parseFloat(btn.getAttribute('data-text-size')) === percent));
    });
    if (remember) {
      try {
        window.localStorage.setItem(TEXT_SIZE_KEY, String(percent));
      } catch (e) {
        // Not saved: the choice still applies for this visit.
      }
    }
    updateLayout();
  }

  // ----- Layout and the phone menu ---------------------------------------

  function updateLayout() {
    const rootPx = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    const wide = window.innerWidth >= WIDE_FROM_REM * rootPx;
    document.documentElement.classList.toggle('is-wide', wide);
    if (wide && navOpen) {
      closeNav(false);
    }
    // Keep the menu in view while scrolling only if all of it fits on the screen.
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('sidebar--sticky');
    if (wide && sidebar.offsetHeight <= window.innerHeight - 2 * 1.5 * rootPx) {
      sidebar.classList.add('sidebar--sticky');
    }
  }

  function openNav() {
    navOpen = true;
    appEl.classList.add('nav-open');
    document.body.classList.add('nav-locked');
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'true');
    const current = document.querySelector('.nav-link[aria-current="page"]') || document.querySelector('.nav-link');
    current.focus();
  }

  function closeNav(returnFocus) {
    if (!navOpen) {
      return;
    }
    navOpen = false;
    appEl.classList.remove('nav-open');
    document.body.classList.remove('nav-locked');
    const menuBtn = document.getElementById('menu-btn');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus !== false) {
      menuBtn.focus();
    }
  }

  function isNavOpen() {
    return navOpen;
  }

  // ----- Goodbye screen -------------------------------------------------

  function showGoodbye() {
    closeNav(false);
    appEl.hidden = true;
    document.getElementById('goodbye').hidden = false;
    document.title = 'Goodbye - Sari-Sari Store';
    document.getElementById('goodbye-title').focus();
  }

  function hideGoodbye() {
    document.getElementById('goodbye').hidden = true;
    appEl.hidden = false;
  }

  return {
    init: init,
    setPage: setPage,
    closeNav: closeNav,
    isNavOpen: isNavOpen,
    showGoodbye: showGoodbye,
    hideGoodbye: hideGoodbye
  };
})();
