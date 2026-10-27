# Sari-Sari Store: Debt (Utang) and Stock Management System

A web version of our Data Structures and Algorithms project. It records a
sari-sari store's products, cash sales, utang (credit), utang payments and
restocks, with undo, using the same 12 menu options, rules, messages and
sample data as the Java console program.

Plain HTML, CSS and JavaScript: no frameworks, no build step, no internet
needed.

## Run it

- **On your computer:** double-click `index.html` (Chrome, Edge, Firefox or Safari).
- **On Vercel:** import this repository, choose the **Other** framework preset,
  and leave the build command and output directory empty. Vercel serves
  `index.html` from the root.

All records are kept in memory only. Reloading or closing the page clears
them and starts again from the sample data (7 products, 3 customers).

**Phones first:** the layout is built for phones and grows for tablets and
computers. On a phone, the store name and a **Menu** button stay at the top,
steps show as "Step 2 of 4" with a progress bar, and buttons fill the width so
they are easy to tap. From about 960 px wide the menu sits on the left.

**Text size:** choose **A−** (smaller), **A** (normal), **A+** or **A++**
(larger) at the top of any page. The choice is remembered on that device.

**Restocking:** choose *Restock product*, pick a product (out-of-stock ones
included) and enter the number of pieces received. For example, Lucky Me
Pancit Canton with 4 pieces plus a delivery of 20 becomes 24. Stock cannot go
above 1,000,000 pieces. Restocking does not change sales, cash sales or
customer balances, and it can be reversed with *Undo last transaction*.

**Pay first before another utang:** a customer who still owes money cannot
get another utang. Choosing them in *Record utang* shows an error asking for
the full balance to be paid first with *Record utang payment*. Once the
balance is fully paid (PHP 0.00), the customer can get utang again. This
matches the Java program's rule, including the safety check in
`UtangTransaction.validate()`.

**Whole numbers** (quantities and stock) are typed without leading zeros:
`05` is rejected, while a single `0` is accepted where the range allows it.

**Product codes** must contain at least one letter or number, so a code such
as `---` is rejected.

## Data structures and algorithms

| Requirement | Where |
|---|---|
| Binary search | `Algorithms.binarySearch()`: exact product and customer names |
| Linear search | `Algorithms.linearSearch()` / `linearSearchAll()`: product codes, partial names, low stock, customers with utang |
| Merge sort (stable) | `Algorithms.mergeSort()` / `sortedCopy()`: A-Z lists, price, stock, best sellers, balances |
| Stack (LIFO) | `UndoStack`: undo the last cash sale, utang, payment or restock |
| Arrays | Master product and customer lists, each customer's history |

All of these are written by hand in `js/algorithms.js` and `js/records.js`;
no built-in sort or search is used for them.

## Files

| Folder / file | What it holds |
|---|---|
| `js/money.js`, `js/text-rules.js` | Money as whole centavos, number and name rules |
| `js/errors.js` | `StoreError`, `DuplicateRecordError`, `InsufficientStockError` |
| `js/algorithms.js` | Binary search, linear search and merge sort |
| `js/models.js`, `js/records.js` | `Product`, `Customer`, `CashRegister`, `Inventory`, `CustomerRecords`, `UndoStack` |
| `js/transactions.js` | `Transaction` and its subclasses: cash sale, utang, payment, restock (record and undo) |
| `js/sample-data.js` | The startup products and customers |
| `js/ui/` | One file per screen, plus shared components |
| `css/styles.css` | All styles |
