/*
 * Startup and the router (the GUI version of Main.run() and its menu loop).
 *
 * Screens are addressed with the page address after "#", for example
 * #/cash-sale or #/customer/Aling%20Nena, so the browser's Back button works.
 * Leaving a step-by-step screen before its final confirmation records nothing.
 */
const App = (function () {
  let session = null;
  let current = null;        // { name, onCancel }
  let pending = null;        // messages and data handed to the next screen

  /** Small UI states kept for this session only (never saved). */
  const state = {
    sampleNoticeHidden: false,
    sortOrder: 'name',
    customerView: 'all'
  };

  function start() {
    session = SampleData.createSession();
    Shell.init();

    window.addEventListener('hashchange', function () {
      render(true);
    });
    document.addEventListener('keydown', onKeyDown);

    // A link to the screen that is already open starts that screen again
    // (the address does not change, so the browser would otherwise do nothing).
    document.addEventListener('click', function (event) {
      const link = event.target.closest('a[href^="#/"]');
      if (link && link.getAttribute('href') === window.location.hash) {
        event.preventDefault();
        render(true);
      }
    });
    document.getElementById('exit-btn').addEventListener('click', requestExit);
    document.getElementById('new-session-btn').addEventListener('click', startNewSession);

    // A reload loses everything, so warn once something has been recorded.
    window.addEventListener('beforeunload', function (event) {
      if (session && session.hasChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    });

    render(false);
  }

  function getSession() {
    return session;
  }

  /** Reads "#/name/argument?key=value" from the address. */
  function parseHash() {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const queryAt = raw.indexOf('?');
    const path = queryAt === -1 ? raw : raw.slice(0, queryAt);
    const query = new URLSearchParams(queryAt === -1 ? '' : raw.slice(queryAt + 1));
    const parts = path.split('/');
    let name = '';
    let arg = '';
    try {
      name = decodeURIComponent(parts[0] || '');
      arg = decodeURIComponent(parts.slice(1).join('/'));
    } catch (e) {
      name = 'home';
    }
    return { name: Screens[name] ? name : 'home', arg: arg, query: query };
  }

  function render(moveFocus) {
    if (!session) {
      return;   // the program has exited; only "Start a new session" is available
    }
    const route = parseHash();
    const screen = Screens[route.name];
    const handoff = pending || {};
    pending = null;
    route.data = handoff.data || {};

    Shell.closeNav(false);
    Shell.setPage({ title: screen.title, lead: screen.lead, nav: screen.nav, breadcrumb: null });

    const messages = document.getElementById('page-messages');
    UI.clear(messages);
    (handoff.flash || []).forEach(function (m) {
      messages.appendChild(UI.message(m.kind, m.text));
    });

    const main = document.getElementById('screen');
    UI.clear(main);
    main.className = 'screen';
    void main.offsetWidth;      // restart the short fade-in for the new screen
    main.className = 'screen screen--' + route.name;

    const handle = screen.render(main, route) || {};
    current = { name: route.name, onCancel: handle.onCancel || null };

    if (moveFocus) {
      window.scrollTo(0, 0);
      UI.focusPageHeading();
    }
  }

  /**
   * Opens a screen. opts.flash = [{ kind, text }] shows messages at the top
   * of that screen; opts.data is handed to the screen's render().
   */
  function go(path, opts) {
    pending = opts || null;
    const hash = '#/' + path;
    if (window.location.hash === hash) {
      render(true);
    } else {
      window.location.hash = hash;
    }
  }

  /** The GUI version of typing X: back to Home, and nothing was changed. */
  function cancel(text) {
    go('home', { flash: [{ kind: 'info', text: text || 'Cancelled. No records were changed.' }] });
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape') {
      return;
    }
    if (document.querySelector('dialog[open]')) {
      return;                       // the dialog answers "No" by itself
    }
    if (Shell.isNavOpen()) {
      event.preventDefault();
      Shell.closeNav();
      return;
    }
    if (current && current.onCancel) {
      event.preventDefault();
      current.onCancel();
    }
  }

  // ----- 12. Exit ---------------------------------------------------------

  function requestExit() {
    UI.confirmDialog({
      title: 'Exit',
      message: 'Exit the program? All changes from this session will be lost.',
      confirmLabel: 'Yes, exit the program',
      confirmIcon: 'exit',
      cancelLabel: 'No, keep working',
      danger: true
    }).then(function (yes) {
      if (yes) {
        session = null;             // all records are cleared, like the console program ending
        current = null;
        Shell.showGoodbye();
      } else {
        document.getElementById('exit-btn').focus();
      }
    });
  }

  function startNewSession() {
    session = SampleData.createSession();
    state.sampleNoticeHidden = false;
    state.sortOrder = 'name';
    state.customerView = 'all';
    Shell.hideGoodbye();
    if (window.location.hash === '#/home') {
      render(true);
    } else {
      window.location.hash = '#/home';
    }
  }

  return {
    state: state,
    start: start,
    getSession: getSession,
    go: go,
    cancel: cancel,
    requestExit: requestExit
  };
})();

document.addEventListener('DOMContentLoaded', App.start);
