/*
 * Inventory, CustomerRecords and UndoStack (mirror the Java classes).
 *
 * The master product and customer lists are ALWAYS kept in alphabetical
 * order, because binary search only works on a sorted list. Every other
 * order (price, stock, best sellers, balance) is made on a COPY, so the
 * master lists never change order. Getters return copies.
 */

/** Stores and manages all products. */
class Inventory {

  /** Lowest price first. */
  static BY_PRICE = function (a, b) {
    return a.getPrice() - b.getPrice();
  };

  /** Lowest stock first. */
  static BY_STOCK = function (a, b) {
    return a.getStock() - b.getStock();
  };

  /** Highest total sold first. */
  static BY_TOTAL_SOLD_DESC = function (a, b) {
    return b.getTotalSold() - a.getTotalSold();
  };

  #products = [];

  /**
   * Adds a product, then uses MERGE SORT to restore alphabetical order.
   * @throws DuplicateRecordError if the code or name is already used
   */
  addProduct(product) {
    if (!(product instanceof Product)) {
      throw new IllegalArgumentError('The product cannot be empty.');
    }
    let sameCode = this.findByCode(product.getCode());
    if (sameCode !== null) {
      throw new DuplicateRecordError('Product code ' + product.getCode()
        + ' is already used by "' + sameCode.getName() + '".');
    }
    let sameName = this.findByName(product.getName());
    if (sameName !== null) {
      throw new DuplicateRecordError('A product named "' + sameName.getName()
        + '" already exists (code ' + sameName.getCode() + ').');
    }
    this.#products.push(product);
    Algorithms.mergeSort(this.#products, Algorithms.BY_NAME);
  }

  /** Exact name lookup using BINARY SEARCH. Returns null if not found. */
  findByName(name) {
    if (TextRules.clean(name) === '') {
      return null;
    }
    let index = Algorithms.binarySearch(this.#products, Algorithms.nameKey(name), Algorithms.BY_NAME);
    return index >= 0 ? this.#products[index] : null;
  }

  /**
   * Exact code lookup using LINEAR SEARCH (the list is sorted by name, not
   * by code, so binary search cannot be used here). Returns null if not found.
   */
  findByCode(code) {
    let wanted = TextRules.clean(code).toUpperCase();
    if (wanted === '') {
      return null;
    }
    let index = Algorithms.linearSearch(this.#products, function (p) {
      return p.getCode() === wanted;
    });
    return index >= 0 ? this.#products[index] : null;
  }

  /** Partial name lookup using LINEAR SEARCH, e.g. "pan" finds "Lucky Me Pancit Canton". */
  searchPartial(keyword) {
    let wanted = TextRules.clean(keyword).toLowerCase();
    if (wanted === '') {
      return [];
    }
    return Algorithms.linearSearchAll(this.#products, function (p) {
      return p.getName().toLowerCase().includes(wanted);
    });
  }

