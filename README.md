# Sari-Sari Store: Debt (Utang) and Stock Management System

A web version of our Data Structures and Algorithms project. It records a
sari-sari store's products, cash sales, utang (credit) and utang payments,
with undo, using the same 11 menu options, rules, messages and sample data
as the Java console program.

Plain HTML, CSS and JavaScript: no frameworks, no build step, no internet
needed.

## Run it

- **On your computer:** double-click `index.html` (Chrome, Edge, Firefox or Safari).
- **On Vercel:** import this repository, choose the **Other** framework preset,
  and leave the build command and output directory empty. Vercel serves
  `index.html` from the root.

All records are kept in memory only. Reloading or closing the page clears
them and starts again from the sample data (7 products, 3 customers).

## Data structures and algorithms

| Requirement | Where |
|---|---|
| Binary search | `Algorithms.binarySearch()`: exact product and customer names |
| Linear search | `Algorithms.linearSearch()` / `linearSearchAll()`: product codes, partial names, low stock, customers with utang |
| Merge sort (stable) | `Algorithms.mergeSort()` / `sortedCopy()`: A-Z lists, price, stock, best sellers, balances |
| Stack (LIFO) | `UndoStack`: undo last transaction |
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
| `js/transactions.js` | `Transaction` and its subclasses (record and undo) |
| `js/sample-data.js` | The startup products and customers |
| `js/ui/` | One file per screen, plus shared components |
| `css/styles.css` | All styles |
