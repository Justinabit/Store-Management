/*
 * One working session of the store (what Main.java keeps in its fields),
 * plus the sample data loaded at startup (Main.loadSampleData()).
 * All records live in memory only. A new session starts again from here.
 */

class StoreSession {
  /** A product is low on stock when it has this many pieces or fewer. */
  static LOW_STOCK_LIMIT = 5;

  constructor() {
    this.inventory = new Inventory();
    this.customerRecords = new CustomerRecords();
    this.undoStack = new UndoStack();
    this.cashRegister = new CashRegister();
    this.hasChanges = false;   // only used to warn before the page is closed or reloaded
  }

  /** Marks that something was recorded, so a reload would lose real work. */
  markChanged() {
    this.hasChanges = true;
  }
}

const SampleData = {
  /** The exact notice the console program prints after loading the sample data. */
  NOTICE: 'Loaded 7 demo products (codes P001-P007) and 3 demo customers with zero balances. '
    + 'Records are kept in memory only and are cleared when you exit.',

  /** DEMO RECORDS ONLY: the same products and customers as Main.loadSampleData(). */
  load: function (session) {
    let products = [
      // code    name                        price (centavos)  stock
      ['P001', 'Milo Sachet',               900,   40],
      ['P002', 'Egg',                       1000,  30],
      ['P003', 'Lucky Me Pancit Canton',    1600,  4],    // low
      ['P004', 'Kopiko Coffee Candy',       100,   120],
      ['P005', 'Bear Brand Sachet',         1200,  2],    // low
      ['P006', 'Datu Puti Vinegar 200ml',   1200,  0],    // zero
      ['P007', 'Coke Mismo',                2000,  24]
    ];
    for (let i = 0; i < products.length; i++) {
      let p = products[i];
      session.inventory.addProduct(new Product(p[0], p[1], p[2], p[3]));
    }
    session.customerRecords.addCustomer(new Customer('Aling Nena'));
    session.customerRecords.addCustomer(new Customer('Mang Tonyo'));
    session.customerRecords.addCustomer(new Customer('Ate Joy'));
  },

  /** Creates a fresh session with the sample data, numbering transactions from #1. */
  createSession: function () {
    Transaction.resetNumbering();
    let session = new StoreSession();
    SampleData.load(session);
    return session;
  }
};
