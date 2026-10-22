/*
 * 2. Search product (Main.searchProduct()).
 * Search order: exact name (binary search) -> exact code (linear search)
 * -> part of a name (linear search). The search runs when the person
 * presses Search or Enter, not while typing.
 */
Screens['search-product'] = {
  nav: 'search-product',
  title: 'Search product',
  lead: 'Find a product by its exact name, its code, or part of its name.',

  render: function (container) {
    const h = UI.h;
    const inventory = App.getSession().inventory;
    const cancel = function () { App.cancel(); };

    const head = h('div', { class: 'card-head' }, [
      h('h2', { text: 'Find a product' }),
      UI.button({ label: 'Cancel', icon: 'x', onClick: cancel, attrs: { 'aria-keyshortcuts': 'Escape' } })
    ]);

    if (inventory.isEmpty()) {
      container.appendChild(h('section', { class: 'card' }, [head, UI.emptyState('No records found. There are no products yet.')]));
      return { onCancel: cancel };
    }

    const field = UI.textField({
      id: 'product-search',
      label: 'Enter a product name or code',
      hint: 'For example: Milo Sachet, P003, or part of a name such as pan'
    });
    const results = h('div', { class: 'stack' });

    function showResults(products, caption) {
      results.appendChild(h('h2', { text: products.length === 1 ? '1 product found' : products.length + ' products found' }));
      results.appendChild(UI.productTable(products, 'Search results'));
      results.appendChild(UI.methodCaption(caption));
      UI.announce((products.length === 1 ? '1 product found. ' : products.length + ' products found. ') + caption);
    }

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

      const exact = inventory.findByName(keyword);           // 1. binary search
      if (exact !== null) {
        showResults([exact], 'Exact name match found using binary search.');
        return;
      }
      const byCode = inventory.findByCode(keyword);          // 2. linear search
      if (byCode !== null) {
        showResults([byCode], 'Product code match found using linear search.');
        return;
      }
      const partial = inventory.searchPartial(keyword);      // 3. linear search
      if (partial.length === 0) {
        const text404 = 'No records found for "' + keyword + '".';
        results.appendChild(UI.emptyState(text404));
        UI.announce(text404);
        return;
      }
      showResults(partial, 'No exact match. Products whose names contain "' + keyword + '" (linear search): ' + partial.length);
    }

    container.appendChild(h('section', { class: 'card stack-lg', 'aria-label': 'Search product' }, [
      head,
      h('form', { class: 'search-row', novalidate: true, role: 'search', onSubmit: search }, [
        field.element,
        UI.button({ type: 'submit', label: 'Search', icon: 'search', variant: 'primary' })
      ]),
      results
    ]));
    field.focus();
    return { onCancel: cancel };
  }
};
