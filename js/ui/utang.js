/*
 * 4. Record utang (Main.recordUtang()).
 * Customer -> product -> quantity -> check -> done. A NEW customer is saved
 * only after the utang is confirmed, and removed again (rolled back) if the
 * utang cannot be recorded. Cash sales do not change.
 */
Screens.utang = {
  nav: 'utang',
  title: 'Record utang',
  lead: 'Sell one product on credit. A new customer can be added on the spot.',

  render: function (container, route) {
    const h = UI.h;
    const session = App.getSession();

    if (session.inventory.isEmpty()) {
      container.appendChild(h('section', { class: 'card stack' }, [
        UI.emptyState('There are no products to sell yet. Add a product first.'),
        UI.buttonRow([UI.linkButton({ href: '#/add-product', label: 'Add product', icon: 'boxPlus', variant: 'primary' })])
      ]));
      return null;
    }

    const st = { step: 0, customer: null, isNew: false, product: null, quantityText: '1', preview: null, utang: null };

    const flow = new FlowLayout(container, {
      steps: ['Customer', 'Product', 'Quantity', 'Check', 'Done'],
      summaryTitle: 'This utang so far',
      onCancel: cancel
    });

    function cancel() {
      if (st.step === 4) {
        return;
      }
      App.cancel();   // a new customer typed here was never saved
    }

    /** "Customer: Aling Nena, current balance PHP 0.00" or the NEW customer line. */
    function customerLine() {
      const c = st.customer;
      return st.isNew
        ? 'Customer: ' + c.getName() + ' (NEW - will be saved when the utang is recorded)'
        : 'Customer: ' + c.getName() + ', current balance ' + Money.format(c.getBalance());
    }

    function updateSummary() {
      const c = st.customer;
      const p = st.product;
      const qty = st.utang ? st.utang.getQuantity() : st.preview;
      const total = p && qty ? p.getPrice() * qty : null;
      flow.setSummary([
        { key: 'customer', label: 'Customer', value: c ? c.getName() + (st.isNew ? ' (new)' : '') : null },
        { key: 'balance', label: 'Current balance', value: c ? Money.format(c.getBalance()) : null },
        { key: 'product', label: 'Product', value: p ? p.getName() : null },
        { key: 'price', label: 'Unit price', value: p ? Money.format(p.getPrice()) : null },
        { key: 'quantity', label: 'Quantity', value: qty ? String(qty) : null },
        { key: 'total', label: 'Total utang', value: total !== null ? Money.format(total) : null, strong: true },
        { key: 'balance', label: 'New balance', value: c && total !== null ? Money.format(c.getBalance() + total) : null }
      ]);
    }

    function showCustomer(errorText) {
      st.step = 0;
      st.utang = null;
      flow.setStep(0);
      const chooser = Choosers.customer({
        session: session,
        allowCreate: true,
        onChoose: function (customer, isNew) {
          // PAY-FIRST RULE: a customer who still owes money must pay the full
          // balance before getting another utang (Main.recordUtang() in Java).
          if (customer.hasOutstandingUtang()) {
            chooser.showError(UtangTransaction.payFirstMessage(customer));
            return;
          }
          st.customer = customer;
          st.isNew = isNew;
          showProduct();
        }
      });
      flow.show('Who is buying on utang?', 'Type the customer\'s name, or pick them from the list.', [
        typeof errorText === 'string' ? UI.message('error', errorText) : null,
        chooser.element
      ]);
      updateSummary();
    }

    function showProduct() {
      st.step = 1;
      st.utang = null;
      st.preview = null;
      flow.setStep(1);
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
      flow.show('Choose a product', 'Type a product code or exact name, or pick it from the list.', [
        h('p', { class: 'selected-line', text: customerLine() }),
        chooser.element,
        UI.buttonRow([UI.button({ label: 'Back', icon: 'arrowLeft', onClick: function () { showCustomer(); } })])
      ]);
      updateSummary();
    }

    function showQuantity(errorText) {
      st.step = 2;
      st.utang = null;
      flow.setStep(2);
      const product = st.product;
      const field = quantityField({
        label: 'Quantity',
        hint: '1 to ' + product.getStock() + '  (pieces in stock)',
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
          st.utang = new UtangTransaction(st.customer, product, parsed.value);
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
        h('p', { class: 'selected-line', text: customerLine() }),
        h('p', { class: 'selected-line', text: 'Selected: ' + product.toString() }),
        field.element,
        UI.buttonRow([
          UI.button({ type: 'submit', label: 'Next: check the utang', iconRight: 'arrowRight', variant: 'primary' }),
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
      st.step = 3;
      flow.setStep(3);
      updateSummary();
      const utang = st.utang;
      const newBalance = st.customer.getBalance() + utang.getTotal();
      flow.show('Check the utang', 'Nothing is recorded until you choose "Yes".', h('div', { class: 'confirm-box' }, [
        h('p', { class: 'confirm-line', text: 'Utang: ' + utang.getDetails() + ' = ' + Money.format(utang.getTotal()) }),
        h('p', { class: 'confirm-sub', text: 'The balance will become ' + Money.format(newBalance) + '.' }),
        st.isNew ? h('p', { class: 'confirm-sub', text: 'New customer "' + st.customer.getName() + '" will be saved with this utang.' }) : null,
        h('p', { class: 'confirm-question', text: 'Record this utang?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, record this utang', icon: 'check', variant: 'primary', onClick: record }),
          UI.button({ label: 'No, go back', icon: 'arrowLeft', onClick: function () { showQuantity(); } })
        ])
      ]));
    }

    function record() {
      const records = session.customerRecords;
      const utang = st.utang;

      // A new customer is saved only now, after confirmation.
      if (st.isNew) {
        try {
          records.addCustomer(st.customer);
        } catch (error) {
          if (error instanceof StoreError) {
            showCustomer(error.message);   // nothing was changed
            return;
          }
          throw error;
        }
      }
      try {
        utang.execute();
      } catch (error) {
        // ROLLBACK: the utang failed, so do not keep the customer created for it.
        if (st.isNew) {
          records.removeCustomer(st.customer);
        }
        if (error instanceof StoreError) {
          showQuantity(error.message);
          return;
        }
        throw error;
      }
      session.undoStack.push(utang);
      session.markChanged();
      showDone();
    }

    function showDone() {
      st.step = 4;
      flow.setStep(4);
      const utang = st.utang;
      flow.setSummary([
        { key: 'customer', label: 'Customer', value: st.customer.getName() },
        { key: 'total', label: 'Total utang', value: Money.format(utang.getTotal()), strong: true },
        { key: 'balance', label: 'New balance', value: Money.format(st.customer.getBalance()) },
        { key: 'stock', label: 'Stock left', value: String(utang.getProduct().getStock()) }
      ]);
      flow.show('Utang recorded', null, [
        UI.message('success', st.isNew ? 'Utang recorded and new customer saved.' : 'Utang recorded.', { closable: false }),
        lowStockWarning(utang.getProduct()),
        UI.receipt(utang.getReceipt(), { inner: true }),
        UI.buttonRow([
          UI.button({ label: 'Record another utang', icon: 'notebook', variant: 'primary', onClick: function () { App.go('utang'); } }),
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })
        ])
      ]);
    }

    // Opened from a customer's page: start with that customer already chosen.
    const preset = route.query.get('customer');
    const presetCustomer = preset ? session.customerRecords.findByName(preset) : null;
    if (presetCustomer !== null && presetCustomer.hasOutstandingUtang()) {
      showCustomer(UtangTransaction.payFirstMessage(presetCustomer));   // pay-first rule
    } else if (presetCustomer !== null) {
      st.customer = presetCustomer;
      showProduct();
    } else {
      showCustomer();
    }
    return { onCancel: cancel };
  }
};
