/*
 * 10. Undo last transaction (Main.undoLastTransaction()): a cash sale,
 * utang, payment or restock.
 * The undo stack is LIFO: PEEK at the top transaction, ask, undo it, and
 * POP it only after the undo succeeded. Older transactions cannot be picked.
 */
Screens.undo = {
  nav: 'undo',
  title: 'Undo last transaction',
  lead: 'Reverse the most recent cash sale, utang, payment or restock.',

  render: function (container) {
    const h = UI.h;
    const session = App.getSession();
    const stack = session.undoStack;
    const card = h('section', { class: 'card stack-lg', 'aria-labelledby': 'undo-title' });
    let showingResult = false;
    container.appendChild(card);

    function keepIt() {
      App.go('home', { flash: [{ kind: 'info', text: 'Undo cancelled. Nothing was changed.' }] });
    }

    function transactionCard(t) {
      return h('div', { class: 'tx-card' }, [
        h('div', { class: 'tx-top' }, [
          h('span', { class: 'tx-number', text: '#' + t.getNumber() }),
          UI.typePill(t.getType()),
          UI.statusPill(t.getStatus())
        ]),
        h('p', { class: 'tx-details', text: t.getDetails() }),
        h('p', { class: 'tx-meta' }, [
          h('span', null, [UI.icon('cash'), 'Amount: ', h('strong', { text: Money.format(t.getAmount()) })]),
          h('span', null, [UI.icon('calendar'), 'Recorded: ', h('strong', { text: t.getRecordedAtText() })])
        ])
      ]);
    }

    const errorHolder = h('div', { class: 'error-holder' });

    function showTop(moveFocus) {
      showingResult = false;
      UI.clear(card);
      UI.clear(errorHolder);
      const top = stack.peek();
      if (top === null) {
        UI.append(card, [
          h('h2', { id: 'undo-title', text: 'Nothing to undo' }),
          UI.emptyState('There is nothing to undo. The undo stack is empty.'),
          UI.buttonRow([UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home' })])
        ]);
        return;
      }
      UI.append(card, [
        h('div', null, [
          h('h2', { id: 'undo-title', tabindex: '-1', text: 'Most recent transaction (top of the stack)' }),
          h('p', { class: 'card-sub' }, ['Only the most recent transaction can be undone.  Undo available: ', h('strong', { text: String(stack.size()) })])
        ]),
        errorHolder,
        transactionCard(top),
        h('p', { class: 'confirm-question', text: 'Undo this transaction?' }),
        UI.buttonRow([
          UI.button({ label: 'Yes, undo this transaction', icon: 'undo', variant: 'danger', onClick: function () { undoTop(top); } }),
          UI.button({ label: 'No, keep it', icon: 'arrowLeft', onClick: keepIt })
        ])
      ]);
      if (moveFocus) {
        card.querySelector('h2').focus();
      }
    }

    function undoTop(top) {
      try {
        top.undo();       // polymorphism: the right reversal for a sale, an utang or a payment
      } catch (error) {
        if (error instanceof StoreError) {
          UI.clear(errorHolder);
          errorHolder.appendChild(UI.message('error', error.message));
          return;         // nothing changed, and the transaction stays on the stack
        }
        throw error;
      }
      stack.pop();        // removed only after a successful reversal
      showResult(top);
    }

    function showResult(top) {
      showingResult = true;
      UI.clear(card);
      const remaining = stack.size();
      UI.append(card, [
        h('h2', { id: 'undo-title', tabindex: '-1', text: 'Transaction undone' }),
        UI.message('success', 'Transaction #' + top.getNumber() + ' (' + top.getType().label + ') was undone.', { closable: false }),
        UI.message('info', top.getUndoResult(), { closable: false }),
        UI.message('info', remaining === 0
          ? 'The undo stack is now empty.'
          : remaining + ' transaction(s) can still be undone.', { closable: false }),
        UI.buttonRow([
          remaining > 0 ? UI.button({ label: 'Undo another transaction', icon: 'undo', onClick: function () { showTop(true); } }) : null,
          UI.linkButton({ href: '#/home', label: 'Back to Home', icon: 'home', variant: 'primary' })
        ])
      ]);
      card.querySelector('h2').focus();
    }

    showTop(false);
    return {
      onCancel: function () {
        // Esc = "No, keep it", but only while a transaction is waiting for an answer.
        if (!showingResult && stack.peek() !== null) {
          keepIt();
        }
      }
    };
  }
};
