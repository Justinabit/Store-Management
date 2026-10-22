/*
 * Home: the GUI version of the main menu. The status cards show the same
 * numbers as the console menu's status line (products, customers, cash
 * sales, undo available) plus two values computed from the records.
 */
Screens.home = {
  nav: 'home',
  title: 'Home',
  lead: 'Choose what you want to do. Every number on this page comes from the records of this session.',

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();
    const limit = StoreSession.LOW_STOCK_LIMIT;
    const lowStock = session.inventory.getLowStockProducts(limit);
    const owing = session.customerRecords.getCustomersWithUtang();

    if (!App.state.sampleNoticeHidden) {
      container.appendChild(UI.message('info', SampleData.NOTICE, {
        tag: 'Sample data',
        closeLabel: 'Hide notice',
        announce: false,
        onClose: function () { App.state.sampleNoticeHidden = true; }
      }));
    }

    // ----- Status cards --------------------------------------------------

    function money(centavos) {
      return UI.bigMoney(centavos);
    }

    function kpi(label, iconName, value, note, tone) {
      return h('div', { class: 'card kpi' }, [
        h('div', { class: 'kpi-head' }, [
          h('p', { class: 'kpi-label', text: label }),
          h('span', { class: 'kpi-badge' + (tone ? ' kpi-badge--' + tone : '') }, UI.icon(iconName))
        ]),
        h('p', { class: 'kpi-value' }, value),
        h('p', { class: 'kpi-note', text: note })
      ]);
    }

    container.appendChild(h('section', { 'aria-labelledby': 'status-title' }, [
      h('h2', { class: 'sr-only', id: 'status-title', text: 'Store status' }),
      h('div', { class: 'kpi-grid' }, [
        kpi('Products', 'box', String(session.inventory.size()), 'in the product list'),
        kpi('Customers', 'users', String(session.customerRecords.size()), 'in the customer list'),
        kpi('Cash sales', 'cash', money(session.cashRegister.getTotal()), 'this session only'),
        kpi('Undo available', 'undo', String(session.undoStack.size()), 'transaction(s) can be undone'),
        kpi('Total outstanding utang', 'notebook', money(session.customerRecords.getTotalOutstanding()),
          'owed by ' + owing.length + ' customer(s)'),
        kpi('Low-stock products', 'alert', String(lowStock.length), limit + ' pieces or fewer',
          lowStock.length > 0 ? 'low' : null)
      ])
    ]));

    // ----- Menu tiles ----------------------------------------------------

    function tile(href, iconName, title, description, feature) {
      return h('li', null, h('a', { class: 'tile' + (feature ? ' tile--feature' : ''), href: href }, [
        h('span', { class: 'tile-icon' }, UI.icon(iconName)),
        h('span', null, [h('span', { class: 'tile-title', text: title }), h('span', { class: 'tile-desc', text: description })])
      ]));
    }

    function group(id, title, tiles, feature) {
      return h('section', { class: 'action-group', 'aria-labelledby': id }, [
        h('h3', { class: 'section-label', id: id, text: title }),
        h('ul', { class: 'tile-grid' + (feature ? ' tile-grid--feature' : '') }, tiles)
      ]);
    }

    const exitTile = h('li', null, h('button', { type: 'button', class: 'tile tile--exit', onClick: App.requestExit }, [
      h('span', { class: 'tile-icon' }, UI.icon('exit')),
      h('span', null, [h('span', { class: 'tile-title', text: 'Exit' }), h('span', { class: 'tile-desc', text: 'End the program. All changes from this session will be lost.' })])
    ]));

    const actions = h('section', { class: 'card', 'aria-labelledby': 'actions-title' }, [
      h('div', { class: 'card-head' }, h('h2', { id: 'actions-title', text: 'What would you like to do?' })),
      group('group-sell', 'Sell and collect', [
        tile('#/cash-sale', 'bag', 'Record cash sale', 'Sell one product for cash and show a receipt.', true),
        tile('#/utang', 'notebook', 'Record utang', 'Sell one product on credit. A new customer can be added on the spot.', true),
        tile('#/payment', 'wallet', 'Record utang payment', "Lower a customer's balance. Overpayments are rejected.", true)
      ], true),
      group('group-products', 'Products', [
        tile('#/add-product', 'boxPlus', 'Add product', 'A unique code and name, a price, and the opening stock.'),
        tile('#/restock', 'restock', 'Restock product', "Add the pieces you received to a product's stock."),
        tile('#/search-product', 'search', 'Search product', 'By exact name, by code, or by part of the name.'),
        tile('#/sorted', 'sort', 'Display products sorted', 'By name, price, stock, or best sellers.'),
        tile('#/low-stock', 'alert', 'Low-stock alert', 'Products with ' + limit + ' or fewer pieces, lowest stock first.')
      ]),
      group('group-customers', 'Customers', [
        tile('#/search-customer', 'userSearch', 'Search customer', 'Name, balance and full history.')
      ]),
      group('group-records', 'Records', [
        tile('#/reports', 'report', 'Reports', 'Cash sales, outstanding utang, top 3 best sellers, customers with utang.'),
        tile('#/undo', 'undo', 'Undo last transaction', 'Reverse the most recent cash sale, utang, payment or restock.'),
        exitTile
      ])
    ]);

    // ----- Needs restocking (with real stock-status counts) ---------------

    const counts = session.inventory.countByStockStatus(limit);
    const total = counts.ok + counts.low + counts.out;

    function segment(cls, count) {
      return count > 0 ? h('span', { class: cls, style: 'flex: ' + count + ' 1 0' }) : null;
    }

    function legendRow(color, label, count) {
      return h('li', null, [
        h('span', { class: 'legend-swatch', style: 'background:' + color }),
        h('span', { text: label }),
        h('span', { class: 'legend-count', text: count + (count === 1 ? ' product' : ' products') })
      ]);
    }

    const restockBody = [];
    if (total > 0) {
      restockBody.push(
        h('p', { class: 'section-label', text: 'Stock status of all ' + total + ' products' }),
        h('div', { class: 'status-bar', 'aria-hidden': 'true' }, [
          segment('seg-ok', counts.ok), segment('seg-low', counts.low), segment('seg-out', counts.out)
        ]),
        h('ul', { class: 'legend' }, [
          legendRow('var(--chart-ok)', 'OK', counts.ok),
          legendRow('var(--chart-low)', 'LOW', counts.low),
          legendRow('var(--chart-out)', 'OUT OF STOCK', counts.out)
        ])
      );
    }

    if (lowStock.length === 0) {
      restockBody.push(UI.emptyState('No records found. Every product has more than ' + limit + ' pieces in stock.'));
    } else {
      restockBody.push(h('ul', { class: 'restock-list' }, lowStock.map(function (p) {
        return h('li', { class: 'restock-item' }, [
          h('span', { class: 'restock-name', text: p.getName() }),
          h('span', { class: 'restock-meta tabular', text: p.getCode() + '  ·  Stock ' + p.getStock() }),
          UI.statusPill(UI.stockStatus(p))
        ]);
      })));
    }
    restockBody.push(h('div', { class: 'btn-row', style: 'margin-top: var(--s-2)' }, [
      UI.linkButton({ href: '#/restock', label: 'Restock product', icon: 'restock', variant: 'secondary' }),
      UI.linkButton({ href: '#/low-stock', label: 'View low-stock alert', iconRight: 'arrowRight', variant: 'link' })
    ]));

    const restock = h('aside', { class: 'card card--tight', 'aria-labelledby': 'restock-title' }, [
      h('div', { class: 'card-head' }, [
        h('div', null, [
          h('h2', { id: 'restock-title', text: 'Needs restocking' }),
          h('p', { class: 'card-sub', text: limit + ' pieces or fewer, lowest stock first' })
        ])
      ])
    ].concat(restockBody));

    container.appendChild(h('div', { class: 'home-grid' }, [actions, restock]));
  }
};
