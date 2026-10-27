/*
 * 11. Restock product (Main.restockProduct()).
 * Choose product -> quantity received -> check -> done. Stock goes up by the
 * quantity received; sales, cash sales and customer balances do not change.
 * The restock goes on top of the undo stack, so it can be undone.
 */
Screens.restock = {
  nav: 'restock',
  title: 'Restock product',
  lead: "Add the pieces you received to a product's stock.",

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();

    if (session.inventory.isEmpty()) {
      container.appendChild(h('section', { class: 'card stack' }, [
        UI.emptyState('There are no products yet. Add a product first.'),
        UI.buttonRow([UI.linkButton({ href: '#/add-product', label: 'Add product', icon: 'boxPlus', variant: 'primary' })])
      ]));
      return null;
    }

    const st = { step: 0, product: null, quantityText: '', preview: null, restock: null };

    const flow = new FlowLayout(container, {
      steps: ['Choose product', 'Quantity received', 'Check', 'Done'],
      summaryTitle: 'This restock so far',
      onCancel: cancel
    });

    function cancel() {
      if (st.step === 3) {
        return;
      }
      App.cancel();
    }

    function updateSummary() {
      const p = st.product;
      const qty = st.restock ? st.restock.getQuantity() : st.preview;
      flow.setSummary([
        { key: 'product', label: 'Product', value: p ? p.getName() : null },
        { key: 'stock', label: 'Stock now', value: p ? String(p.getStock()) : null },
        { key: 'received', label: 'Quantity received', value: qty ? String(qty) : null },
        { key: 'stock', label: 'Stock after restock', value: p && qty ? String(p.getStock() + qty) : null, strong: true }
      ]);
    }

    function showProduct() {
      st.step = 0;
      st.restock = null;
      st.preview = null;
      flow.setStep(0);
      const chooser = Choosers.product({
        session: session,
        allowOutOfStock: true,          // out-of-stock products are the ones that need restocking most
        onChoose: function (product) {
          if (Product.MAX_STOCK - product.getStock() === 0) {
            chooser.showInfo('This product is already at the stock limit of ' + Product.MAX_STOCK + '.');
            return;
          }
          if (st.product !== product) {
            st.quantityText = '';
          }
          st.product = product;
          showQuantity();
        }
      });
      flow.show('Which product arrived?', 'Type a product code or exact name, or pick it from the list.', chooser.element);
      updateSummary();
    }

    function showQuantity(errorText) {
      st.step = 1;
      st.restock = null;
      flow.setStep(1);
      const product = st.product;
      const capacity = Product.MAX_STOCK - product.getStock();
      const field = quantityField({
        label: 'Quantity received',
        hint: '1 to ' + capacity + '  (pieces delivered)',
        value: st.quantityText,
        max: capacity
      });

      function preview() {
        st.quantityText = field.input.value;
        const parsed = WholeNumber.parse(field.input.value, 1, capacity);
        st.preview = parsed.value || null;
        updateSummary();
      }
      field.input.addEventListener('input', preview);

      function next(event) {
        event.preventDefault();
        const parsed = WholeNumber.parse(field.input.value, 1, capacity);
        if (parsed.error) {
          field.setError(parsed.error);
          field.focus();
          return;
        }
        try {
          st.restock = new RestockTransaction(product, parsed.value);
        } catch (error) {
          if (error instanceof StoreError) {
            field.setError(error.message);
            field.focus();
            return;
          }
          throw error;
        }
        showCheck();
      }

      flow.show('How many pieces were received?', null, h('form', { class: 'form', novalidate: true, onSubmit: next }, [
        h('p', { class: 'selected-line', text: 'Selected: ' + product.toString() }),
        field.element,
        UI.buttonRow([
          UI.button({ type: 'submit', label: 'Next: check the restock', iconRight: 'arrowRight', variant: 'primary' }),
          UI.button({ label: 'Back', icon: 'arrowLeft', onClick: showProduct })
        ])
      ]));
      preview();
      if (typeof errorText === 'string') {
        field.setError(errorText);
        field.focus();
      }
    }

    function showCheck() {
      st.step = 2;
      flow.setStep(2);
      updateSummary();
      const product = st.product;
      const qty = st.restock.getQuantity();
      flow.show('Check the restock', 'Nothing is recorded until you choose "Yes".', h('div', { class: 'confirm-box' }, [
        h('p', { class: 'confirm-sub', text: 'Selected: ' + product.toString() }),
        h('p', { class: 'confirm-line', text: 'Stock: ' + product.getStock() + ' + ' + qty + ' = ' + (product.getStock() + qty) }),
        h('p', { class: 'confirm-question', text: 'Record this restock?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, record this restock', icon: 'check', variant: 'primary', onClick: record }),
          UI.button({ label: 'No, go back', icon: 'arrowLeft', onClick: function () { showQuantity(); } })
        ])
      ]));
    }

    function record() {
      const restock = st.restock;
      try {
        restock.execute();            // checks again, then adds the pieces to the stock
      } catch (error) {
        if (error instanceof StoreError) {
          showQuantity(error.message);   // nothing was changed
          return;
        }
        throw error;
      }
      session.undoStack.push(restock);
      session.markChanged();
      showDone();
    }

    function showDone() {
      st.step = 3;
      flow.setStep(3);
      const restock = st.restock;
      const product = restock.getProduct();
      flow.setSummary([
        { key: 'product', label: 'Product', value: product.getName() },
        { key: 'received', label: 'Quantity received', value: String(restock.getQuantity()) },
        { key: 'stock', label: 'Stock now', value: String(product.getStock()), strong: true }
      ]);
      flow.show('Restock recorded', null, [
        UI.message('success', 'Restock recorded. ' + product.getName() + ' stock is now ' + product.getStock() + '.', { closable: false }),
        lowStockWarning(product),
        UI.receipt(restock.getReceipt(), { inner: true }),
        UI.buttonRow([
          UI.button({ label: 'Restock another product', icon: 'restock', variant: 'primary', onClick: function () { App.go('restock'); } }),
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })
        ])
      ]);
    }

    showProduct();
    return { onCancel: cancel };
  }
};
