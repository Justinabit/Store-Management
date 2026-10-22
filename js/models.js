/*
 * Product, Customer and CashRegister (mirror Product.java, Customer.java
 * and CashRegister.java).
 *
 * ENCAPSULATION: every field is private (#field). Other code can read the
 * values through getters, but can only change them through methods that
 * check the rules first, so an object can never be in an invalid state.
 * Money is always whole centavos (see money.js).
 */

class Product {
  /** Highest stock quantity accepted for one product. */
  static MAX_STOCK = 1000000;

  #code;        // never changes after creation
  #name;
  #price;       // centavos
  #stock;
  #totalSold;

  /** @throws IllegalArgumentError if any value breaks the rules */
  constructor(code, name, price, stock) {
    this.#code = Product.#requireValidCode(code);
    this.#name = Product.#requireValidName(name);
    this.#price = Product.#requireValidPrice(price);
    this.#stock = Product.#requireValidStock(stock);
    this.#totalSold = 0;
  }

  getCode() {
    return this.#code;
  }

  getName() {
    return this.#name;
  }

  getPrice() {
    return this.#price;
  }

  getStock() {
    return this.#stock;
  }

  getTotalSold() {
    return this.#totalSold;
  }

  /** True when the stock is at or below the limit (zero stock included). */
  isLowStock(limit) {
    return this.#stock <= limit;
  }

  /**
   * Takes items off the shelf for a cash sale or utang: stock DOWN, total sold UP.
   * Everything is checked first, so a failed sale changes nothing.
   */
  sell(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new StoreError('The quantity must be at least 1.');
    }
    if (quantity > this.#stock) {
      throw new InsufficientStockError(this.#name, quantity, this.#stock);
    }
    let newTotalSold = this.#totalSold + quantity;
    if (newTotalSold > 2147483647) {   // same limit as a Java int
      throw new StoreError('The total sold for ' + this.#name + ' is too large to record.');
    }
    this.#stock = this.#stock - quantity;
    this.#totalSold = newTotalSold;
  }

  /** True if a sale of this quantity can be reversed (used by undo). */
  canReverseSale(quantity) {
    return quantity > 0 && quantity <= this.#totalSold && quantity <= Product.MAX_STOCK - this.#stock;
  }

  /** Puts items back when a sale or utang is UNDONE: stock UP, total sold DOWN. */
  reverseSale(quantity) {
    if (!this.canReverseSale(quantity)) {
      throw new StoreError('Cannot return ' + quantity + ' piece(s) of ' + this.#name
        + ' to stock: the recorded sales do not allow it.');
    }
    this.#stock = this.#stock + quantity;
    this.#totalSold = this.#totalSold - quantity;
  }

  /** Adds delivered pieces without changing the total sold. */
  addStock(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > Product.MAX_STOCK - this.#stock) {
      throw new StoreError('Quantity received must be from 1 to ' + (Product.MAX_STOCK - this.#stock) + '.');
    }
    this.#stock = this.#stock + quantity;
  }

  /** Removes a previously recorded delivery when it is undone. */
  reverseRestock(quantity) {
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > this.#stock) {
      throw new StoreError('Cannot undo restock: there are not enough pieces in stock.');
    }
    this.#stock = this.#stock - quantity;
  }

  static #requireValidCode(code) {
    let problem = TextRules.checkCode(code);
    if (problem !== null) {
      throw new IllegalArgumentError(problem);
    }
    return TextRules.clean(code).toUpperCase();
  }

  static #requireValidName(name) {
    let problem = TextRules.checkName(name);
    if (problem !== null) {
      throw new IllegalArgumentError(problem);
    }
    return TextRules.clean(name);
  }

  static #requireValidPrice(price) {
    if (!Money.isWholeCentavos(price) || !Money.isPositive(price)) {
      throw new IllegalArgumentError('The price must be greater than zero.');
    }
    if (price > Money.MAX_AMOUNT) {
      throw new IllegalArgumentError('The price cannot be more than ' + Money.format(Money.MAX_AMOUNT) + '.');
    }
    return price;
  }

  static #requireValidStock(stock) {
    if (!Number.isInteger(stock) || stock < 0) {
      throw new IllegalArgumentError('The stock cannot be negative.');
    }
    if (stock > Product.MAX_STOCK) {
      throw new IllegalArgumentError('The stock cannot be more than ' + Product.MAX_STOCK + '.');
    }
    return stock;
  }

  /** e.g. "P001 - Milo Sachet (PHP 9.00, stock 40)" */
  toString() {
    return this.#code + ' - ' + this.#name + ' (' + Money.format(this.#price) + ', stock ' + this.#stock + ')';
  }
}

