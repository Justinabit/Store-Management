/*
 * Money helper (mirrors Money.java and InputHelper.readMoney()).
 *
 * Why integer centavos and not decimal numbers?
 *   JavaScript numbers cannot store some decimals exactly
 *   (0.1 + 0.2 = 0.30000000000000004). The Java program uses BigDecimal for
 *   this reason. Here every amount is a whole number of centavos, so
 *   PHP 12.50 is stored as 1250 and all sums stay exact.
 */
const Money = (function () {

  /** PHP 0.00 */
  const ZERO = 0;

  /** The smallest price or payment: PHP 0.01 */
  const ONE_CENTAVO = 1;

  /** The largest price or payment: PHP 1,000,000.00 */
  const MAX_AMOUNT = 100000000;

  /** At most 7 digits before the decimal point (same as the Java program). */
  const MAX_MONEY_DIGITS = 7;

  /** Formats centavos as "PHP 1,250.50". Negative amounts are shown without the sign. */
  function format(centavos) {
    let value = Math.abs(centavos || 0);
    let pesos = Math.floor(value / 100);
    let cents = value % 100;
    let pesoText = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return 'PHP ' + pesoText + '.' + (cents < 10 ? '0' : '') + cents;
  }

  /** "+PHP 20.00" for positive amounts, "-PHP 10.00" for negative ones. */
  function formatSigned(centavos) {
    return (centavos >= 0 ? '+' : '-') + format(centavos);
  }

  /**
   * Checks typed money text and converts it to centavos.
   * Uses the same checks, in the same order, as InputHelper.readMoney().
   *
   * @return {{value: number}} or {{error: string}}
   */
  function parse(rawText, min, max) {
    let text = String(rawText == null ? '' : rawText).trim();

    if (text === '') {
      return { error: 'Please enter an amount.' };
    }
    if (text.charAt(0) === '-') {
      return { error: 'The amount cannot be negative.' };
    }
    if (text.indexOf(',') !== -1) {
      return { error: 'Please type the amount without commas, e.g. 1500.50' };
    }
    // Only digits, with an optional decimal part: this rejects NaN,
    // Infinity, 1e3, letters and symbols in one check.
    if (!/^\d+(\.\d+)?$/.test(text)) {
      return { error: '"' + text + '" is not a valid amount. Type a plain amount such as 9 or 9.50' };
    }
    let parts = text.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      return { error: 'Please use at most two decimal places (centavos), e.g. 9.75' };
    }
    let wholePart = parts[0].replace(/^0+(?=\d)/, '');
    if (wholePart.length > MAX_MONEY_DIGITS) {
      return { error: 'That amount is too large.' };
    }

    // Build the centavos from the text itself, never from a decimal number.
    let decimals = parts.length === 2 ? (parts[1] + '00').slice(0, 2) : '00';
    let centavos = parseInt(wholePart, 10) * 100 + parseInt(decimals, 10);

    if (centavos < min || centavos > max) {
      return { error: 'Please enter an amount from ' + format(min) + ' to ' + format(max) + '.' };
    }
    return { value: centavos };
  }

  /** True if the amount is greater than zero. */
  function isPositive(centavos) {
    return typeof centavos === 'number' && centavos > 0;
  }

  /** True if the amount is a whole number of centavos (at most two decimal places). */
  function isWholeCentavos(centavos) {
    return Number.isSafeInteger(centavos);
  }

  return {
    ZERO: ZERO,
    ONE_CENTAVO: ONE_CENTAVO,
    MAX_AMOUNT: MAX_AMOUNT,
    format: format,
    formatSigned: formatSigned,
    parse: parse,
    isPositive: isPositive,
    isWholeCentavos: isWholeCentavos
  };
})();

/*
 * Whole numbers (mirrors InputHelper.parseWholeNumber()).
 * Rejects blank text, negative numbers, decimals, letters and numbers too
 * large for a Java int, with the same messages as the console program.
 *
 * @return {{value: number}} or {{error: string}}
 */
const WholeNumber = (function () {
  const JAVA_INT_MAX = 2147483647;

  function parse(rawText, min, max) {
    let text = String(rawText == null ? '' : rawText).trim();

    if (text === '') {
      return { error: 'Please enter a number.' };
    }
    if (text.charAt(0) === '-') {
      return { error: 'Negative numbers are not allowed.' };
    }
    if (text.indexOf('.') !== -1) {
      return { error: 'Please enter a whole number (no decimals).' };
    }
    if (!/^\d+$/.test(text)) {
      return { error: '"' + text + '" is not a number. Please type digits only.' };
    }
    let digits = text.replace(/^0+(?=\d)/, '');
    if (digits.length > 10 || Number(digits) > JAVA_INT_MAX) {
      return { error: 'That number is too large.' };
    }
    let value = Number(digits);
    if (value < min || value > max) {
      return { error: 'Please enter a number from ' + min + ' to ' + max + '.' };
    }
    return { value: value };
  }

  return { parse: parse };
})();