  /** All products in alphabetical order (a copy). */
  getAllProducts() {
    return Algorithms.copyList(this.#products);
  }

  /** A copy of the products sorted with merge sort in the given order. */
  getSortedCopy(order) {
    return Algorithms.sortedCopy(this.#products, order);
  }

  /** Products with stock at or below the limit (zero included), lowest stock first. */
  getLowStockProducts(limit) {
    let low = Algorithms.linearSearchAll(this.#products, function (p) {
      return p.isLowStock(limit);
    });
    Algorithms.mergeSort(low, Inventory.BY_STOCK);   // sorting the new list, not the master list
    return low;
  }

  /** Up to maxCount products that HAVE sales, most sold first. */
  getBestSellers(maxCount) {
    let sorted = Algorithms.sortedCopy(this.#products, Inventory.BY_TOTAL_SOLD_DESC);
    let result = [];
    for (let i = 0; i < sorted.length && result.length < maxCount; i++) {
      if (sorted[i].getTotalSold() > 0) {   // products with zero sales are excluded
        result.push(sorted[i]);
      }
    }
    return result;
  }

  /** How many products are out of stock, low (1 to limit) and OK. Used by the Home screen. */
  countByStockStatus(limit) {
    let counts = { ok: 0, low: 0, out: 0 };
    for (let i = 0; i < this.#products.length; i++) {
      let stock = this.#products[i].getStock();
      if (stock === 0) {
        counts.out++;
      } else if (stock <= limit) {
        counts.low++;
      } else {
        counts.ok++;
      }
    }
    return counts;
  }

  size() {
    return this.#products.length;
  }

  isEmpty() {
    return this.#products.length === 0;
  }
}

/** Stores and manages all utang customers, kept in alphabetical order. */
class CustomerRecords {

  /** Highest balance first. */
  static BY_BALANCE_DESC = function (a, b) {
    return b.getBalance() - a.getBalance();
  };

  #customers = [];

  /**
   * Adds a customer, then uses MERGE SORT to restore alphabetical order.
   * @throws DuplicateRecordError if a customer with the same name exists
   */
  addCustomer(customer) {
    if (!(customer instanceof Customer)) {
      throw new IllegalArgumentError('The customer cannot be empty.');
    }
    let existing = this.findByName(customer.getName());
    if (existing !== null) {
      throw new DuplicateRecordError('A customer named "' + existing.getName() + '" already exists.');
    }
    this.#customers.push(customer);
    Algorithms.mergeSort(this.#customers, Algorithms.BY_NAME);
  }

  /**
   * Removes a customer. Used to roll back a NEW customer if their first
   * utang could not be recorded.
   * @return true if the customer was removed
   */
  removeCustomer(customer) {
    let index = Algorithms.linearSearch(this.#customers, function (c) {
      return c === customer;
    });
    if (index < 0) {
      return false;
    }
    this.#customers.splice(index, 1);   // removing keeps the others in order
    return true;
  }

  /** Exact name lookup using BINARY SEARCH. Returns null if not found. */
  findByName(name) {
    if (TextRules.clean(name) === '') {
      return null;
    }
    let index = Algorithms.binarySearch(this.#customers, Algorithms.nameKey(name), Algorithms.BY_NAME);
    return index >= 0 ? this.#customers[index] : null;
  }

  /** Partial name lookup using LINEAR SEARCH, e.g. "nena" finds "Aling Nena". */
  searchPartial(keyword) {
    let wanted = TextRules.clean(keyword).toLowerCase();
    if (wanted === '') {
      return [];
    }
    return Algorithms.linearSearchAll(this.#customers, function (c) {
      return c.getName().toLowerCase().includes(wanted);
    });
  }

  /** Customers who still owe money, highest balance first (a sorted copy). */
  getCustomersWithUtang() {
    let owing = Algorithms.linearSearchAll(this.#customers, function (c) {
      return c.hasOutstandingUtang();
    });
    Algorithms.mergeSort(owing, CustomerRecords.BY_BALANCE_DESC);
    return owing;
  }

  /** The sum of all customers' balances. */
  getTotalOutstanding() {
    let total = Money.ZERO;
    for (let i = 0; i < this.#customers.length; i++) {
      total = total + this.#customers[i].getBalance();
    }
    return total;
  }

  /** All customers in alphabetical order (a copy). */
  getAllCustomers() {
    return Algorithms.copyList(this.#customers);
  }

  size() {
    return this.#customers.length;
  }

  isEmpty() {
    return this.#customers.length === 0;
  }
}

/**
 * The undo stack. STACK = LIFO (Last In, First Out): the last transaction
 * pushed is the first one undone. The array is private, so nobody can
 * remove a transaction from the middle.
 */
class UndoStack {
  #stack = [];

  /** Puts a transaction on top. Only recorded, active transactions are allowed. */
  push(transaction) {
    if (!(transaction instanceof Transaction) || !transaction.isActive()) {
      throw new IllegalArgumentError('Only successfully recorded transactions can be added to the undo stack.');
    }
    this.#stack.push(transaction);
  }

  /** Removes and returns the top transaction, or null if the stack is empty. */
  pop() {
    if (this.#stack.length === 0) {
      return null;
    }
    return this.#stack.pop();
  }

  /** Returns the top transaction WITHOUT removing it, or null if the stack is empty. */
  peek() {
    if (this.#stack.length === 0) {
      return null;
    }
    return this.#stack[this.#stack.length - 1];
  }

  isEmpty() {
    return this.#stack.length === 0;
  }

  size() {
    return this.#stack.length;
  }
}
