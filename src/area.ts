import Range from './range';
import type { RowGetter, ColGetter, RowInfo, ColInfo } from './types';

/**
 * Iterate over a range of rows/cols, skipping hidden ones.
 */
export function eachRange<T extends { hide?: boolean }>(
  min: number, max: number, getv: (i: number) => T, cb: (i: number, v: T) => void,
): void {
  for (let i = min; i <= max; i += 1) {
    const v = getv(i);
    if (v.hide !== true) cb(i, v);
  }
}

/** Get the end row position within a viewport. */
function endCellRow(
  row: RowGetter, minRow: number, maxRow: number, miny: number, maxy: number,
): { row: number; y: number; height: number } {
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

/** Get the end col position within a viewport. */
function endCellCol(
  col: ColGetter, minCol: number, maxCol: number, minx: number, maxx: number,
): { col: number; x: number; width: number } {
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

/** Get the end cell position for both row and col. */
export function endCell(
  row: RowGetter, col: ColGetter,
  minRow: number, minCol: number, maxRow: number, maxCol: number,
  minx: number, miny: number, maxx: number, maxy: number,
): { row: number; y: number; height: number; col: number; x: number; width: number } {
  return {
    ...endCellRow(row, minRow, maxRow, miny, maxy),
    ...endCellCol(col, minCol, maxCol, minx, maxx),
  };
}

/**
 * An area is a range with spatial dimensions (x, y, width, height).
 * Caches row heights and column widths for efficient lookup.
 * @author myliang
 */
export default class Area extends Range {
  $col: ColGetter;
  $row: RowGetter;
  $rowMap: Map<number, RowInfo>;
  $colMap: Map<number, ColInfo>;
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(
    startRow: number, startCol: number, endRow: number, endCol: number,
    col: ColGetter, row: RowGetter, x: number = 0, y: number = 0,
  ) {
    super(startRow, startCol, endRow, endCol);
    this.$col = col;
    this.$row = row;
    this.$rowMap = new Map();
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

  /** Get row position info for a single row or a row range. */
  row(index: number, endIndex?: number): RowInfo {
    const { $rowMap, startRow, $row } = this;
    if ((endIndex === undefined || index === endIndex) && $rowMap.has(index)) {
      return $rowMap.get(index)!;
    }
    if (index < startRow) {
      let y = 0;
      let height = 0;
      eachRange(index, endIndex!, (i) => $row(i), (i, v) => {
        if (i < startRow) y -= v.height;
        height += v.height;
      });
      return { y, height };
    }
    const { y } = $rowMap.get(index)!;
    let height = 0;
    eachRange(index, endIndex!, (i) => $row(i), (_i, v) => {
      height += v.height;
    });
    return { y, height };
  }

  /** Get col position info for a single col or a col range. */
  col(index: number, endIndex?: number): ColInfo {
    const { $colMap, startCol, $col } = this;
    if ((endIndex === undefined || index === endIndex) && $colMap.has(index)) {
      return $colMap.get(index)!;
    }
    if (index < startCol) {
      let x = 0;
      let width = 0;
      eachRange(index, endIndex!, (i) => $col(i), (i, v) => {
        if (i < startCol) x -= v.width;
        width += v.width;
      });
      return { x, width };
    }
    const { x } = $colMap.get(index)!;
    let width = 0;
    eachRange(index, endIndex!, (i) => $col(i), (_i, v) => {
      width += v.width;
    });
    return { x, width };
  }

  /** Check if x is within this area. */
  inx(x: number): boolean {
    return x >= this.x && x < (this.x + this.width);
  }

  /** Check if y is within this area. */
  iny(y: number): boolean {
    return y >= this.y && y < (this.y + this.height);
  }

  /** Check if (x, y) is within this area. */
  inxy(x: number, y: number): boolean {
    return this.inx(x) && this.iny(y);
  }

  /** Get the cell at canvas coordinates (x, y). */
  cell(x: number, y: number): any {
    return endCell(this.$row, this.$col,
      this.startRow, this.startCol, this.endRow, this.endCol,
      this.x, this.y, x, y);
  }

  /** Get the rectangle for a range within this area. */
  rect(range: Range, inCanvas: boolean = false): { x: number; y: number; width: number; height: number } {
    const c = this.col(range.startCol, range.endCol);
    const r = this.row(range.startRow, range.endRow);
    if (inCanvas) {
      c.x += this.x;
      r.y += this.y;
    }
    return { ...c, ...r };
  }

  /** Iterate over each row in this area. */
  eachRow(cb: (ri: number, v: RowInfo) => void): void {
    eachRange(this.startRow, this.endRow,
      (i) => this.$rowMap.get(i)!, (i, v) => cb(i, v));
  }

  /** Iterate over each col in this area. */
  eachCol(cb: (ci: number, v: ColInfo) => void): void {
    eachRange(this.startCol, this.endCol,
      (i) => this.$colMap.get(i)!, (i, v) => cb(i, v));
  }

  /** Iterate over each cell in this area. */
  each(cb: (ri: number, ci: number, rect: { x: number; y: number; width: number; height: number }) => void): void {
    this.eachRow((ri, { y, height }) => {
      this.eachCol((ci, { x, width }) => {
        cb(ri, ci, { x, y, width, height });
      });
    });
  }
}

/** Factory function for creating Area instances. */
export function newArea(...args: ConstructorParameters<typeof Area>): Area {
  return new Area(...args);
}
