/*
 * Transactions (mirror Transaction.java and its subclasses).
 *
 *     Transaction (abstract)
 *       ├── ProductTransaction (abstract)   product, quantity, unit price, total
 *       │     ├── CashSaleTransaction
 *       │     └── UtangTransaction
 *       ├── PaymentTransaction
 *       └── RestockTransaction
 *
 * TEMPLATE METHOD: execute() and undo() always follow the same safe steps
 * (check first, then change); each subclass fills in the details.
 * POLYMORPHISM: the screens and the undo stack only use the type
 * "Transaction"; undo() runs the right reversal for each kind.
 */

/** The kinds of transaction that can be recorded and undone (mirrors TransactionType.java). */
const TransactionType = Object.freeze({
  CASH_SALE: Object.freeze({ key: 'CASH_SALE', label: 'Cash sale' }),
  UTANG: Object.freeze({ key: 'UTANG', label: 'Utang' }),
  PAYMENT: Object.freeze({ key: 'PAYMENT', label: 'Payment' }),
  RESTOCK: Object.freeze({ key: 'RESTOCK', label: 'Restock' })
});

class Transaction {
  static #nextNumber = 1;   // one shared counter for transaction numbers

  #type;
  #number = 0;              // given when the transaction is recorded
  #recordedAt = null;
  #executed = false;
  #undone = false;

  constructor(type) {
    if (new.target === Transaction) {
      throw new TypeError('Transaction is abstract. Create a cash sale, utang or payment instead.');
    }
    if (!type) {
      throw new IllegalArgumentError('A transaction type is required.');
    }
    this.#type = type;
  }

  /** A new session starts numbering again from #1, like a new run of the Java program. */
  static resetNumbering() {
    Transaction.#nextNumber = 1;
  }

  /**
   * Records the transaction:
   *   1. validate()     - checks EVERYTHING first; throws if something is wrong
   *   2. applyChanges() - only then changes stock, balances and totals
   */
  execute() {
    if (this.#executed) {
      throw new StoreError('This transaction has already been recorded.');
    }
    this.validate();
    this.applyChanges();
    this.#executed = true;
    this.#number = Transaction.#nextNumber;
    Transaction.#nextNumber++;
    this.#recordedAt = new Date();
  }

  /**
   * Reverses the transaction. reverseChanges() checks first and only then
   * changes anything. The transaction stays in the history, marked UNDONE.
   */
  undo() {
    if (!this.#executed) {
      throw new StoreError('This transaction was never recorded, so it cannot be undone.');
    }
    if (this.#undone) {
      throw new StoreError('Transaction #' + this.#number + ' has already been undone.');
    }
    this.reverseChanges();
    this.#undone = true;
  }

  // ----- Methods each subclass must provide ("abstract") -----

  validate() { throw new TypeError('validate() is not implemented.'); }
  applyChanges() { throw new TypeError('applyChanges() is not implemented.'); }
  reverseChanges() { throw new TypeError('reverseChanges() is not implemented.'); }
  getAmount() { throw new TypeError('getAmount() is not implemented.'); }
  getDetails() { throw new TypeError('getDetails() is not implemented.'); }
  getReceipt() { throw new TypeError('getReceipt() is not implemented.'); }
  getUndoResult() { throw new TypeError('getUndoResult() is not implemented.'); }

  /** Description in a customer's history table. Subclasses may override it. */
  getHistoryDetails() {
    return this.getDetails();
  }

  /** Change to a customer's balance: positive for utang, negative for payment, zero otherwise. */
  getBalanceEffect() {
    return Money.ZERO;
  }

  // ----- Common getters -----

  getType() {
    return this.#type;
  }

  getNumber() {
    return this.#number;
  }

  isUndone() {
    return this.#undone;
  }

  /** Active = recorded and not undone. */
  isActive() {
    return this.#executed && !this.#undone;
  }

  getStatus() {
    if (!this.#executed) {
      return 'NOT RECORDED';
    }
    return this.#undone ? 'UNDONE' : 'ACTIVE';
  }

  /** "yyyy-MM-dd HH:mm", or "-" when not recorded yet. */
  getRecordedAtText() {
    if (this.#recordedAt === null) {
      return '-';
    }
    let d = this.#recordedAt;
    let two = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate())
      + ' ' + two(d.getHours()) + ':' + two(d.getMinutes());
  }

