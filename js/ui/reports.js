/*
 * 9. Reports (Main.showReports()): session cash sales, total outstanding
 * utang, top 3 best sellers, and customers with utang (highest first).
 * There are no dates or trends: the program does not keep them.
 */
Screens.reports = {
  nav: 'reports',
  title: 'Reports',
  lead: 'Totals for this session, the best-selling products, and who still owes.',

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();

    function total(id, label, centavos, note) {
      return h('section', { class: 'card', 'aria-labelledby': id }, [
        h('h2', { id: id, class: 'kpi-label', text: label }),
        h('p', { class: 'big-number' }, UI.bigMoney(centavos)),
        h('p', { class: 'note', text: note })
      ]);
    }

    container.appendChild(h('div', { class: 'grid-2' }, [
      total('report-cash', 'Total cash sales (this session)', session.cashRegister.getTotal(),
        'Cash sales only. Utang and utang payments are not included.'),
      total('report-utang', 'Total outstanding utang', session.customerRecords.getTotalOutstanding(),
        "The sum of all customers' balances.")
    ]));

    // ----- Top 3 best sellers (zero sales excluded) ------------------------

    const best = session.inventory.getBestSellers(3);
    let bestBody;
    if (best.length === 0) {
      bestBody = [UI.emptyState('No records found. No products have been sold yet.')];
    } else {
      const most = best[0].getTotalSold();
      bestBody = [UI.table([
        { label: 'Rank', strong: true, cell: function (p, i) { return String(i + 1); } },
        { label: 'Product', strong: true, cell: function (p) { return p.getName(); } },
        {
          label: 'Qty sold',
          num: true,
          cell: function (p) {
            const width = Math.max(8, Math.round(p.getTotalSold() / most * 100));
            return h('span', { class: 'qty-cell' }, [
              h('span', { class: 'capsule', 'aria-hidden': 'true' }, h('span', { style: 'width:' + width + '%' })),
              h('strong', { class: 'tabular', text: String(p.getTotalSold()) })
            ]);
          }
        }
      ], best, 'Top 3 best-selling products')];
      if (best.length < 3) {
        bestBody.push(h('p', { class: 'note', style: 'margin-top: var(--s-2)', text: '(Only ' + best.length + ' product(s) have sales so far.)' }));
      }
    }

    // ----- Customers with outstanding utang (highest balance first) -------

    const owing = session.customerRecords.getCustomersWithUtang();
    const owingBody = owing.length === 0
      ? UI.emptyState('No records found. No customer has an outstanding utang.')
      : UI.table([
        { label: 'No.', strong: true, cell: function (c, i) { return String(i + 1); } },
        {
          label: 'Customer',
          cell: function (c) {
            return h('a', { href: '#/customer/' + encodeURIComponent(c.getName()), class: 'strong', text: c.getName() });
          }
        },
        { label: 'Balance', num: true, strong: true, cell: function (c) { return Money.format(c.getBalance()); } }
      ], owing, 'Customers with outstanding utang');

    container.appendChild(h('div', { class: 'grid-2' }, [
      h('section', { class: 'card', 'aria-labelledby': 'report-best' }, [
        h('div', { class: 'card-head' }, h('div', null, [
          h('h2', { id: 'report-best', text: 'Top 3 best-selling products' }),
          h('p', { class: 'card-sub', text: 'By pieces sold (cash sales and utang)' })
        ]))
      ].concat(bestBody)),
      h('section', { class: 'card', 'aria-labelledby': 'report-owing' }, [
        h('div', { class: 'card-head' }, h('div', null, [
          h('h2', { id: 'report-owing', text: 'Customers with outstanding utang' }),
          h('p', { class: 'card-sub', text: 'Highest balance first. Choose a name to see the history.' })
        ])),
        owingBody
      ])
    ]));
    return null;
  }
};
