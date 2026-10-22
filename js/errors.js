/*
 * Error classes (mirror the Java exception hierarchy).
 *
 *     Error
 *       ├── IllegalArgumentError        (invalid data reached a class: a programming or input problem)
 *       └── StoreError                  (a business rule was broken)
 *             ├── DuplicateRecordError
 *             └── InsufficientStockError
 *
 * Because DuplicateRecordError and InsufficientStockError extend StoreError,
 * one `instanceof StoreError` check handles all of them (polymorphism).
 */

class IllegalArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IllegalArgumentError';
  }
}

class StoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StoreError';
  }
}

/** A product code, product name, or customer name is already used. */
class DuplicateRecordError extends StoreError {
  constructor(message) {
    super(message);
    this.name = 'DuplicateRecordError';
  }
}

/** A sale or utang asks for more pieces than are on the shelf. */
class InsufficientStockError extends StoreError {
  #requested;
  #available;

  constructor(productName, requested, available) {
    super(InsufficientStockError.buildMessage(productName, requested, available));
    this.name = 'InsufficientStockError';
    this.#requested = requested;
    this.#available = available;
  }

  static buildMessage(productName, requested, available) {
    if (available === 0) {
      return productName + ' is out of stock.';
    }
    return 'Not enough stock for ' + productName + ': you asked for ' + requested
      + ', but only ' + available + ' ' + (available === 1 ? 'piece is' : 'pieces are')
      + ' available.';
  }

  getRequested() {
    return this.#requested;
  }

  getAvailable() {
    return this.#available;
  }
}
