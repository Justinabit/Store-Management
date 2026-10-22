/*
 * 5. Record utang payment (Main.recordUtangPayment()).
 * Customer -> amount -> check -> done. Overpayments are rejected, and cash
 * sales do not change (payments are kept on each customer's balance).
 */
Screens.payment = {
  nav: 'payment',
  title: 'Record utang payment',
  lead: "Lower a customer's balance when they pay. Overpayments are rejected.",

  render: function (container, route) {
    const h = UI.h;
    const session = App.getSession();
    const records = session.customerRecords;

    if (records.getCustomersWithUtang().length === 0) {
      container.appendChild(h('section', { class: 'card stack' }, [
        UI.emptyState('No customer has an outstanding utang right now.'),
        UI.buttonRow([UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })])
      ]));
      return null;
    }

    const st = { step: 0, customer: null, amountText: '', preview: null, payment: null };

    const flow = new FlowLayout(container, {
      steps: ['Customer', 'Amount', 'Check', 'Done'],
      summaryTitle: 'This payment so far',
      onCancel: cancel
    });

    function cancel() {
      if (st.step === 3) {
        return;
      }
      App.cancel();
    }

    function updateSummary() {
      const c = st.customer;
      const amount = st.payment ? st.payment.getAmount() : st.preview;
      flow.setSummary([
        { key: 'customer', label: 'Customer', value: c ? c.getName() : null },
        { key: 'balance', label: 'Outstanding balance', value: c ? Money.format(c.getBalance()) : null },
        { key: 'paid', label: 'Amount paid', value: amount ? Money.format(amount) : null, strong: true },
        { key: 'balance', label: 'Balance after payment', value: c && amount ? Money.format(c.getBalance() - amount) : null }
      ]);
    }

    function showCustomer(errorText) {
      st.step = 0;
      st.payment = null;
      st.preview = null;
      flow.setStep(0);
      const chooser = Choosers.customer({
        session: session,
        allowCreate: false,
        onChoose: function (customer) {
          if (!customer.hasOutstandingUtang()) {
            chooser.showError(customer.getName() + ' has no outstanding utang. Payment rejected.');
            return;
          }
          if (st.customer !== customer) {
            st.amountText = '';
          }
          st.customer = customer;
          showAmount();
        }
      });
      flow.show('Who is paying?', 'Type the customer\'s name, or pick them from the list.', [
        typeof errorText === 'string' ? UI.message('error', errorText) : null,
        chooser.element
      ]);
      updateSummary();
    }

    function showAmount(errorText) {
      st.step = 1;
      st.payment = null;
      flow.setStep(1);
      const customer = st.customer;
      const field = UI.textField({
        id: 'payment-amount',
        label: 'Amount paid in PHP',
        hint: 'Up to ' + Money.format(customer.getBalance()) + '  (for example 10 or 10.50)',
        inputmode: 'decimal',
        value: st.amountText
      });

      function preview() {
        st.amountText = field.input.value;
        const parsed = Money.parse(field.input.value, Money.ONE_CENTAVO, Money.MAX_AMOUNT);
        st.preview = parsed.value && parsed.value <= customer.getBalance() ? parsed.value : null;
        updateSummary();
      }
      field.input.addEventListener('input', preview);

      function next(event) {
        event.preventDefault();
        const parsed = Money.parse(field.input.value, Money.ONE_CENTAVO, Money.MAX_AMOUNT);
        if (parsed.error) {
          field.setError(parsed.error);
          field.focus();
          return;
        }
        try {
          st.payment = new PaymentTransaction(customer, parsed.value);
        } catch (error) {
          if (error instanceof StoreError) {
            field.setError(error.message + ' Enter a smaller amount, or press Cancel.');
            field.focus();
            return;
          }
          throw error;
        }
        showCheck();
      }

      flow.show('How much is being paid?', null, h('form', { class: 'form', novalidate: true, onSubmit: next }, [
        h('p', { class: 'selected-line', text: 'Customer: ' + customer.getName() + ', outstanding balance ' + Money.format(customer.getBalance()) }),
        field.element,
        UI.buttonRow([
          UI.button({ type: 'submit', label: 'Next: check the payment', iconRight: 'arrowRight', variant: 'primary' }),
          UI.button({ label: 'Back', icon: 'arrowLeft', onClick: function () { showCustomer(); } })
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
      const payment = st.payment;
      const customer = st.customer;
      flow.show('Check the payment', 'Nothing is recorded until you choose "Yes".', h('div', { class: 'confirm-box' }, [
        h('p', { class: 'confirm-line', text: 'Payment of ' + Money.format(payment.getAmount()) + ' from ' + customer.getName() + '.' }),
        h('p', { class: 'confirm-sub', text: 'The balance will become ' + Money.format(customer.getBalance() - payment.getAmount()) + '.' }),
        h('p', { class: 'confirm-question', text: 'Record this payment?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, record this payment', icon: 'check', variant: 'primary', onClick: record }),
          UI.button({ label: 'No, go back', icon: 'arrowLeft', onClick: function () { showAmount(); } })
        ])
      ]));
    }

    function record() {
      const payment = st.payment;
      try {
        payment.execute();
      } catch (error) {
        if (error instanceof StoreError) {
          showAmount(error.message);   // nothing was changed
          return;
        }
        throw error;
      }
      session.undoStack.push(payment);
      session.markChanged();
      showDone();
    }

    function showDone() {
      st.step = 3;
      flow.setStep(3);
      const payment = st.payment;
      const customer = st.customer;
      flow.setSummary([
        { key: 'customer', label: 'Customer', value: customer.getName() },
        { key: 'paid', label: 'Amount paid', value: Money.format(payment.getAmount()), strong: true },
        { key: 'balance', label: 'Balance left', value: Money.format(customer.getBalance()) }
      ]);
      flow.show('Payment recorded', null, [
        UI.message('success', customer.hasOutstandingUtang()
          ? 'Payment recorded.'
          : 'Payment recorded. ' + customer.getName() + "'s utang is now FULLY PAID.", { closable: false }),
        UI.receipt(payment.getReceipt(), { inner: true }),
        UI.buttonRow([
          UI.button({ label: 'Record another payment', icon: 'wallet', variant: 'primary', onClick: function () { App.go('payment'); } }),
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })
        ])
      ]);
    }

    // Opened from a customer's page: start with that customer already chosen.
    const preset = route.query.get('customer');
    const presetCustomer = preset ? records.findByName(preset) : null;
    if (presetCustomer !== null && presetCustomer.hasOutstandingUtang()) {
      st.customer = presetCustomer;
      showAmount();
    } else {
      showCustomer();
    }
    return { onCancel: cancel };
  }
};
