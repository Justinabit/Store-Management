/*
 * 7. Display products sorted (Main.displayProductsSorted()).
 * Every order is made with merge sort on a COPY, so the master list stays
 * A-Z for binary search. Merge sort is stable, so ties keep A-Z order.
 */
Screens.sorted = {
  nav: 'sorted',
  title: 'Display products sorted',
  lead: 'List all products by name, price, stock, or best sellers.',

  ORDERS: [
    { key: 'name', label: 'By name (A to Z)', title: 'Products by name (A to Z)', order: Algorithms.BY_NAME },
    { key: 'price', label: 'By price (lowest first)', title: 'Products by price (lowest first; equal prices keep A-Z order)', order: Inventory.BY_PRICE },
    { key: 'stock', label: 'By stock quantity (lowest first)', title: 'Products by stock quantity (lowest first)', order: Inventory.BY_STOCK },
    { key: 'best', label: 'Best sellers (most sold first)', title: 'Best sellers (most sold first)', order: Inventory.BY_TOTAL_SOLD_DESC }
  ],

  render: function (container) {
    const h = UI.h;
    const inventory = App.getSession().inventory;
    const orders = this.ORDERS;
    const tableHolder = h('div', { class: 'stack' });
    const buttons = [];

    function current() {
      for (let i = 0; i < orders.length; i++) {
        if (orders[i].key === App.state.sortOrder) {
          return orders[i];
        }
      }
      return orders[0];
    }

    function show() {
      const chosen = current();
      buttons.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('data-order') === chosen.key));
      });
      UI.clear(tableHolder);
      tableHolder.appendChild(h('h2', { id: 'sorted-title', text: chosen.title + ':' }));
      if (inventory.isEmpty()) {
        tableHolder.appendChild(UI.emptyState('No records found. There are no products yet.'));
        return;
      }
      tableHolder.appendChild(UI.productTable(inventory.getSortedCopy(chosen.order), chosen.title));
    }

    orders.forEach(function (o) {
      buttons.push(h('button', {
        type: 'button',
        'data-order': o.key,
        'aria-pressed': 'false',
        onClick: function () {
          App.state.sortOrder = o.key;
          show();
          UI.announce('Showing ' + o.title + '.');
        }
      }, o.label));
    });

    container.appendChild(h('section', { class: 'card stack-lg', 'aria-labelledby': 'sorted-title' }, [
      h('div', { class: 'stack' }, [
        h('p', { class: 'section-label', id: 'sort-label', text: 'Choose an order' }),
        h('div', { class: 'segmented', role: 'group', 'aria-labelledby': 'sort-label' }, buttons)
      ]),
      tableHolder
    ]));
    show();
    return null;
  }
};
