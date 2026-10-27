/*
 * The rules for names and product codes (mirrors TextRules.java), kept in
 * ONE place so the forms and the Product/Customer classes always agree.
 */
const TextRules = (function () {

  const MAX_NAME_LENGTH = 40;
  const MAX_CODE_LENGTH = 10;

  /** The word that cancels an operation in the console program. It cannot be a name or code. */
  const CANCEL_WORD = 'X';

  /** Letters, digits, spaces, apostrophes ( ' and ’ ), hyphens, and . , & ( ) / */
  const NAME_PATTERN = /^[\p{L}\p{N} '’\-.,&()/]+$/u;
  const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

  /** Letters, digits and hyphens, with at least one letter or digit, e.g. "P001" or "SKU-12". */
  const CODE_PATTERN = /^[A-Za-z0-9-]+$/;
  const CODE_HAS_LETTER_OR_DIGIT = /[A-Za-z0-9]/;

  /**
   * Removes spaces at the start and end and turns repeated inner spaces into
   * one, so "  Aling   Nena " becomes "Aling Nena".
   */
  function clean(text) {
    if (text == null) {
      return '';
    }
    return String(text).trim().replace(/\s+/g, ' ');
  }

  /** @return null if the name is valid, otherwise a message explaining the problem */
  function checkName(name) {
    let cleaned = clean(name);
    if (cleaned === '') {
      return 'The name cannot be blank.';
    }
    if (cleaned.length > MAX_NAME_LENGTH) {
      return 'The name can have at most ' + MAX_NAME_LENGTH + ' characters.';
    }
    if (!NAME_PATTERN.test(cleaned)) {
      return 'The name may only contain letters, numbers, spaces, apostrophes, hyphens, and . , & ( ) /';
    }
    if (!HAS_LETTER_OR_DIGIT.test(cleaned)) {
      return 'The name must contain at least one letter or number.';
    }
    if (cleaned.toUpperCase() === CANCEL_WORD) {
      return '"' + CANCEL_WORD + '" is reserved for cancelling and cannot be used as a name.';
    }
    return null;
  }

  /** @return null if the code is valid, otherwise a message explaining the problem */
  function checkCode(code) {
    let cleaned = clean(code);
    if (cleaned === '') {
      return 'The product code cannot be blank.';
    }
    if (cleaned.length > MAX_CODE_LENGTH) {
      return 'The product code can have at most ' + MAX_CODE_LENGTH + ' characters.';
    }
    if (!CODE_PATTERN.test(cleaned)) {
      return 'The product code may only contain letters, numbers and hyphens (no spaces).';
    }
    if (!CODE_HAS_LETTER_OR_DIGIT.test(cleaned)) {
      return 'The product code must contain at least one letter or number.';
    }
    if (cleaned.toUpperCase() === CANCEL_WORD) {
      return '"' + CANCEL_WORD + '" is reserved for cancelling and cannot be used as a code.';
    }
    return null;
  }

  return {
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    MAX_CODE_LENGTH: MAX_CODE_LENGTH,
    clean: clean,
    checkName: checkName,
    checkCode: checkCode
  };
})();