  /** e.g. "#3 Payment | Payment from Aling Nena | PHP 10.00 | 2026-10-15 13:05" */
  getSummary() {
    return '#' + this.#number + ' ' + this.#type.label + ' | ' + this.getDetails() + ' | '
      + Money.format(this.getAmount()) + ' | ' + this.getRecordedAtText();
  }

  toString() {
    return this.getSummary() + ' [' + this.getStatus() + ']';
  }
}

/**
 * A transaction that sells ONE product in some quantity (parent of cash
 * sale and utang). The unit price and total are SAVED when it is created,
 * so an undo uses the original amount even if the price changes later.
 */
class ProductTransaction extends Transaction {
  #product;
  #quantity;
  #unitPrice;
  #total;

  /** @throws StoreError / InsufficientStockError if the quantity is not allowed now */
  constructor(type, product, quantity) {
    super(type);
    if (new.target === ProductTransaction) {
      throw new TypeError('ProductTransaction is abstract.');
    }
    if (!(product instanceof Product)) {
      throw new IllegalArgumentError('A product must be selected.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new StoreError('The quantity must be at least 1.');
    }
    if (quantity > product.getStock()) {
      throw new InsufficientStockError(product.getName(), quantity, product.getStock());
    }
    this.#product = product;
    this.#quantity = quantity;
    this.#unitPrice = product.getPrice();
    this.#total = this.#unitPrice * quantity;   // total = unit price x quantity (exact centavos)
  }

  getProduct() {
    return this.#product;
  }

  getQuantity() {
    return this.#quantity;
  }

  getUnitPrice() {
    return this.#unitPrice;
  }

  getTotal() {
    return this.#total;
  }

  getAmount() {
    return this.#total;
  }

  /** Stock may have changed since the transaction was prepared, so check again. */
  validate() {
    if (this.#quantity > this.#product.getStock()) {
      throw new InsufficientStockError(this.#product.getName(), this.#quantity, this.#product.getStock());
    }
  }

  /** Used by subclasses before undoing: makes sure the stock can be restored. */
  checkStockCanBeRestored() {
    if (!this.#product.canReverseSale(this.#quantity)) {
      throw new StoreError('Cannot undo: the stock and sales of ' + this.#product.getName()
        + ' no longer match this transaction.');
    }
  }

  /** e.g. "3 x Milo Sachet @ PHP 9.00" */
  getDetails() {
    return this.#quantity + ' x ' + this.#product.getName() + ' @ ' + Money.format(this.#unitPrice);
  }
}

/**
 * A sale paid in cash.
 * Record: stock DOWN, total sold UP, cash sales UP.
 * Undo:   stock UP,   total sold DOWN, cash sales DOWN (by the ORIGINAL total).
 */
class CashSaleTransaction extends ProductTransaction {
  #register;

  constructor(product, quantity, register) {
    super(TransactionType.CASH_SALE, product, quantity);
    if (!(register instanceof CashRegister)) {
      throw new IllegalArgumentError('A cash register is required for a cash sale.');
    }
    this.#register = register;
  }

  applyChanges() {
    this.getProduct().sell(this.getQuantity());   // checked by validate(), so this cannot fail halfway
    this.#register.addSale(this.getTotal());
  }

  reverseChanges() {
    // 1. Check everything first...
    this.checkStockCanBeRestored();
    if (!this.#register.canRemoveSale(this.getTotal())) {
      throw new StoreError("Cannot undo: cash sales are lower than this sale's total.");
    }
    // 2. ...then change the records.
    this.getProduct().reverseSale(this.getQuantity());
    this.#register.removeSale(this.getTotal());
  }

  /** The receipt as label/value rows, in the same order as the Java receipt. */
  getReceipt() {
    return {
      title: 'CASH SALE RECEIPT',
      rows: [
        { key: 'number', label: 'Transaction no.', value: '#' + this.getNumber() },
        { key: 'time', label: 'Date and time', value: this.getRecordedAtText() },
        { key: 'product', label: 'Product', value: this.getProduct().getName() },
        { key: 'quantity', label: 'Quantity', value: String(this.getQuantity()) },
        { key: 'price', label: 'Unit price', value: Money.format(this.getUnitPrice()) },
        { key: 'total', label: 'TOTAL', value: Money.format(this.getTotal()), strong: true },
        { key: 'stock', label: 'Stock left', value: String(this.getProduct().getStock()) }
      ]
    };
  }

  getUndoResult() {
    return this.getProduct().getName() + ' stock is back to ' + this.getProduct().getStock()
      + '. Cash sales are now ' + Money.format(this.#register.getTotal()) + '.';
  }
}

/**
 * A sale on credit (utang).
 * Record: stock DOWN, total sold UP, customer balance UP, entry added to history.
 *         Cash sales do NOT change: no cash was received.
 * Undo:   stock UP, total sold DOWN, balance DOWN; the history entry stays, marked UNDONE.
 */
class UtangTransaction extends ProductTransaction {
  #customer;

  constructor(customer, product, quantity) {
    super(TransactionType.UTANG, product, quantity);
    if (!(customer instanceof Customer)) {
      throw new IllegalArgumentError('A customer must be selected.');
    }
    this.#customer = customer;
  }

  getCustomer() {
    return this.#customer;
  }

  /**
   * The pay-first message, e.g. "Aling Nena still owes PHP 20.00. Pay the
   * full balance first (Record utang payment) before getting another utang."
   * Kept in one place so the screen and validate() always say the same thing.
   */
  static payFirstMessage(customer) {
    return customer.getName() + ' still owes ' + Money.format(customer.getBalance())
      + '. Pay the full balance first (Record utang payment) before getting another utang.';
  }

  /**
   * PAY-FIRST RULE (mirrors UtangTransaction.validate() in Java): a customer
   * who still owes money cannot get another utang until the WHOLE balance is
   * paid. Checked right before the utang is recorded, so the rule cannot be
   * skipped. Then the parent class (ProductTransaction) checks the stock.
   */
  validate() {
    if (this.#customer.hasOutstandingUtang()) {
      throw new StoreError(UtangTransaction.payFirstMessage(this.#customer));
    }
    super.validate();
  }

  applyChanges() {
    this.getProduct().sell(this.getQuantity());
    this.#customer.addDebt(this.getTotal());
    this.#customer.addHistory(this);
  }

  reverseChanges() {
    // 1. Check everything first...
    this.checkStockCanBeRestored();
    if (this.getTotal() > this.#customer.getBalance()) {
      throw new StoreError('Cannot undo: ' + this.#customer.getName()
        + "'s balance is lower than this utang.");
    }
    // 2. ...then change the records.
    this.getProduct().reverseSale(this.getQuantity());
    this.#customer.reduceDebt(this.getTotal());
  }

  getBalanceEffect() {
    return this.getTotal();   // utang increases the balance
  }

  /** e.g. "Aling Nena: 2 x Egg @ PHP 10.00" */
  getDetails() {
    return this.#customer.getName() + ': ' + super.getDetails();
  }

  /** In the customer's own history the name is not repeated: "2 x Egg @ PHP 10.00". */
  getHistoryDetails() {
    return super.getDetails();
  }

  getReceipt() {
    return {
      title: 'UTANG RECORD',
      rows: [
        { key: 'number', label: 'Transaction no.', value: '#' + this.getNumber() },
        { key: 'time', label: 'Date and time', value: this.getRecordedAtText() },
        { key: 'customer', label: 'Customer', value: this.#customer.getName() },
        { key: 'product', label: 'Product', value: this.getProduct().getName() },
        { key: 'quantity', label: 'Quantity', value: String(this.getQuantity()) },
        { key: 'price', label: 'Unit price', value: Money.format(this.getUnitPrice()) },
        { key: 'total', label: 'TOTAL UTANG', value: Money.format(this.getTotal()), strong: true },
        { key: 'balance', label: 'New balance', value: Money.format(this.#customer.getBalance()) },
        { key: 'stock', label: 'Stock left', value: String(this.getProduct().getStock()) }
      ]
    };
  }

  getUndoResult() {
    return this.#customer.getName() + "'s balance is now " + Money.format(this.#customer.getBalance())
      + '. ' + this.getProduct().getName() + ' stock is back to ' + this.getProduct().getStock() + '.';
  }
}

/**
 * A customer paying part or all of their utang.
 * Record: balance DOWN, entry added to history. Cash sales do NOT change.
 * Undo:   balance UP by the original payment; the history entry stays, marked UNDONE.
 */
class PaymentTransaction extends Transaction {
  #customer;
  #amount;

  /** @throws StoreError if the amount is not allowed for this customer */
  constructor(customer, amount) {
    super(TransactionType.PAYMENT);
    if (!(customer instanceof Customer)) {
      throw new IllegalArgumentError('A customer must be selected.');
    }
    if (typeof amount !== 'number') {
      throw new IllegalArgumentError('A payment amount is required.');
    }
    this.#customer = customer;
    this.#amount = amount;
    this.#checkPaymentRules();   // reject a bad payment as early as possible
  }

  /** Checked again just before recording, in case the balance changed. */
  validate() {
    this.#checkPaymentRules();
  }

  #checkPaymentRules() {
    if (!this.#customer.hasOutstandingUtang()) {
      throw new StoreError(this.#customer.getName() + ' has no outstanding utang. Payment rejected.');
    }
    if (!Money.isPositive(this.#amount)) {
      throw new StoreError('The payment must be greater than zero.');
    }
    if (!Money.isWholeCentavos(this.#amount)) {
      throw new StoreError('The payment can have at most two decimal places.');
    }
    if (this.#amount > this.#customer.getBalance()) {
      throw new StoreError('Overpayment rejected: ' + Money.format(this.#amount) + ' is more than '
        + this.#customer.getName() + "'s balance of " + Money.format(this.#customer.getBalance()) + '.');
    }
  }

  applyChanges() {
    this.#customer.reduceDebt(this.#amount);
    this.#customer.addHistory(this);
  }

  reverseChanges() {
    this.#customer.addDebt(this.#amount);   // adding a positive amount cannot fail
  }

  getCustomer() {
    return this.#customer;
  }

  getAmount() {
    return this.#amount;
  }

  getBalanceEffect() {
    return -this.#amount;   // a payment decreases the balance
  }

  getDetails() {
    return 'Payment from ' + this.#customer.getName();
  }

  getHistoryDetails() {
    return 'Payment received';
  }

  getReceipt() {
    return {
      title: 'PAYMENT RECEIPT',
      rows: [
        { key: 'number', label: 'Transaction no.', value: '#' + this.getNumber() },
        { key: 'time', label: 'Date and time', value: this.getRecordedAtText() },
        { key: 'customer', label: 'Customer', value: this.#customer.getName() },
        { key: 'paid', label: 'Amount paid', value: Money.format(this.#amount), strong: true },
        { key: 'balance', label: 'Balance left', value: Money.format(this.#customer.getBalance()) }
      ]
    };
  }

  getUndoResult() {
    return this.#customer.getName() + "'s balance is back to " + Money.format(this.#customer.getBalance()) + '.';
  }
}

/**
 * A stock delivery (mirrors RestockTransaction.java).
 * Record: stock UP by the quantity received. Total sold, cash sales and
 *         customer balances do NOT change.
 * Undo:   stock DOWN by the same quantity.
 */
class RestockTransaction extends Transaction {
  #product;
  #quantity;

  /** @throws StoreError if the quantity would not keep the stock within the limit */
  constructor(product, quantity) {
    super(TransactionType.RESTOCK);
    if (!(product instanceof Product)) {
      throw new IllegalArgumentError('A product must be selected.');
    }
    this.#product = product;
    this.#quantity = quantity;
    this.validate();
  }

  validate() {
    if (!Number.isInteger(this.#quantity) || this.#quantity <= 0
        || this.#quantity > Product.MAX_STOCK - this.#product.getStock()) {
      throw new StoreError('The quantity must be positive and keep stock at or below ' + Product.MAX_STOCK + '.');
    }
  }

  applyChanges() {
    this.#product.addStock(this.#quantity);
  }

  reverseChanges() {
    this.#product.reverseRestock(this.#quantity);
  }

  getProduct() {
    return this.#product;
  }

  getQuantity() {
    return this.#quantity;
  }

  /** A restock involves no money. */
  getAmount() {
    return Money.ZERO;
  }

  /** e.g. "Received 20 piece(s) of Milo Sachet" */
  getDetails() {
    return 'Received ' + this.#quantity + ' piece(s) of ' + this.#product.getName();
  }

  getReceipt() {
    return {
      title: 'RESTOCK RECORD',
      rows: [
        { key: 'number', label: 'Transaction no.', value: '#' + this.getNumber() },
        { key: 'product', label: 'Product', value: this.#product.getName() },
        { key: 'received', label: 'Quantity received', value: String(this.#quantity) },
        { key: 'stock', label: 'Stock', value: String(this.#product.getStock()), strong: true }
      ]
    };
  }

  getUndoResult() {
    return this.#product.getName() + ' stock is back to ' + this.#product.getStock() + '.';
  }
}
