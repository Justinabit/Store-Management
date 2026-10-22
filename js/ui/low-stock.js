/*
 * 8. Low-stock alert (Main.showLowStockAlert()).
 * Products with 5 or fewer pieces (zero included): found with a linear
 * search, then merge-sorted by stock, lowest first.
 */
Screens['low-stock'] = {
  nav: 'low-stock',
  title: 'Low-stock alert',
  lead: 'Products that need restocking soon, lowest stock first.',

  render: function (container) {
    const h = UI.h;
    const limit = StoreSession.LOW_STOCK_LIMIT;
    const low = App.getSession().inventory.getLowStockProducts(limit);

    const body = low.length === 0
      ? [UI.emptyState('No records found. Every product has more than ' + limit + ' pieces in stock.')]
      : [
        h('p', { class: 'card-sub', text: low.length + ' product(s) need restocking, lowest stock first:' }),
        UI.productTable(low, 'Products with ' + limit + ' pieces or fewer')
      ];

    body.push(UI.buttonRow([UI.linkButton({ href: '#/restock', label: 'Restock product', icon: 'restock', variant: 'primary' })]));

    container.appendChild(h('section', { class: 'card stack', 'aria-labelledby': 'low-title' },
      [h('h2', { id: 'low-title', text: 'LOW-STOCK ALERT (' + limit + ' pieces or fewer)' })].concat(body)));
    return null;
  }
};
