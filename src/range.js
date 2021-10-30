import { expr2xy } from './alphabet';

/**
 * the range specified by a start position and an end position,
 * the smallest range must contain at least one cell.
 * Range is not a merged cell, but it can be merged as a single cell
 * @author myliang
 */
export default class Range {
  constructor(startRow, startCol, endRow, endCol) {
    // index of row of the start position
    this.startRow = startRow;
    // index of col of the start position
    this.startCol = startCol;
    // index of row of the end position
    this.endRow = endRow;
    // index of col of the end position
    this.endCol = endCol;
  }

  get start() {
    return [this.startRow, this.startCol];
  }

  get end() {
    return [this.endRow, this.endCol];
  }

  // count of rows contained in this range
  get rows() {
    return this.endRow - this.startRow;
  }

  // count of cols contained in this range
  get cols() {
    return this.endCol - this.startCol;
  }

  // check whether or not this range is empty
  get empty() {
    return this.rows() === 0 && this.cols() === 0;
  }

  /**
   * check whether or not the row-index contained in the row of range
   * @param {int} index
   * @returns {boolean}
   */
  inRow(index) {
    return this.startRow <= index && index <= this.endRow;
  }

  /**
   * check whether or not the index contained in the col of range
   * @param {int} index
   * @returns {boolean}
   */
  inCol(index) {
    return this.startCol <= index && index <= this.endCol;
  }

  /**
   * check whether or not the range contains a cell position(row, col)
   * @param {int} row row-index
   * @param {int} col col-index
   * @returns {boolean}
   */
  contains(row, col) {
    return this.inRow(row) && this.inCol(col);
  }

  /**
   * check whether or not the range within the other range
   * @param {Range} other
   * @returns {boolean}
   */
  within(other) {
    return this.startRow >= other.startRow
      && this.startCol >= other.startCode
      && this.endRow <= other.endRow
      && this.endCol <= other.endCol;
  }

  /**
   * check whether or not the range intersects the other range
   * @param {Range} other
   * @returns {boolean}
   */
  intersects(other) {
    return this.startRow <= other.endRow
      && this.startCol <= other.endCol
      && other.startRow <= this.endRow
      && other.startCol <= this.endCol;
  }

  /**
   * the self union the other resulting in the new range
   * @param {Range} other
   * @returns {Range} the new range
   */
  union(other) {
    return new Range(
      other.startRow < this.startRow ? other.startRow : this.startRow,
      other.startCol < this.startCol ? other.startCol : this.startCol,
      other.endRow > this.endRow ? other.endRow : this.endRow,
      other.endCol > this.endCol ? other.endCol : this.endCol,
    );
  }

  /**
   * @param {Function} cb (row) => {}
   * @returns this
   */
  eachRow(cb) {
    for (let row = this.startRow; row <= this.endRow; row += 1) {
      cb(row);
    }
    return this;
  }

  /**
   * @param {Function} cb (col) => {}
   * @returns this
   */
  eachCol(cb) {
    for (let col = this.startCol; col <= this.endCol; col += 1) {
      cb(col);
    }
    return this;
  }

  /**
   * @param {Function} cb (row, col) => {}
   * @returns this
   */
  each(cb) {
    this.rowEach((row) => {
      this.colEach((col) => (cb(row, col)));
    });
    return this;
  }

  clone() {
    return new Range(
      this.startRow,
      this.startCol,
      this.endRow,
      this.endCol,
    );
  }
}

export function newRange(ref) {
  if (ref === undefined) return undefined;
  const ary = ref.split(':');
  const start = expr2xy(ary[0]);
  const end = expr2xy(ary[1]);
  return new Range(start[1], start[0], end[1], end[0]);
}

export function eachRanges(refs, cb) {
  if (refs && refs.length > 0) {
    refs.forEach((ref) => {
      cb(newRange(ref));
    });
  }
}

export function findRanges(refs, cb) {
  if (refs && refs.length > 0) {
    let it = null;
    if (refs.find((ref) => {
      it = newRange(ref);
      return cb(it);
    })) {
      return it;
    }
  }
  return null;
}