/**
 * A customer who may buy on credit (utang). The balance can only change
 * through addDebt() and reduceDebt(), so it can never become negative.
 * getHistory() returns a COPY, so the history cannot be changed from outside.
 */
class Customer {
  #name;
  #balance;     // centavos
  #history;     // utang and payment transactions, oldest first

  /** @throws IllegalArgumentError if the name breaks the name rules */
  constructor(name) {
    let problem = TextRules.checkName(name);
    if (problem !== null) {
      throw new IllegalArgumentError(problem);
    }
    this.#name = TextRules.clean(name);
    this.#balance = Money.ZERO;
    this.#history = [];
  }

  getName() {
    return this.#name;
  }

  getBalance() {
    return this.#balance;
  }

  /** True if the customer still owes money. */
  hasOutstandingUtang() {
    return this.#balance > 0;
  }

  /** A COPY of the history (oldest first). */
  getHistory() {
    return Algorithms.copyList(this.#history);
  }

  /** Increases the balance (utang recorded, or a payment undone). For transactions only. */
  addDebt(amount) {
    if (!Money.isPositive(amount)) {
      throw new IllegalArgumentError('The amount added to a balance must be greater than zero.');
    }
    if (this.#balance + amount > Number.MAX_SAFE_INTEGER) {
      throw new StoreError('The balance of ' + this.#name + ' is too large to record.');
    }
    this.#balance = this.#balance + amount;
  }

  /** Decreases the balance (payment recorded, or an utang undone). For transactions only. */
  reduceDebt(amount) {
    if (!Money.isPositive(amount)) {
      throw new StoreError('The amount must be greater than zero.');
    }
    if (amount > this.#balance) {
      throw new StoreError('The amount ' + Money.format(amount) + ' is more than '
        + this.#name + "'s balance of " + Money.format(this.#balance) + '.');
    }
    this.#balance = this.#balance - amount;
  }

  /** Adds an utang or payment to the end of the history. For transactions only. */
  addHistory(transaction) {
    if (!transaction) {
      throw new IllegalArgumentError('A history entry cannot be empty.');
    }
    this.#history.push(transaction);
  }

  toString() {
    return this.#name + ' (balance ' + Money.format(this.#balance) + ')';
  }
}

/**
 * Keeps the total of CASH SALES for the current session. Utang sales and
 * payments are NOT added here: utang is money not yet received, and
 * payments are tracked on each customer's balance.
 */
class CashRegister {
  #cashSales = Money.ZERO;

  getTotal() {
    return this.#cashSales;
  }

  /** Adds the amount of a recorded cash sale. */
  addSale(amount) {
    if (!Money.isPositive(amount)) {
      throw new IllegalArgumentError('A cash sale amount must be greater than zero.');
    }
    if (this.#cashSales + amount > Number.MAX_SAFE_INTEGER) {
      throw new StoreError('The cash sales total is too large to record.');
    }
    this.#cashSales = this.#cashSales + amount;
  }

  /** True if this amount can be subtracted without going below zero. */
  canRemoveSale(amount) {
    return Money.isPositive(amount) && amount <= this.#cashSales;
  }

  /** Subtracts the amount of an undone cash sale. */
  removeSale(amount) {
    if (!this.canRemoveSale(amount)) {
      throw new StoreError('Cannot subtract ' + Money.format(amount)
        + ' from cash sales of ' + Money.format(this.#cashSales) + '.');
    }
    this.#cashSales = this.#cashSales - amount;
  }
}
