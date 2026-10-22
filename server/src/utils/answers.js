export function answersMatch(submitted, solution) {
  if (submitted === null || submitted === undefined) return false;
  const text = String(submitted).trim();
  if (!/^-?\d+$/.test(text)) return false;
  return Number(text) === Number(solution);
}

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function buildHint(solution) {
  const value = Number(solution);
  const digits = String(Math.abs(value)).length;
  const digitWord = DIGIT_WORDS[digits] || `${digits}`;
  const parity = value % 2 === 0 ? 'even' : 'odd';
  const sign = value < 0 ? 'negative ' : '';
  return `The answer is a ${sign}${digitWord}-digit ${parity} integer.`;
}
