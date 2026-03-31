import { expr2xy } from './alphabet';

/**
 * A range specified by start and end positions.
 * The smallest range contains at least one cell.
 * @author myliang
 */
export default class Range {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;

  constructor(startRow: number, startCol: number, endRow: number, endCol: number) {
    this.startRow = startRow;
    this.startCol = startCol;
    this.endRow = endRow;
    this.endCol = endCol;
  }

  get start(): [number, number] {
    return [this.startRow, this.startCol];
  }

  get end(): [number, number] {
    return [this.endRow, this.endCol];
  }

  get rows(): number {
    return this.endRow - this.startRow;
  }

  get cols(): number {
    return this.endCol - this.startCol;
  }

  get empty(): boolean {
    return this.rows === 0 && this.cols === 0;
  }

  /** Check if row index is within this range. */
  inRow(index: number): boolean {
    return this.startRow <= index && index <= this.endRow;
  }

  /** Check if col index is within this range. */
  inCol(index: number): boolean {
    return this.startCol <= index && index <= this.endCol;
  }

  /** Check if (row, col) is contained in this range. */
  contains(row: number, col: number): boolean {
    return this.inRow(row) && this.inCol(col);
  }

  /** Check if this range is within another range. */
  within(other: Range): boolean {
    return this.startRow >= other.startRow
      && this.startCol >= other.startCol
      && this.endRow <= other.endRow
      && this.endCol <= other.endCol;
  }

  /** Check if this range intersects another range. */
  intersects(other: Range): boolean {
    return this.startRow <= other.endRow
      && this.startCol <= other.endCol
      && other.startRow <= this.endRow
      && other.startCol <= this.endCol;
  }

  /** Return the union of this range and another. */
  union(other: Range): Range {
    return new Range(
      Math.min(other.startRow, this.startRow),
      Math.min(other.startCol, this.startCol),
      Math.max(other.endRow, this.endRow),
      Math.max(other.endCol, this.endCol),
    );
  }

  /** Iterate over each row in the range. */
  eachRow(cb: (row: number) => void): this {
    for (let row = this.startRow; row <= this.endRow; row += 1) {
      cb(row);
    }
    return this;
  }

  /** Iterate over each col in the range. */
  eachCol(cb: (col: number) => void): this {
    for (let col = this.startCol; col <= this.endCol; col += 1) {
      cb(col);
    }
    return this;
  }

  /** Iterate over each cell in the range. */
  each(cb: (row: number, col: number) => void): this {
    this.eachRow((row) => {
      this.eachCol((col) => cb(row, col));
    });
    return this;
  }

  /** Create a deep copy of this range. */
  clone(): Range {
    return new Range(this.startRow, this.startCol, this.endRow, this.endCol);
  }
}

/** Parse a cell reference string (e.g., 'A1:B2') into a Range. */
export function newRange(ref: string): Range | undefined {
  if (ref === undefined) return undefined;
  const ary = ref.split(':');
  const start = expr2xy(ary[0]);
  const end = expr2xy(ary[1]);
  return new Range(start[1], start[0], end[1], end[0]);
}

/** Iterate over an array of range reference strings. */
export function eachRanges(refs: string[] | undefined, cb: (range: Range) => void): void {
  if (refs && refs.length > 0) {
    refs.forEach((ref) => {
      const range = newRange(ref);
      if (range) cb(range);
    });
  }
}

/** Find the first range matching a predicate. */
export function findRanges(refs: string[] | undefined, cb: (range: Range) => boolean): Range | null {
  if (refs && refs.length > 0) {
    let it: Range | null = null;
    if (refs.find((ref) => {
      it = newRange(ref) || null;
      return it ? cb(it) : false;
    })) {
      return it;
    }
  }
  return null;
}
