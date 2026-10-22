/*
 * Small, reusable building blocks for the screens. Every element is made
 * with document.createElement and textContent, so product and customer
 * names are always shown as plain text (never as HTML).
 */
const UI = (function () {

  // ----- Element helpers ------------------------------------------------

  /**
   * Creates an element. props may contain: class, text, on<Event> handlers,
   * and any attribute. children may be nodes, strings, or arrays of them.
   */
  function h(tag, props, children) {
    const el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        const value = props[key];
        if (value === null || value === undefined || value === false) {
          return;
        }
        if (key === 'class') {
          el.className = value;
        } else if (key === 'text') {
          el.textContent = value;
        } else if (key.indexOf('on') === 0 && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
          el.setAttribute(key, '');
        } else {
          el.setAttribute(key, String(value));
        }
      });
    }
    append(el, children);
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined || children === false) {
      return el;
    }
    if (!Array.isArray(children)) {
      children = [children];
    }
    children.forEach(function (child) {
      if (child === null || child === undefined || child === false) {
        return;
      }
      if (Array.isArray(child)) {
        append(el, child);
      } else if (typeof child === 'string' || typeof child === 'number') {
        el.appendChild(document.createTextNode(String(child)));
      } else {
        el.appendChild(child);
      }
    });
    return el;
  }

  function clear(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function icon(name) {
    return Icons.get(name);
  }

  function srOnly(text) {
    return h('span', { class: 'sr-only', text: text });
  }

  let idCounter = 0;
  function uid(prefix) {
    idCounter++;
    return (prefix || 'id') + '-' + idCounter;
  }

  // ----- Buttons --------------------------------------------------------

  /** A real <button> with an icon and a visible text label. */
  function button(opts) {
    const btn = h('button', Object.assign({
      type: opts.type || 'button',
      class: 'btn btn--' + (opts.variant || 'secondary') + (opts.extraClass ? ' ' + opts.extraClass : ''),
      onClick: opts.onClick
    }, opts.attrs || {}));
    if (opts.icon) {
      btn.appendChild(icon(opts.icon));
    }
    btn.appendChild(h('span', { text: opts.label }));
    if (opts.iconRight) {
      btn.appendChild(icon(opts.iconRight));
    }
    return btn;
  }

  /** A link that looks like a button (used for moving between screens). */
  function linkButton(opts) {
    const link = h('a', {
      href: opts.href,
      class: 'btn btn--' + (opts.variant || 'secondary')
    });
    if (opts.icon) {
      link.appendChild(icon(opts.icon));
    }
    link.appendChild(h('span', { text: opts.label }));
    if (opts.iconRight) {
      link.appendChild(icon(opts.iconRight));
    }
    return link;
  }

  function buttonRow(buttons) {
    return h('div', { class: 'btn-row' }, buttons);
  }

  // ----- Messages -------------------------------------------------------

  const MESSAGE_KINDS = {
    success: { icon: 'checkCircle', label: 'Success:' },
    info: { icon: 'info', label: 'Information:' },
    warning: { icon: 'alert', label: 'Warning:' },
    error: { icon: 'xCircle', label: 'Error:' }
  };

  /**
   * A message with an icon AND text. It stays until the person closes it
   * (never auto-dismissed). Errors use role="alert"; others are announced
   * through the shared live region.
   */
  function message(kind, text, opts) {
    opts = opts || {};
    const info = MESSAGE_KINDS[kind] || MESSAGE_KINDS.info;
    const box = h('div', { class: 'msg msg--' + kind, role: kind === 'error' ? 'alert' : null });
    box.appendChild(h('span', { class: 'msg-icon' }, icon(info.icon)));

    const textEl = h('p', { class: 'msg-text' }, [opts.plainLabel ? null : srOnly(info.label + ' '), opts.tag ? h('span', { class: 'msg-tag', text: opts.tag }) : null, text]);
    if (opts.detail) {
      textEl.appendChild(h('span', { class: 'msg-detail', text: opts.detail }));
    }
    box.appendChild(textEl);

    if (opts.closable !== false) {
      const close = h('button', {
        type: 'button',
        class: 'msg-close',
        onClick: function () {
          box.remove();
          if (opts.onClose) {
            opts.onClose();
          }
          focusPageHeading();
        }
      }, [icon('x'), h('span', { text: opts.closeLabel || 'Close' })]);
      box.appendChild(close);
    }

    if (kind !== 'error' && opts.announce !== false) {
      announce(text + (opts.detail ? ' ' + opts.detail : ''));
    }
    return box;
  }

  /** A calm "nothing here" box, using the program's own empty-state wording. */
  function emptyState(text) {
    return h('p', { class: 'empty' }, [icon('info'), h('span', { text: text })]);
  }

  /** The small grey line that says which search algorithm found the result. */
  function methodCaption(text) {
    return h('p', { class: 'method-caption', text: text });
  }

  /**
   * Writes text into the hidden live region so screen readers read it once.
   * Messages added at the same moment are read together, in order.
   */
  let pendingAnnouncements = [];
  function announce(text) {
    const region = document.getElementById('sr-announcer');
    if (!region) {
      return;
    }
    pendingAnnouncements.push(text);
    if (pendingAnnouncements.length > 1) {
      return;                    // already scheduled
    }
    region.textContent = '';
    window.setTimeout(function () {
      region.textContent = pendingAnnouncements.join(' ');
      pendingAnnouncements = [];
    }, 80);
  }

  function focusPageHeading() {
    const heading = document.getElementById('page-title');
    if (heading) {
      heading.focus();
    }
  }

  // ----- Status pills ---------------------------------------------------

  const PILL_STYLES = {
    'OK': { cls: 'pill--ok', icon: 'check' },
    'LOW': { cls: 'pill--low', icon: 'alert' },
    'OUT OF STOCK': { cls: 'pill--out', icon: 'xCircle' },
    'ACTIVE': { cls: 'pill--ok', icon: 'check' },
    'UNDONE': { cls: 'pill--neutral', icon: 'undo' }
  };

  function statusPill(status) {
    const style = PILL_STYLES[status] || { cls: 'pill--neutral', icon: 'info' };
    return h('span', { class: 'pill ' + style.cls }, [icon(style.icon), h('span', { text: status })]);
  }

  const TYPE_ICONS = { CASH_SALE: 'bag', UTANG: 'notebook', PAYMENT: 'wallet' };

  function typePill(type) {
    return h('span', { class: 'pill pill--type' }, [icon(TYPE_ICONS[type.key] || 'receipt'), h('span', { text: type.label })]);
  }

  /** OUT OF STOCK (0), LOW (1 to 5) or OK, exactly as the console program. */
  function stockStatus(product) {
    if (product.getStock() === 0) {
      return 'OUT OF STOCK';
    }
    if (product.isLowStock(StoreSession.LOW_STOCK_LIMIT)) {
      return 'LOW';
    }
    return 'OK';
  }

  // ----- Tables ---------------------------------------------------------

  /**
   * A table from column definitions: { label, cell(row, index), num, strong }.
   * data-label lets narrow screens show each row as a small labelled card.
   */
  function table(columns, rows, caption) {
    const thead = h('thead', null, h('tr', null, columns.map(function (col) {
      return h('th', { scope: 'col', class: col.num ? 'num' : null, text: col.label });
    })));
    const tbody = h('tbody', null, rows.map(function (row, index) {
      return h('tr', null, columns.map(function (col) {
        const content = col.cell(row, index);
        const classes = [col.num ? 'num' : '', col.strong ? 'strong' : '', col.className || ''].join(' ').trim();
        return h('td', { 'data-label': col.label, class: classes || null }, content);
      }));
    }));
    // Tables with few columns stay tables in narrower spaces before turning into cards.
    return h('div', { class: 'table-wrap' + (columns.length <= 3 ? ' table-wrap--small' : '') },
      h('table', { class: 'data-table' }, [caption ? h('caption', { class: 'sr-only', text: caption }) : null, thead, tbody]));
  }

  /** The product table used across the app: No., Code, Product name, Price, Stock, Sold, Status. */
  function productTable(products, caption) {
    return table([
      { label: 'No.', cell: function (p, i) { return String(i + 1); } },
      { label: 'Code', className: 'cell-code', cell: function (p) { return p.getCode(); } },
      { label: 'Product name', strong: true, cell: function (p) { return p.getName(); } },
      { label: 'Price', num: true, cell: function (p) { return Money.format(p.getPrice()); } },
      { label: 'Stock', num: true, cell: function (p) { return String(p.getStock()); } },
      { label: 'Sold', num: true, cell: function (p) { return String(p.getTotalSold()); } },
      { label: 'Status', cell: function (p) { return statusPill(stockStatus(p)); } }
    ], products, caption || 'Products');
  }

  // ----- Key/value lists and receipts -------------------------------------

  const ROW_ICONS = {
    number: 'hash', time: 'calendar', product: 'box', quantity: 'layers', price: 'tag',
    total: 'cash', stock: 'archive', customer: 'user', balance: 'notebook', paid: 'wallet'
  };

  /** A list of label/value rows with dashed separators and a small icon per row. */
  function keyValueList(rows) {
    return h('dl', { class: 'kv' }, rows.map(function (row) {
      const cls = 'kv-row' + (row.strong ? ' kv-row--strong' : '') + (row.empty ? ' kv-row--empty' : '');
      return h('div', { class: cls }, [
        h('dt', null, [h('span', { class: 'kv-icon' }, icon(row.icon || ROW_ICONS[row.key] || 'info')), h('span', { text: row.label })]),
        h('dd', { text: row.value })
      ]);
    }));
  }

  /** A receipt card from transaction.getReceipt(). */
  function receipt(data, opts) {
    const titleId = uid('receipt');
    const inner = opts && opts.inner;
    return h('section', { class: inner ? 'receipt receipt--inner' : 'card receipt', 'aria-labelledby': titleId }, [
      h('h2', { class: 'receipt-title', id: titleId }, [icon('receipt'), h('span', { text: data.title })]),
      keyValueList(data.rows)
    ]);
  }

  // ----- Form fields ----------------------------------------------------

  /**
   * A labelled text field with a hint and an error line.
   * Returns { element, input, setError(message|null), focus() }.
   */
  function textField(opts) {
    const id = opts.id || uid('field');
    const hintId = id + '-hint';
    const errorId = id + '-error';
    const input = h('input', {
      id: id,
      name: opts.name || id,
      class: 'input',
      type: 'text',
      inputmode: opts.inputmode || null,
      autocomplete: opts.autocomplete || 'off',
      spellcheck: 'false',
      'aria-describedby': opts.hint ? hintId : null
    });
    input.value = opts.value || '';

    const error = h('p', { class: 'field-error', id: errorId, hidden: true });
    const element = h('div', { class: 'field' }, [
      h('label', { class: 'field-label', for: id, text: opts.label }),
      opts.hint ? h('p', { class: 'field-hint', id: hintId, text: opts.hint }) : null,
      opts.control ? opts.control(input) : input,
      error
    ]);

    function setError(text) {
      clear(error);
      if (text) {
        error.appendChild(icon('alert'));
        error.appendChild(h('span', { text: text }));
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', (opts.hint ? hintId + ' ' : '') + errorId);
      } else {
        error.hidden = true;
        input.removeAttribute('aria-invalid');
        input.setAttribute('aria-describedby', opts.hint ? hintId : '');
      }
    }

    return {
      element: element,
      input: input,
      setError: setError,
      focus: function () { input.focus(); }
    };
  }

  /** "Please fix" box at the top of a form, linking to each field. */
  function errorSummary(problems) {
    const titleId = uid('errors');
    return h('div', { class: 'error-summary', role: 'alert', 'aria-labelledby': titleId }, [
      h('h2', { id: titleId }, [icon('alert'), h('span', { text: problems.length === 1 ? 'Please fix this:' : 'Please fix these ' + problems.length + ' things:' })]),
      h('ul', null, problems.map(function (p) {
        return h('li', null, h('a', {
          href: '#' + p.fieldId,
          onClick: function (event) {
            event.preventDefault();
            const target = document.getElementById(p.fieldId);
            if (target) {
              target.focus();
            }
          }
        }, p.message));
      }))
    ]);
  }

  // ----- Step indicator -------------------------------------------------

  function steps(names, current) {
    return h('ol', { class: 'steps', 'aria-label': 'Steps' }, names.map(function (name, i) {
      const state = i < current ? 'done' : (i === current ? 'current' : 'todo');
      const num = h('span', { class: 'step-num' }, state === 'done' ? icon('check') : String(i + 1));
      return h('li', { class: 'step step--' + state, 'aria-current': state === 'current' ? 'step' : null }, [
        num,
        h('span', { text: name }),
        state === 'done' ? srOnly(' (done)') : null,
        state === 'current' ? srOnly(' (current step)') : null
      ]);
    }));
  }

  // ----- Confirmation dialog (only for questions the program also asks) --

  /** Shows a modal yes/no question. Esc or "No" answers no. Returns a Promise<boolean>. */
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      const dialog = document.getElementById('confirm-dialog');
      const body = dialog.querySelector('.dialog-body');
      clear(body);

      let answered = false;
      function finish(answer) {
        if (answered) {
          return;
        }
        answered = true;
        dialog.close();
        resolve(answer);
      }

      const noButton = button({ label: opts.cancelLabel || 'No', icon: 'arrowLeft', variant: 'secondary', onClick: function () { finish(false); } });
      const yesButton = button({ label: opts.confirmLabel || 'Yes', icon: opts.confirmIcon || 'check', variant: opts.danger ? 'danger' : 'primary', onClick: function () { finish(true); } });

      append(body, [
        h('span', { class: 'dialog-icon' }, icon(opts.icon || 'alert')),
        h('h2', { id: 'dialog-title', text: opts.title }),
        h('p', { id: 'dialog-message', class: 'dialog-message', text: opts.message }),
        buttonRow([yesButton, noButton])
      ]);

      dialog.oncancel = function (event) {
        event.preventDefault();   // Esc means "No"
        finish(false);
      };
      dialog.showModal();
      noButton.focus();           // the safe answer has focus first
    });
  }

  return {
    h: h,
    append: append,
    clear: clear,
    icon: icon,
    srOnly: srOnly,
    uid: uid,
    button: button,
    linkButton: linkButton,
    buttonRow: buttonRow,
    message: message,
    emptyState: emptyState,
    methodCaption: methodCaption,
    announce: announce,
    focusPageHeading: focusPageHeading,
    statusPill: statusPill,
    typePill: typePill,
    stockStatus: stockStatus,
    table: table,
    productTable: productTable,
    keyValueList: keyValueList,
    receipt: receipt,
    textField: textField,
    errorSummary: errorSummary,
    steps: steps,
    confirmDialog: confirmDialog
  };
})();
