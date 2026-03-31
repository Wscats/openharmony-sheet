/** Column alphabet letters. */
const alphabets: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/** Convert a zero-based column index to a column letter string (e.g., 0 → 'A', 26 → 'AA'). */
export function stringAt(index: number): string {
  let str = '';
  let cindex = index;
  while (cindex >= alphabets.length) {
    cindex /= alphabets.length;
    cindex -= 1;
    str += alphabets[Math.floor(cindex) % alphabets.length];
  }
  const last = index % alphabets.length;
  str += alphabets[last];
  return str;
}

/** Convert a column letter string to a zero-based index (e.g., 'A' → 0, 'AA' → 26). */
export function indexAt(str: string): number {
  let ret = 0;
  for (let i = 0; i < str.length - 1; i += 1) {
    const cindex = str.charCodeAt(i) - 65;
    const exponent = str.length - 1 - i;
    ret += (alphabets.length ** exponent) + (alphabets.length * cindex);
  }
  ret += str.charCodeAt(str.length - 1) - 65;
  return ret;
}

/** Convert a cell reference (e.g., 'B10') to [colIndex, rowIndex]. */
export function expr2xy(src: string): [number, number] {
  let x = '';
  let y = '';
  for (let i = 0; i < src.length; i += 1) {
    if (src.charAt(i) >= '0' && src.charAt(i) <= '9') {
      y += src.charAt(i);
    } else {
      x += src.charAt(i).toUpperCase();
    }
  }
  return [indexAt(x), parseInt(y, 10) - 1];
}

/** Convert [colIndex, rowIndex] to a cell reference (e.g., [1, 9] → 'B10'). */
export function xy2expr(x: number, y: number): string {
  return `${stringAt(x)}${y + 1}`;
}

/** Offset a cell reference by (xn, yn). */
export function expr2expr(src: string, xn: number, yn: number): string {
  const [x, y] = expr2xy(src);
  return xy2expr(x + xn, y + yn);
}

export default {
  stringAt,
  indexAt,
  expr2xy,
  xy2expr,
  expr2expr,
};
