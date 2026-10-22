/*
 * 1. Add product (Main.addProduct()).
 * Fill in the form -> check the summary -> save. The product is only added
 * after "Yes, save this product", and Inventory checks for duplicates again.
 */
Screens['add-product'] = {
  nav: 'add-product',
  title: 'Add product',
  lead: 'Add a product with a unique code and name, a price above zero, and an opening stock (0 is allowed).',

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();
    const inventory = session.inventory;

    let step = 0;                     // 0 details, 1 check, 2 done
    let product = null;               // made at the check step, saved only on "Yes"
    const values = { code: '', name: '', price: '', stock: '' };

    const flow = new FlowLayout(container, { steps: ['Product details', 'Check', 'Done'], onCancel: cancel });

    function cancel() {
      if (step === 2) {
        return;
      }
      App.cancel(step === 1 ? 'Cancelled. The product was not added.' : null);
    }

    // Each check returns null when the value is fine, or the program's message.
    const checks = {
      code: function (text) {
        const problem = TextRules.checkCode(text);
        if (problem !== null) {
          return problem;
        }
        const sameCode = inventory.findByCode(text);          // linear search
        return sameCode === null ? null
          : 'Product code ' + TextRules.clean(text).toUpperCase() + ' is already used by "' + sameCode.getName() + '".';
      },
      name: function (text) {
        const problem = TextRules.checkName(text);
        if (problem !== null) {
          return problem;
        }
        const sameName = inventory.findByName(text);          // binary search
        return sameName === null ? null
          : 'A product named "' + sameName.getName() + '" already exists (code ' + sameName.getCode() + ').';
      },
      price: function (text) {
        return Money.parse(text, Money.ONE_CENTAVO, Money.MAX_AMOUNT).error || null;
      },
      stock: function (text) {
        return WholeNumber.parse(text, 0, Product.MAX_STOCK).error || null;
      }
    };

    function showForm(saveError) {
      step = 0;
      flow.setStep(0);

      const fields = {
        code: UI.textField({ id: 'product-code', label: 'Product code', hint: 'e.g. P008  (letters, numbers and hyphens, up to 10)', value: values.code }),
        name: UI.textField({ id: 'product-name', label: 'Product name', hint: 'e.g. Egg Tray  (up to 40 characters)', value: values.name }),
        price: UI.textField({ id: 'product-price', label: 'Price per piece in PHP', hint: 'e.g. 12.50', inputmode: 'decimal', value: values.price }),
        stock: UI.textField({ id: 'product-stock', label: 'Opening stock', hint: '0 to 1000000', inputmode: 'numeric', value: values.stock })
      };
      const order = ['code', 'name', 'price', 'stock'];
      const summaryHolder = h('div');

      // While the Review button is being pressed, skip the leave-a-box check:
      // an error line appearing or disappearing would move the button and the
      // click would be lost. Review checks every box anyway.
      let pressingReview = false;
      const reviewButton = UI.button({ type: 'submit', label: 'Review this product', iconRight: 'arrowRight', variant: 'primary' });
      reviewButton.addEventListener('pointerdown', function () {
        pressingReview = true;
        window.addEventListener('pointerup', function () {
          window.setTimeout(function () { pressingReview = false; }, 0);
        }, { once: true });
      });

      order.forEach(function (key) {
        const field = fields[key];
        field.input.addEventListener('input', function () {
          values[key] = field.input.value;
        });
        // Check a field when the person leaves it (not while they are typing).
        field.input.addEventListener('blur', function () {
          if (pressingReview) {
            return;
          }
          if (field.input.value.trim() !== '' || field.input.getAttribute('aria-invalid') === 'true') {
            field.setError(checks[key](field.input.value));
          }
        });
      });

      function review(event) {
        event.preventDefault();
        UI.clear(summaryHolder);
        const problems = [];
        order.forEach(function (key) {
          const message = checks[key](fields[key].input.value);
          fields[key].setError(message);
          if (message) {
            problems.push({ fieldId: fields[key].input.id, message: message });
          }
        });
        if (problems.length > 0) {
          summaryHolder.appendChild(UI.errorSummary(problems));
          document.getElementById(problems[0].fieldId).focus();
          return;
        }
        product = new Product(values.code, values.name,
          Money.parse(values.price, Money.ONE_CENTAVO, Money.MAX_AMOUNT).value,
          WholeNumber.parse(values.stock, 0, Product.MAX_STOCK).value);
        showCheck();
      }

      const form = h('form', { class: 'form', novalidate: true, onSubmit: review }, [
        summaryHolder,
        h('div', { class: 'form-row' }, [fields.code.element, fields.name.element]),
        h('div', { class: 'form-row' }, [fields.price.element, fields.stock.element]),
        UI.buttonRow([reviewButton])
      ]);

      flow.show('Product details', 'Fill in all four boxes, then review before saving.', form);
      if (saveError) {
        summaryHolder.appendChild(UI.message('error', saveError));
      }
      fields.code.focus();
    }

    function showCheck() {
      step = 1;
      flow.setStep(1);
      flow.show('Check the new product', 'Nothing is saved until you choose "Yes".', h('div', { class: 'confirm-box' }, [
        h('p', { class: 'confirm-line', text: 'New product: ' + product.toString() }),
        h('p', { class: 'confirm-question', text: 'Save this product?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, save this product', icon: 'check', variant: 'primary', onClick: save }),
          UI.button({ label: 'No, go back', icon: 'arrowLeft', onClick: function () { showForm(); } })
        ])
      ]));
    }

    function save() {
      try {
        inventory.addProduct(product);   // checks duplicates again and re-sorts with merge sort
      } catch (error) {
        if (error instanceof StoreError) {
          showForm(error.message);
          return;
        }
        throw error;
      }
      session.markChanged();
      showDone();
    }

    function showDone() {
      step = 2;
      flow.setStep(2);
      flow.show('Product saved', null, [
        UI.message('success', '"' + product.getName() + '" was added to the inventory.', { closable: false }),
        UI.productTable([product], 'The new product'),
        UI.buttonRow([
          UI.button({ label: 'Add another product', icon: 'plus', variant: 'primary', onClick: function () { App.go('add-product'); } }),
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })
        ])
      ]);
    }

    showForm();
    return { onCancel: cancel };
  }
};
