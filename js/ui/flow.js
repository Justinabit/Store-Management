/*
 * Shared pieces for the step-by-step operations (add product, cash sale,
 * utang, payment):
 *   - FlowLayout: step indicator, an always-visible Cancel button, the
 *     current step, and an optional "so far" summary panel.
 *   - Choosers: pick a product or a customer by typing OR from a list,
 *     using the same search order as the console program.
 * Nothing is recorded by these helpers; each screen records only after its
 * final confirmation.
 */

class FlowLayout {
  #steps;
  #stepsHolder;
  #cancelButton;
  #stage;
  #summaryBody = null;
  #headingId = UI.uid('stage');

  /**
   * @param container the screen element
   * @param options { steps: [names], onCancel: fn, summaryTitle?: string }
   */
  constructor(container, options) {
    const h = UI.h;
    this.#steps = options.steps;
    this.#stepsHolder = h('div', { class: 'flow-steps' });
    this.#cancelButton = UI.button({
      label: 'Cancel',
      icon: 'x',
      variant: 'secondary',
      onClick: options.onCancel,
      attrs: { 'aria-keyshortcuts': 'Escape', title: 'Cancel and go back to Home (Esc)' }
    });

    this.#stage = h('section', { class: 'card flow-stage', 'aria-labelledby': this.#headingId });

    let summary = null;
    if (options.summaryTitle) {
      const summaryId = UI.uid('summary');
      this.#summaryBody = h('div');
      summary = h('aside', { class: 'card card--tight summary-panel', 'aria-labelledby': summaryId }, [
        h('h2', { id: summaryId, text: options.summaryTitle }),
        this.#summaryBody
      ]);
    }

    UI.append(container, [
      h('div', { class: 'flow-toolbar' }, [this.#stepsHolder, this.#cancelButton]),
      h('div', { class: 'flow' + (summary ? '' : ' flow--single') }, [this.#stage, summary])
    ]);
  }

  /** Highlights the current step. The Cancel button is hidden on the last ("Done") step. */
  setStep(index) {
    UI.clear(this.#stepsHolder);
    this.#stepsHolder.appendChild(UI.steps(this.#steps, index));
    this.#cancelButton.hidden = index === this.#steps.length - 1;
  }

  /** Replaces the step content: a heading, one plain sentence, then the nodes. Focus moves to the heading. */
  show(title, lead, nodes, opts) {
    const h = UI.h;
    UI.clear(this.#stage);
    const heading = h('h2', { id: this.#headingId, tabindex: '-1', text: title });
    UI.append(this.#stage, [h('div', { class: 'stage-head' }, [heading, lead ? h('p', { text: lead }) : null]), nodes]);
    if (!opts || opts.focus !== false) {
      heading.focus();
    }
  }

  /** Rows: { label, value, key?, icon?, strong? }. A missing value shows "Not chosen yet". */
  setSummary(rows) {
    if (!this.#summaryBody) {
      return;
    }
    UI.clear(this.#summaryBody);
    this.#summaryBody.appendChild(UI.keyValueList(rows.map(function (row) {
      const empty = row.value === null || row.value === undefined;
      return Object.assign({}, row, { value: empty ? 'Not chosen yet' : row.value, empty: empty });
    })));
  }
}

const Choosers = (function () {
  const h = UI.h;

  function chevron() {
    return UI.icon('chevronRight');
  }

  /** A large selectable row for one product. */
  function productOption(product, number, onPick) {
    return h('li', null, h('button', {
      type: 'button',
      class: 'option',
      onClick: function () { onPick(product); }
    }, [
      number ? h('span', { class: 'option-num', text: String(number) }) : null,
      h('span', { class: 'option-main' }, [
        h('span', { class: 'option-title', text: product.getName() }),
        h('span', { class: 'option-meta tabular', text: product.getCode() + '  ·  ' + Money.format(product.getPrice()) + '  ·  Stock ' + product.getStock() })
      ]),
      h('span', { class: 'option-side' }, [UI.statusPill(UI.stockStatus(product)), chevron()])
    ]));
  }

  /** A large selectable row for one customer. */
  function customerOption(customer, number, onPick) {
    const balanceText = 'Balance: ' + Money.format(customer.getBalance())
      + (customer.hasOutstandingUtang() ? '' : '  (no outstanding utang)');
    return h('li', null, h('button', {
      type: 'button',
      class: 'option',
      onClick: function () { onPick(customer); }
    }, [
      number ? h('span', { class: 'option-num', text: String(number) }) : null,
      h('span', { class: 'option-main' }, [
        h('span', { class: 'option-title', text: customer.getName() }),
        h('span', { class: 'option-meta tabular', text: balanceText })
      ]),
      h('span', { class: 'option-side' }, chevron())
    ]));
  }

  function scrollIntoViewGently(el) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  /**
   * Choose ONE product, like Main.selectProduct():
   * exact code (linear search) -> exact name (binary search) -> numbered list
   * of partial matches (linear search). The full A-Z list is also shown so
   * nobody has to type. Out-of-stock products are refused for selling, but
   * can be chosen when opts.allowOutOfStock is true (restocking).
   */
  function product(opts) {
    const inventory = opts.session.inventory;
    const feedback = h('div', { class: 'stack' });
    const field = UI.textField({
      id: UI.uid('find-product'),
      label: 'Product code or exact name',
      hint: 'For example P001 or Milo Sachet. You can also choose from the list below.'
    });

    function showError(text) {
      UI.clear(feedback);
      feedback.appendChild(UI.message('error', text));
      scrollIntoViewGently(feedback);
    }

    function showInfo(text) {
      UI.clear(feedback);
      feedback.appendChild(UI.message('info', text));
      scrollIntoViewGently(feedback);
    }

    function pick(chosen) {
      if (chosen.getStock() === 0 && !opts.allowOutOfStock) {
        showError(new InsufficientStockError(chosen.getName(), 1, 0).message);
        return;
      }
      opts.onChoose(chosen);
    }

    function find() {
      field.setError(null);
      UI.clear(feedback);
      const text = field.input.value;
      const problem = TextRules.checkName(text);
      if (problem !== null) {
        field.setError(problem);
        field.focus();
        return;
      }
      const keyword = TextRules.clean(text);
      let found = inventory.findByCode(keyword);    // linear search
      if (found === null) {
        found = inventory.findByName(keyword);      // binary search
      }
      if (found !== null) {
        pick(found);
        return;
      }
      const matches = inventory.searchPartial(keyword);   // linear search
      if (matches.length === 0) {
        field.setError('No records found for "' + keyword + '". Try again, or press Cancel.');
        field.focus();
        return;
      }
      const headingId = UI.uid('matches');
      const panel = h('section', { class: 'choice-panel', 'aria-labelledby': headingId }, [
        h('h3', { id: headingId, tabindex: '-1', text: 'No exact match. Did you mean one of these?' }),
        h('ul', { class: 'option-list' }, matches.map(function (p, i) { return productOption(p, i + 1, pick); }))
      ]);
      feedback.appendChild(panel);
      panel.querySelector('h3').focus();
    }

    const form = h('form', { class: 'search-row', novalidate: true, onSubmit: function (e) { e.preventDefault(); find(); } }, [
      field.element,
      UI.button({ type: 'submit', label: 'Find product', icon: 'search', variant: 'primary' })
    ]);

    const listId = UI.uid('all-products');
    const all = inventory.getAllProducts();
    const list = h('section', { class: 'stack', 'aria-labelledby': listId }, [
      h('h3', { id: listId, text: 'All products (A to Z)' }),
      all.length === 0
        ? UI.emptyState('No records found. There are no products yet.')
        : h('ul', { class: 'option-list' }, all.map(function (p) { return productOption(p, null, pick); }))
    ]);

    return { element: h('div', { class: 'stack-lg' }, [form, feedback, list]), focus: field.focus, showInfo: showInfo };
  }

  /**
   * Choose a customer by name or from the list.
   *   allowCreate: true  -> Record utang (Main.selectOrCreateCustomer())
   *   allowCreate: false -> Record utang payment (Main.selectExistingCustomer())
   * A new customer is only CREATED here, never saved; the utang screen saves
   * it after the utang is confirmed.
   */
  function customer(opts) {
    const records = opts.session.customerRecords;
    const feedback = h('div', { class: 'stack' });
    const field = UI.textField({
      id: UI.uid('find-customer'),
      label: 'Customer name',
      hint: opts.allowCreate
        ? 'Type the name, or choose from the list below. A new name can be added as a new customer.'
        : 'Type the name, or choose from the list below.'
    });

    function pick(chosen, isNew) {
      opts.onChoose(chosen, isNew === true);
    }

    function showError(text) {
      UI.clear(feedback);
      feedback.appendChild(UI.message('error', text));
      scrollIntoViewGently(feedback);
    }

    function showPanel(title, rows) {
      const headingId = UI.uid('choices');
      const panel = h('section', { class: 'choice-panel', 'aria-labelledby': headingId }, [h('h3', { id: headingId, tabindex: '-1', text: title }), rows]);
      feedback.appendChild(panel);
      panel.querySelector('h3').focus();
    }

    function find() {
      field.setError(null);
      UI.clear(feedback);
      const text = field.input.value;
      const problem = TextRules.checkName(text);
      if (problem !== null) {
        field.setError(problem);
        field.focus();
        return;
      }
      const name = TextRules.clean(text);

      const existing = records.findByName(name);      // binary search, ignores case and spaces
      if (existing !== null) {
        pick(existing, false);
        return;
      }

      const matches = records.searchPartial(name);    // linear search
      if (!opts.allowCreate) {
        if (matches.length === 0) {
          field.setError('No records found for "' + name + '". Try again, or press Cancel.');
          field.focus();
          return;
        }
        showPanel('No exact match. Did you mean one of these?',
          h('ul', { class: 'option-list' }, matches.map(function (c, i) { return customerOption(c, i + 1, pick); })));
        return;
      }

      if (matches.length > 0) {
        const createRow = h('li', null, h('button', {
          type: 'button',
          class: 'option option--create',
          onClick: function () { pick(new Customer(name), true); }
        }, [
          h('span', { class: 'option-num', text: String(matches.length + 1) }),
          h('span', { class: 'option-main' }, [
            h('span', { class: 'option-title', text: 'Create a NEW customer named "' + name + '"' }),
            h('span', { class: 'option-meta', text: 'Saved only when the utang is recorded' })
          ]),
          h('span', { class: 'option-side' }, UI.icon('userPlus'))
        ]));
        showPanel('No exact match. Customers whose names contain "' + name + '":',
          h('ul', { class: 'option-list' }, matches.map(function (c, i) { return customerOption(c, i + 1, pick); }).concat([createRow])));
        return;
      }

      showPanel('Customer "' + name + '" does not exist yet. Create this customer?', UI.buttonRow([
        UI.button({ label: 'Yes, create this customer', icon: 'userPlus', variant: 'primary', onClick: function () { pick(new Customer(name), true); } }),
        UI.button({
          label: 'No, type another name',
          icon: 'arrowLeft',
          onClick: function () {
            UI.clear(feedback);
            feedback.appendChild(UI.message('info', 'Customer not created. Enter another name, or press Cancel.'));
            field.input.select();
            field.focus();
          }
        })
      ]));
    }

    const form = h('form', { class: 'search-row', novalidate: true, onSubmit: function (e) { e.preventDefault(); find(); } }, [
      field.element,
      UI.button({ type: 'submit', label: opts.allowCreate ? 'Continue' : 'Find customer', icon: opts.allowCreate ? 'arrowRight' : 'search', variant: 'primary' })
    ]);

    const listId = UI.uid('all-customers');
    const all = records.getAllCustomers();
    const list = h('section', { class: 'stack', 'aria-labelledby': listId }, [
      h('h3', { id: listId, text: 'All customers (A to Z)' }),
      all.length === 0
        ? UI.emptyState('No records found. There are no customers yet.')
        : h('ul', { class: 'option-list' }, all.map(function (c) { return customerOption(c, null, pick); }))
    ]);

    return { element: h('div', { class: 'stack-lg' }, [form, feedback, list]), focus: field.focus, showError: showError };
  }

  return { product: product, customer: customer };
})();

/**
 * A whole-number field with large "- 1" and "+ 1" buttons, used for the
 * quantity of a sale or utang. The buttons keep the value from 1 up to max.
 */
function quantityField(opts) {
  const field = UI.textField({
    id: UI.uid('quantity'),
    label: opts.label,
    hint: opts.hint,
    inputmode: 'numeric',
    value: opts.value,
    control: function (input) {
      function change(step) {
        const parsed = WholeNumber.parse(input.value, 1, Product.MAX_STOCK);
        const current = parsed.value || 0;
        const next = Math.min(Math.max(current + step, 1), opts.max);
        input.value = String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
      return UI.h('div', { class: 'stepper' }, [
        UI.h('button', { type: 'button', class: 'btn btn--secondary stepper-btn', onClick: function () { change(-1); } }, ['− 1', UI.srOnly(' (one less)')]),
        input,
        UI.h('button', { type: 'button', class: 'btn btn--secondary stepper-btn', onClick: function () { change(1); } }, ['+ 1', UI.srOnly(' (one more)')])
      ]);
    }
  });
  return field;
}

/** The warning printed after a sale or utang (Main.printLowStockWarning()), or null. */
function lowStockWarning(product) {
  if (product.getStock() === 0) {
    return UI.message('warning', 'WARNING: ' + product.getName() + ' is now OUT OF STOCK.', { closable: false, plainLabel: true });
  }
  if (product.isLowStock(StoreSession.LOW_STOCK_LIMIT)) {
    return UI.message('warning', 'WARNING: ' + product.getName() + ' is low on stock (' + product.getStock() + ' left).', { closable: false, plainLabel: true });
  }
  return null;
}
