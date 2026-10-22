/*
 * 6. Search customer (Main.searchCustomer()) and the customer page.
 * Exact name (binary search) opens the customer's page; otherwise every
 * customer whose name contains the text (linear search) is shown.
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

Screens['search-customer'] = {
  nav: 'search-customer',
  title: 'Search customer',
  lead: "See a customer's name, balance and full history of utang and payments.",

  render: function (container) {
    const h = UI.h;
    const records = App.getSession().customerRecords;
    const cancel = function () { App.cancel(); };

    const head = h('div', { class: 'card-head' }, [
      h('h2', { text: 'Find a customer' }),
      UI.button({ label: 'Cancel', icon: 'x', onClick: cancel, attrs: { 'aria-keyshortcuts': 'Escape' } })
    ]);

    if (records.isEmpty()) {
      container.appendChild(h('section', { class: 'card' }, [head, UI.emptyState('No records found. There are no customers yet.')]));
      return { onCancel: cancel };
    }

    const field = UI.textField({ id: 'customer-search', label: 'Enter a customer name', hint: 'The full name, or part of it, for example nena' });
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
        App.go('customer/' + encodeURIComponent(exact.getName()), { data: { caption: 'Exact match found using binary search.' } });
        return;
      }
      const partial = records.searchPartial(keyword);            // 2. linear search
      if (partial.length === 0) {
        const text404 = 'No records found for "' + keyword + '".';
        results.appendChild(UI.emptyState(text404));
        UI.announce(text404);
        return;
      }
      const caption = 'No exact match. Customers whose names contain "' + keyword + '" (linear search): ' + partial.length;
      results.appendChild(h('h2', { text: partial.length === 1 ? '1 customer found' : partial.length + ' customers found' }));
      partial.forEach(function (c) {
        results.appendChild(CustomerView.compact(c));
      });
      results.appendChild(UI.methodCaption(caption));
      UI.announce((partial.length === 1 ? '1 customer found. ' : partial.length + ' customers found. ') + caption);
    }

    container.appendChild(h('section', { class: 'card stack-lg', 'aria-label': 'Search customer' }, [
      head,
      h('form', { class: 'search-row', novalidate: true, role: 'search', onSubmit: search }, [
        field.element,
        UI.button({ type: 'submit', label: 'Search', icon: 'search', variant: 'primary' })
      ])
    ]));
    container.appendChild(results);
    return { onCancel: cancel };
  }
};

/** The customer page: #/customer/<name>. */
Screens.customer = {
  nav: 'search-customer',
  title: 'Customers',
  lead: 'Name, balance and full history of utang and payments.',

  render: function (container, route) {
    const customer = App.getSession().customerRecords.findByName(route.arg);   // binary search
    const name = customer ? customer.getName() : TextRules.clean(route.arg);
    Shell.setPage({
      title: 'Customers',
      lead: this.lead,
      nav: 'search-customer',
      breadcrumb: [{ label: 'Customers', href: '#/search-customer' }, { label: name || 'Unknown' }]
    });
    document.title = name + ' - Customers - Sari-Sari Store';

    if (customer === null) {
      UI.append(container, [
        UI.emptyState('No records found for "' + name + '".'),
        UI.buttonRow([UI.linkButton({ href: '#/search-customer', label: 'Search customer', icon: 'userSearch' })])
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
