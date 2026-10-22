/*
 * 6. View customers (Main.viewCustomers()) and the customer page.
 * Two choices, like the console sub-menu:
 *   - View all customers: every customer A-Z with balance and full history.
 *   - Search customers with debts: exact name (binary search), then part of
 *     a name (linear search); only customers who still owe are shown.
 * The history lists only utang and payments (cash sales have no customer).
 */
const CustomerView = (function () {
  const h = UI.h;

  function balanceLine(customer) {
    return h('p', { class: 'entity-balance' }, [
      'Balance: ',
      h('strong', { text: Money.format(customer.getBalance()) }),
      customer.hasOutstandingUtang() ? null : '  (no outstanding utang)'
    ]);
  }

  /** Buttons that open the existing utang / payment screens with this customer already chosen. */
  function actions(customer) {
    const query = '?customer=' + encodeURIComponent(customer.getName());
    if (customer.hasOutstandingUtang()) {
      return UI.buttonRow([
        UI.linkButton({ href: '#/payment' + query, label: 'Record utang payment', icon: 'wallet', variant: 'primary' }),
        UI.linkButton({ href: '#/utang' + query, label: 'Record utang', icon: 'notebook' })
      ]);
    }
    return UI.buttonRow([UI.linkButton({ href: '#/utang' + query, label: 'Record utang', icon: 'notebook', variant: 'primary' })]);
  }

  /** The history table: No., Date and time, Type, Details, Amount (+/-), Status. */
  function history(customer) {
    const entries = customer.getHistory();
    if (entries.length === 0) {
      return UI.emptyState('No records found.');
    }
    return UI.table([
      { label: 'No.', strong: true, cell: function (t) { return '#' + t.getNumber(); } },
      { label: 'Date and time', className: 'tabular', cell: function (t) { return t.getRecordedAtText(); } },
      { label: 'Type', cell: function (t) { return UI.typePill(t.getType()); } },
      { label: 'Details', cell: function (t) { return t.getHistoryDetails(); } },
      { label: 'Amount', num: true, strong: true, cell: function (t) { return Money.formatSigned(t.getBalanceEffect()); } },
      { label: 'Status', cell: function (t) { return UI.statusPill(t.getStatus()); } }
    ], entries, 'History of ' + customer.getName());
  }

  /** Header card + history card, like a profile page. */
  function page(customer) {
    const nameId = UI.uid('customer');
    const historyId = UI.uid('history');
    return [
      h('section', { class: 'card', 'aria-labelledby': nameId }, h('div', { class: 'entity-head' }, [
        h('div', { class: 'entity-id' }, [
          h('span', { class: 'entity-badge' }, UI.icon('user')),
          h('div', null, [h('h2', { class: 'entity-name', id: nameId, text: customer.getName() }), balanceLine(customer)])
        ]),
        actions(customer)
      ])),
      h('section', { class: 'card', 'aria-labelledby': historyId }, [
        h('div', { class: 'card-head' }, h('div', null, [
          h('h2', { id: historyId, text: 'History' }),
          h('p', { class: 'card-sub', text: 'Utang and payments, oldest first. Undone entries stay in the list, marked UNDONE.' })
        ])),
        history(customer)
      ])
    ];
  }

  /** One compact card per customer, used when several names match. */
  function compact(customer) {
    const nameId = UI.uid('customer');
    return h('section', { class: 'card stack-lg', 'aria-labelledby': nameId }, [
      h('div', { class: 'entity-head' }, [
        h('div', { class: 'entity-id' }, [
          h('span', { class: 'entity-badge' }, UI.icon('user')),
          h('div', null, [h('h3', { class: 'entity-name', id: nameId }, h('a', { href: '#/customer/' + encodeURIComponent(customer.getName()), text: customer.getName() })), balanceLine(customer)])
        ]),
        actions(customer)
      ]),
      h('h4', { class: 'section-label', text: 'History' }),
      history(customer)
    ]);
  }

  return { page: page, compact: compact };
})();

