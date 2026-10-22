/*
 * The searching and sorting algorithms of the system, written by hand
 * (mirrors Algorithms.java). No Array.prototype.sort, find, indexOf or
 * filter is used for this logic.
 *
 *   binarySearch()    - exact name lookups            O(log n)
 *   linearSearch()    - product code lookup           O(n)
 *   linearSearchAll() - partial names, low stock      O(n)
 *   mergeSort()       - every sorted list             O(n log n), stable
 *
 * The functions are generic: a comparator says HOW to compare two items
 * (by name, price, stock, ...), and a condition says whether an item matches.
 */
const Algorithms = (function () {

  /**
   * Case-insensitive name comparison, ignoring surrounding and repeated
   * spaces (like Java's compareToIgnoreCase on cleaned names).
   */
  function compareNames(a, b) {
    let x = TextRules.clean(a).toLowerCase();
    let y = TextRules.clean(b).toLowerCase();
    if (x < y) {
      return -1;
    }
    return x > y ? 1 : 0;
  }

  /**
   * Compares two products or customers by name. The SAME rule is used for
   * sorting and for binary search, which binary search requires.
   */
  function BY_NAME(a, b) {
    return compareNames(a.getName(), b.getName());
  }

  /** Wraps a typed name so it can be compared with products or customers during binary search. */
  function nameKey(name) {
    let cleaned = TextRules.clean(name);
    return {
      getName: function () {
        return cleaned;
      }
    };
  }

  /** A plain copy of a list, so callers can never change the master list. */
  function copyList(list) {
    let copy = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      copy[i] = list[i];
    }
    return copy;
  }

  // ===================================================================
  //  BINARY SEARCH
  // ===================================================================

  /**
   * Finds the key in a list that is SORTED by the same comparator.
   *   1. Look at the MIDDLE element.
   *   2. If it equals the key, we are done.
   *   3. If the key is smaller, search the LEFT half; if bigger, the RIGHT half.
   *   4. Repeat until found, or until first > last (not in the list).
   *
   * @return the index of the key, or -1 if it is not in the list
   */
  function binarySearch(sortedList, key, comparator) {
    let first = 0;
    let last = sortedList.length - 1;

    while (first <= last) {
      let middle = first + Math.floor((last - first) / 2);
      let result = comparator(sortedList[middle], key);

      if (result === 0) {
        return middle;            // found
      } else if (result < 0) {
        first = middle + 1;       // middle is smaller than the key: search the right half
      } else {
        last = middle - 1;        // middle is bigger than the key: search the left half
      }
    }
    return -1;                    // not found
  }

  // ===================================================================
  //  LINEAR SEARCH
  // ===================================================================

  /**
   * Checks the elements one by one and returns the index of the FIRST match.
   * Works even when the list is not sorted by what we are looking for.
   *
   * @return the index of the first match, or -1 if nothing matches
   */
  function linearSearch(list, condition) {
    for (let i = 0; i < list.length; i++) {
      if (condition(list[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Visits every element once and collects each one that matches.
   * Used for partial names and low stock: a partial match can be anywhere,
   * so binary search cannot do this.
   *
   * @return a new list with all matches, in their original order
   */
  function linearSearchAll(list, condition) {
    let matches = [];
    for (let i = 0; i < list.length; i++) {
      if (condition(list[i])) {
        matches.push(list[i]);
      }
    }
    return matches;
  }

  // ===================================================================
  //  MERGE SORT
  // ===================================================================

  /**
   * Sorts the list IN PLACE with merge sort (divide and conquer):
   *   1. A list of 0 or 1 element is already sorted.
   *   2. DIVIDE the list into a left half and a right half.
   *   3. Sort each half (recursion).
   *   4. MERGE the two sorted halves.
   * It is STABLE: equal elements keep their original order.
   */
  function mergeSort(list, comparator) {
    if (list.length > 1) {
      sortRange(list, 0, list.length - 1, comparator);
    }
  }

  /** Returns a SORTED COPY and leaves the original list untouched. */
  function sortedCopy(list, comparator) {
    let copy = copyList(list);
    mergeSort(copy, comparator);
    return copy;
  }

  function sortRange(list, left, right, comparator) {
    if (left >= right) {
      return;                                       // 0 or 1 element: already sorted
    }
    let middle = left + Math.floor((right - left) / 2);
    sortRange(list, left, middle, comparator);      // sort the left half
    sortRange(list, middle + 1, right, comparator); // sort the right half
    merge(list, left, middle, right, comparator);   // combine both halves
  }

  /** Merges list[left..middle] and list[middle+1..right], which are both sorted. */
  function merge(list, left, middle, right, comparator) {
    let leftHalf = [];
    let rightHalf = [];
    for (let a = left; a <= middle; a++) {
      leftHalf.push(list[a]);
    }
    for (let b = middle + 1; b <= right; b++) {
      rightHalf.push(list[b]);
    }

    let i = 0;      // position in leftHalf
    let j = 0;      // position in rightHalf
    let k = left;   // position in the original list

    while (i < leftHalf.length && j < rightHalf.length) {
      // "<= 0" takes from the LEFT half when both are equal: this keeps the sort STABLE.
      if (comparator(leftHalf[i], rightHalf[j]) <= 0) {
        list[k] = leftHalf[i];
        i++;
      } else {
        list[k] = rightHalf[j];
        j++;
      }
      k++;
    }
    // Copy whatever is left over (only one of these loops runs)
    while (i < leftHalf.length) {
      list[k] = leftHalf[i];
      i++;
      k++;
    }
    while (j < rightHalf.length) {
      list[k] = rightHalf[j];
      j++;
      k++;
    }
  }

  return {
    BY_NAME: BY_NAME,
    compareNames: compareNames,
    nameKey: nameKey,
    copyList: copyList,
    binarySearch: binarySearch,
    linearSearch: linearSearch,
    linearSearchAll: linearSearchAll,
    mergeSort: mergeSort,
    sortedCopy: sortedCopy
  };
})();
