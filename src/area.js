import Range from './range';

/**
 * each range of row or col
 * @param {int} min the min value
 * @param {int} max the max value
 * @param {Function} getv (index) => v
 * @param {Function} cb (index, v) => {}
 */
export function eachRange(min, max, getv, cb) {
  for (let i = min; i <= max; i += 1) {
    const v = getv(i);
    if (v.hide !== true) cb(i, v);
  }
}

/**
 * get the end row given params...
 * @param {Function} row (index) => { height, hide }
 * @param {int} minRow the min row
 * @param {int} maxRow the max row
 * @param {int} miny the min value on y-axis
 * @param {int} maxy the max value on y-axis
 */
function endCellRow(row, minRow, maxRow, miny, maxy) {
  let r = minRow;
  let y = miny;
  let lasth = 0;
  while (y < maxy && r <= maxRow) {
    const { height, hide } = row(r);
    if (hide !== true) {
      lasth = height;
      y += height;
    }
    r += 1;
  }
  y -= lasth;
  return { row: r - 1, y, height: lasth };
}

/**
 * get the end col given params...
 * @param {Function} col (index) => { width, hide }
 * @param {int} minCol the min col
 * @param {int} maxCol the max col
 * @param {int} minx the min value on x-axis
 * @param {int} maxx the max value on x-axis
 */
function endCellCol(col, minCol, maxCol, minx, maxx) {
  let c = minCol;
  let x = minx;
  let lastw = 0;
  while (x < maxx && c <= maxCol) {
    const { width, hide } = col(c);
    if (hide !== true) {
      lastw = width;
      x += width;
    }
    c += 1;
  }
  x -= lastw;
  return { col: c - 1, x, width: lastw };
}

export function endCell(row, col,
  minRow, minCol, maxRow, maxCol,
  minx, miny, maxx, maxy) {
  return {
    ...endCellRow(row, minRow, maxRow, miny, maxy),
    ...endCellCol(col, minCol, maxCol, minx, maxx),
  };
}

/**
 * it's a range with { x, y, width, height }
 * and calculating height of row and width of col..
 * @author myliang
 */
export default class Area extends Range {
  constructor(startRow, startCol, endRow, endCol, col, row, x = 0, y = 0) {
    super(startRow, startCol, endRow, endCol);
    // the function of returning { width, hide }
    this.$col = col;
    // the function of returning { height, hide }
    this.$row = row;

    // cache with row and col
    // { rowIndex: { height, hide }}
    this.$rowMap = new Map();
    // { colIndex: { width, hide }}
    this.$colMap = new Map();

    this.x = x;
    this.y = y;
    this.width = 0;
    this.height = 0;

    eachRange(startRow, endRow, (i) => row(i), (i, { height }) => {
      this.$rowMap.set(i, { y: this.height, height });
      this.height += height;
    });
    eachRange(startCol, endCol, (i) => col(i), (i, { width }) => {
      this.$colMap.set(i, { x: this.width, width });
      this.width += width;
    });
  }

  /**
   * get {y, height} given index, endIndex
   * y: the offset on y-axis
   * @param {int} index
   * @param {int} endIndex (option param)
   * @returns {y, height}
   * @example
   *  row(5)
   *  row(5, 10)
   */
  row(index, endIndex) {
    const { $rowMap, startRow, $row } = this;
    if ((endIndex === undefined || index === endIndex) && $rowMap.has(index)) {
      return $rowMap.get(index);
    }
    if (index < startRow) {
      let y = 0;
      let height = 0;
      eachRange(index, endIndex, (i) => $row(i), (i, v) => {
        if (i < startRow) y -= v.height;
        height += v.height;
      });
      return { y, height };
    }
    const { y } = $rowMap.get(index);
    let height = 0;
    eachRange(index, endIndex, (i) => $row(i), (i, v) => {
      height += v.height;
    });
    return { y, height };
  }

  /**
   * get {x, width} given index, endIndex
   * x: the offset on y-axis
   * @param {int} index
   * @param {int} endIndex (option param)
   * @returns {x, width}
   */
  col(index, endIndex) {
    const { $colMap, startCol, $col } = this;
    if ((endIndex === undefined || index === endIndex) && $colMap.has(index)) {
      return $colMap.get(index);
    }
    if (index < startCol) {
      let x = 0;
      let width = 0;
      eachRange(index, endIndex, (i) => $col(i), (i, v) => {
        if (i < startCol) x -= v.width;
        width += v.width;
      });
      return { x, width };
    }
    const { x } = $colMap.get(index);
    let width = 0;
    eachRange(index, endIndex, (i) => $col(i), (i, v) => {
      width += v.width;
    });
    return { x, width };
  }

  /**
   * check whether or not x contained in area
   * @param {int} x offset on x-axis
   */
  inx(x) {
    return x >= this.x && x < (this.x + this.width);
  }

  /**
   * check whether or not y contained in area
   * @param {int} y offset on y-axis
   */
  iny(y) {
    return y >= this.y && y < (this.y + this.height);
  }

  /**
   * check whether or not the tabe contains (x, y)
   * @param {int} x offset on x-axis
   * @param {int} y offset on y-axis
   */
  inxy(x, y) {
    return this.inx(x) && this.iny(y);
  }

  /**
   * get cell given x, y in canvas!!!!
   * @param {int} x offset on x-axis
   * @param {int} y offset on y-axis
   * @returns { row, col, x, y, width, height }
   */
  cell(x, y) {
    return endCell(this.$row, this.$col,
      this.startRow, this.startCol, this.endRow, this.endCol,
      this.x, this.y, x, y);
  }

  /**
   * get rect given range in area
   * @param {Range} range
   * @param {boolean} isCanvas
   * @returns { x, y, width, height }
   */
  rect(range, inCanvas = false) {
    const c = this.col(range.startCol, range.endCol);
    const r = this.row(range.startRow, range.endRow);
    if (inCanvas) {
      c.x += this.x;
      r.y += this.y;
    }
    return {
      ...c, ...r,
    };
  }

  eachRow(cb) {
    eachRange(this.startRow, this.endRow,
      (i) => this.$rowMap.get(i), (i, v) => cb(i, v));
  }

  eachCol(cb) {
    eachRange(this.startCol, this.endCol,
      (i) => this.$colMap.get(i), (i, v) => cb(i, v));
  }

  each(cb) {
    this.eachRow((ri, { y, height }) => {
      this.eachCol((ci, { x, width }) => {
        cb(ri, ci, {
          x, y, width, height,
        });
      });
    });
  }
}

export function newArea(...args) {
  return new Area(...args);
}