Screens.customers = {
  nav: 'customers',
  title: 'View customers',
  lead: 'See every customer, or search the customers who still owe.',

  VIEWS: [
    { key: 'all', label: 'View all customers' },
    { key: 'debts', label: 'Search customers with debts' }
  ],

  render: function (container) {
    const h = UI.h;
    const records = App.getSession().customerRecords;
    const views = this.VIEWS;
    const content = h('div', { class: 'stack-lg' });
    const buttons = [];

    function currentView() {
      return App.state.customerView === 'debts' ? 'debts' : 'all';
    }

    // 1. View all customers (the master list is already A-Z, kept by merge sort).
    function showAll() {
      const all = records.getAllCustomers();
      content.appendChild(h('h2', { id: 'customers-title', text: 'All customers (A to Z)' }));
      if (all.length === 0) {
        content.appendChild(UI.emptyState('No records found. There are no customers yet.'));
        return;
      }
      all.forEach(function (c) {
        content.appendChild(CustomerView.compact(c));
      });
    }

    // 2. Search customers with debts.
    function showDebtSearch() {
      content.appendChild(h('h2', { id: 'customers-title', text: 'Search customers with debts' }));
      if (records.isEmpty()) {
        content.appendChild(UI.emptyState('No records found. There are no customers yet.'));
        return;
      }
      if (records.getCustomersWithUtang().length === 0) {
        content.appendChild(UI.emptyState('No customer has an outstanding utang right now.'));
        return;
      }

      const field = UI.textField({
        id: 'customer-search',
        label: 'Enter a customer name',
        hint: 'The full name, or part of it, for example nena. Only customers who still owe are shown.'
      });
      const results = h('div', { class: 'stack-lg' });

      function search(event) {
        event.preventDefault();
        UI.clear(results);
        field.setError(null);
        const text = field.input.value;
        const problem = TextRules.checkName(text);
        if (problem !== null) {
          field.setError(problem);
          field.focus();
          return;
        }
        const keyword = TextRules.clean(text);

        const exact = records.findByName(keyword);                 // 1. binary search
        if (exact !== null) {
          if (exact.hasOutstandingUtang()) {
            App.go('customer/' + encodeURIComponent(exact.getName()), { data: { caption: 'Exact match found using binary search.' } });
          } else {
            const none = exact.getName() + ' has no outstanding utang.';
            results.appendChild(UI.emptyState(none));
            UI.announce(none);
          }
          return;
        }

        // 2. linear search on part of the name, keeping only customers who owe
        const matches = records.searchPartial(keyword);
        const owing = [];
        for (let i = 0; i < matches.length; i++) {
          if (matches[i].hasOutstandingUtang()) {
            owing.push(matches[i]);
          }
        }
        if (owing.length === 0) {
          const none = 'No customers with outstanding utang found for "' + keyword + '".';
          results.appendChild(UI.emptyState(none));
          UI.announce(none);
          return;
        }
        const caption = 'No exact match. Customers with debts whose names contain "' + keyword + '" (linear search): ' + owing.length;
        results.appendChild(h('h2', { text: owing.length === 1 ? '1 customer found' : owing.length + ' customers found' }));
        owing.forEach(function (c) {
          results.appendChild(CustomerView.compact(c));
        });
        results.appendChild(UI.methodCaption(caption));
        UI.announce((owing.length === 1 ? '1 customer found. ' : owing.length + ' customers found. ') + caption);
      }

      UI.append(content, [
        h('form', { class: 'search-row', novalidate: true, role: 'search', onSubmit: search }, [
          field.element,
          UI.button({ type: 'submit', label: 'Search', icon: 'search', variant: 'primary' })
        ]),
        UI.buttonRow([UI.button({ label: 'Cancel', icon: 'x', onClick: function () { App.cancel(); }, attrs: { 'aria-keyshortcuts': 'Escape' } })]),
        results
      ]);
    }

    function show() {
      const view = currentView();
      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === view));
      });
      UI.clear(content);
      if (view === 'all') {
        showAll();
      } else {
        showDebtSearch();
      }
    }

    views.forEach(function (v) {
      buttons.push(h('button', {
        type: 'button',
        'data-view': v.key,
        'aria-pressed': 'false',
        onClick: function () {
          App.state.customerView = v.key;
          show();
          UI.announce('Showing: ' + v.label + '.');
        }
      }, v.label));
    });

    container.appendChild(h('section', { class: 'card stack-lg', 'aria-label': 'View customers' }, [
      h('div', { class: 'stack' }, [
        h('p', { class: 'section-label', id: 'customers-choice', text: 'Choose what to see' }),
        h('div', { class: 'segmented', role: 'group', 'aria-labelledby': 'customers-choice' }, buttons)
      ]),
      content
    ]));
    show();

    return {
      // Esc cancels the search (like typing X at its prompt); viewing the list has nothing to cancel.
      onCancel: function () {
        if (currentView() === 'debts') {
          App.cancel();
        }
      }
    };
  }
};

/** Old address of this screen, so saved links keep working. */
Screens['search-customer'] = Screens.customers;

/** The customer page: #/customer/<name>. */
Screens.customer = {
  nav: 'customers',
  title: 'Customers',
  lead: 'Name, balance and full history of utang and payments.',

  render: function (container, route) {
    const customer = App.getSession().customerRecords.findByName(route.arg);   // binary search
    const name = customer ? customer.getName() : TextRules.clean(route.arg);
    Shell.setPage({
      title: 'Customers',
      lead: this.lead,
      nav: 'customers',
      breadcrumb: [{ label: 'Customers', href: '#/customers' }, { label: name || 'Unknown' }]
    });
    document.title = name + ' - Customers - Sari-Sari Store';

    if (customer === null) {
      UI.append(container, [
        UI.emptyState('No records found for "' + name + '".'),
        UI.buttonRow([UI.linkButton({ href: '#/customers', label: 'View customers', icon: 'users' })])
      ]);
      return null;
    }
    UI.append(container, CustomerView.page(customer));
    if (route.data.caption) {
      container.appendChild(UI.methodCaption(route.data.caption));
    }
    return null;
  }
};
