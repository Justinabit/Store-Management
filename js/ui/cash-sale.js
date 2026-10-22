/*
 * 3. Record cash sale (Main.recordCashSale()).
 * Choose product -> quantity -> check -> done. Nothing changes until
 * "Yes, record this cash sale"; then the sale checks itself again, changes
 * stock and cash sales, and goes on top of the undo stack.
 */
Screens['cash-sale'] = {
  nav: 'cash-sale',
  title: 'Record cash sale',
  lead: 'Sell one product for cash and show a receipt.',

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();

    const st = { step: 0, product: null, quantityText: '1', preview: null, sale: null };

    const flow = new FlowLayout(container, {
      steps: ['Choose product', 'Quantity', 'Check', 'Done'],
      summaryTitle: 'This sale so far',
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
      const qty = st.sale ? st.sale.getQuantity() : st.preview;
      flow.setSummary([
        { key: 'product', label: 'Product', value: p ? p.getName() : null },
        { key: 'price', label: 'Unit price', value: p ? Money.format(p.getPrice()) : null },
        { key: 'quantity', label: 'Quantity', value: qty ? String(qty) : null },
        { key: 'total', label: 'Total', value: p && qty ? Money.format(p.getPrice() * qty) : null, strong: true }
      ]);
    }

    function showProduct() {
      st.step = 0;
      st.sale = null;
      flow.setStep(0);
      const chooser = Choosers.product({
        session: session,
        onChoose: function (product) {
          if (st.product !== product) {
            st.quantityText = '1';
          }
          st.product = product;
          showQuantity();
        }
      });
      flow.show('Choose a product', 'Type a product code or exact name, or pick it from the list.', chooser.element);
      st.preview = null;
      updateSummary();
    }

    function showQuantity(errorText) {
      st.step = 1;
      st.sale = null;
      flow.setStep(1);
      const product = st.product;
      const field = quantityField({
        label: 'Quantity sold',
        hint: '1 to ' + Math.min(product.getStock(), Product.MAX_STOCK) + '  (pieces in stock)',
        value: st.quantityText,
        max: product.getStock()
      });

      function preview() {
        st.quantityText = field.input.value;
        const parsed = WholeNumber.parse(field.input.value, 1, Product.MAX_STOCK);
        st.preview = parsed.value && parsed.value <= product.getStock() ? parsed.value : null;
        updateSummary();
      }
      field.input.addEventListener('input', preview);

      function next(event) {
        event.preventDefault();
        const parsed = WholeNumber.parse(field.input.value, 1, Product.MAX_STOCK);
        if (parsed.error) {
          field.setError(parsed.error);
          field.focus();
          return;
        }
        try {
          st.sale = new CashSaleTransaction(product, parsed.value, session.cashRegister);
        } catch (error) {
          if (error instanceof StoreError) {
            field.setError(error.message + ' Enter a smaller quantity, or press Cancel.');
            field.focus();
            return;
          }
          throw error;
        }
        showCheck();
      }

      flow.show('How many pieces?', null, h('form', { class: 'form', novalidate: true, onSubmit: next }, [
        h('p', { class: 'selected-line', text: 'Selected: ' + product.toString() }),
        field.element,
        UI.buttonRow([
          UI.button({ type: 'submit', label: 'Next: check the sale', iconRight: 'arrowRight', variant: 'primary' }),
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
      const sale = st.sale;
      flow.show('Check the sale', 'Nothing is recorded until you choose "Yes".', h('div', { class: 'confirm-box' }, [
        h('p', { class: 'confirm-line', text: 'Cash sale: ' + sale.getDetails() + ' = ' + Money.format(sale.getTotal()) }),
        h('p', { class: 'confirm-question', text: 'Record this cash sale?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, record this cash sale', icon: 'check', variant: 'primary', onClick: record }),
          UI.button({ label: 'No, go back', icon: 'arrowLeft', onClick: function () { showQuantity(); } })
        ])
      ]));
    }

    function record() {
      const sale = st.sale;
      try {
        sale.execute();           // checks again, then changes stock, total sold and cash sales
      } catch (error) {
        if (error instanceof StoreError) {
          showQuantity(error.message);   // nothing was changed; let the person fix the quantity
          return;
        }
        throw error;
      }
      session.undoStack.push(sale);   // PUSH: the newest transaction goes on top of the stack
      session.markChanged();
      showDone();
    }

    function showDone() {
      st.step = 3;
      flow.setStep(3);
      const sale = st.sale;
      flow.setSummary([
        { key: 'product', label: 'Product', value: sale.getProduct().getName() },
        { key: 'quantity', label: 'Quantity', value: String(sale.getQuantity()) },
        { key: 'total', label: 'Total', value: Money.format(sale.getTotal()), strong: true },
        { key: 'stock', label: 'Stock left', value: String(sale.getProduct().getStock()) }
      ]);
      flow.show('Sale recorded', null, [
        UI.message('success', 'Cash sale recorded.', { closable: false }),
        lowStockWarning(sale.getProduct()),
        UI.receipt(sale.getReceipt(), { inner: true }),
        UI.buttonRow([
          UI.button({ label: 'Record another sale', icon: 'bag', variant: 'primary', onClick: function () { App.go('cash-sale'); } }),
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })
        ])
      ]);
    }

    showProduct();
    return { onCancel: cancel };
  }
};
