import Range, { findRanges } from './range';
import { eachRange } from './area';
import Area from './area';
import { render } from './render';
import type { RowGetter, ColGetter, CellRect } from './types';

/** Table context interface for viewport operations. */
interface TableContext {
  $rows: number;
  $cols: number;
  $row: RowGetter;
  $col: ColGetter;
  $merges: string[];
  $startRow: number;
  $startCol: number;
  $scrollRows: number;
  $scrollCols: number;
  $freeze: [number, number];
  $width: number;
  $height: number;
  $rowHeader: { width: number; cell: (r: number) => any };
  $colHeader: { height: number; rows: number; merges: string[]; cell: (r: number, c: number) => any; rowHeight: number };
}

/** Create the 4 body areas for the viewport. */
function $newBodyAreas(this: TableContext): [Area, Area, Area, Area] {
  const {
    $rows, $cols, $row, $col,
    $startRow, $startCol, $scrollRows, $scrollCols,
    $freeze, $width, $height, $rowHeader, $colHeader,
  } = this;

  const [fr, fc] = $freeze;
  const totalRows = $rows - 1;
  const totalCols = $cols - 1;
  const x = $rowHeader.width;
  const y = $colHeader.height;

  // area2: frozen top-left
  const area2 = new Area(
    $startRow, $startCol,
    $startRow + fr - 1, $startCol + fc - 1,
    $col, $row, x, y,
  );

  // area1: frozen top-right (scrollable cols)
  const area1 = new Area(
    $startRow, $startCol + fc + $scrollCols,
    $startRow + fr - 1, totalCols,
    $col, $row, x + area2.width, y,
  );

  // area3: frozen bottom-left (scrollable rows)
  const area3 = new Area(
    $startRow + fr + $scrollRows, $startCol,
    totalRows, $startCol + fc - 1,
    $col, $row, x, y + area2.height,
  );

  // area4: scrollable body
  const area4 = new Area(
    $startRow + fr + $scrollRows, $startCol + fc + $scrollCols,
    totalRows, totalCols,
    $col, $row, x + area2.width, y + area2.height,
  );

  return [area1, area2, area3, area4];
}

/** Create the 4 header areas for the viewport. */
function $newHeaderAreas(this: TableContext, [area1, area2, area3, area4]: [Area, Area, Area, Area]): [Area, Area, Area, Area] {
  const { $colHeader, $rowHeader } = this;
  const { rowHeight } = $colHeader;

  // iarea1: col header for area1
  const iarea1 = new Area(
    0, area1.startCol, $colHeader.rows - 1, area1.endCol,
    $col, () => ({ height: rowHeight, hide: false }), area1.x, 0,
  );

  // iarea21: col header for area2
  const iarea21 = new Area(
    0, area2.startCol, $colHeader.rows - 1, area2.endCol,
    $col, () => ({ height: rowHeight, hide: false }), area2.x, 0,
  );

  // iarea23: row header for area2
  const iarea23 = new Area(
    area2.startRow, 0, area2.endRow, 0,
    () => ({ width: $rowHeader.width, hide: false }), $row, 0, area2.y,
  );

  // iarea3: row header for area3
  const iarea3 = new Area(
    area3.startRow, 0, area3.endRow, 0,
    () => ({ width: $rowHeader.width, hide: false }), $row, 0, area3.y,
  );

  return [iarea1, iarea21, iarea23, iarea3];
}

/** Get the range at canvas coordinates (x, y). */
function rangeInAreas(
  this: TableContext,
  [area1, area2, area3, area4]: [Area, Area, Area, Area],
  [iarea1, iarea21, iarea23, iarea3]: [Area, Area, Area, Area],
  x: number, y: number,
): Range | null {
  const { $merges, $rows, $cols } = this;
  const inIndexRows = x < area2.x;
  const inIndexCols = y < area2.y;
  const range = new Range(0, 0, $rows - 1, $cols - 1);
  const cellfn = (a: Area) => a.cell(x, y);

  if (inIndexRows && inIndexCols) return range;

  if (inIndexRows) {
    const r = cellfn(iarea23.iny(y) ? iarea23 : iarea3).row;
    range.startRow = r;
    range.endRow = r;
    return range;
  }

  if (inIndexCols) {
    const c = cellfn(iarea21.inx(x) ? iarea21 : iarea1).col;
    range.startCol = c;
    range.endCol = c;
    return range;
  }

  const ary = [area4, area2, area1, area3];
  for (let i = 0; i < ary.length; i += 1) {
    const area = ary[i];
    if (area.inxy(x, y)) {
      const { row, col } = cellfn(area);
      const cr = findRanges($merges, (it) => it.contains(row, col));
      if (cr) return cr;
      return new Range(row, col, row, col);
    }
  }
  return null;
}

/** Get the cell info at canvas coordinates (x, y). */
function cellInAreas(
  this: TableContext,
  [area1, area2, area3, area4]: [Area, Area, Area, Area],
  [iarea1, iarea21, iarea23, iarea3]: [Area, Area, Area, Area],
  x: number, y: number,
): [number, any] | null {
  const { $merges, $row, $col } = this;
  const inIndexRows = x < area2.x;
  const inIndexCols = y < area2.y;

  if (inIndexRows && inIndexCols) {
    return [2, { row: 0, col: 0, x: 0, y: 0, width: area2.x, height: area2.y }];
  }

  const cellfn = (a: Area): any => {
    let ret = a.cell(x, y);
    const cr = findRanges($merges, (it) => it.contains(ret.row, ret.col));
    if (cr) {
      const { startRow, startCol, endRow, endCol } = cr;
      const gap = { width: 0, height: 0 };
      eachRange(area2.endRow + 1, area4.startRow - 1, $row, (i, { height }) => {
        if (i <= endRow) gap.height += height;
      });
      eachRange(area2.endCol + 1, area4.startCol - 1, $col, (i, { width }) => {
        if (i <= endCol) gap.width += width;
      });
      if (area2.contains(startRow, startCol)) {
        ret = area2.rect(cr, true);
        ret.width -= gap.width;
        ret.height -= gap.height;
      } else if (area1.contains(startRow, startCol)) {
        ret = area1.rect(cr, true);
        ret.height -= gap.height;
      } else if (area3.contains(startRow, startCol)) {
        ret = area3.rect(cr, true);
        ret.width -= gap.width;
      } else {
        ret = area4.rect(cr, true);
      }
      return { row: startRow, col: startCol, ...ret };
    }
    return ret;
  };

  if (inIndexRows) {
    return [3, cellfn(iarea23.iny(y) ? iarea23 : iarea3)];
  }
  if (inIndexCols) {
    return [1, cellfn(iarea21.inx(x) ? iarea21 : iarea1)];
  }

  const ary = [area4, area2, area1, area3];
  for (let i = 0; i < ary.length; i += 1) {
    const area = ary[i];
    if (area.inxy(x, y)) {
      return [4, cellfn(area)];
    }
  }
  return null;
}

/**
 * Viewport: manages the visible area of the table.
 * Contains header areas and body areas.
 * @author myliang
 */
export default class Viewport {
  table: TableContext;
  body: [Area, Area, Area, Area];
  header: [Area, Area, Area, Area];

  constructor(table: TableContext) {
    this.table = table;
    this.body = $newBodyAreas.call(table);
    this.header = $newHeaderAreas.call(table, this.body);
  }

  /** Get cell info at canvas coordinates. */
  cell(x: number, y: number): [number, any] | null {
    return cellInAreas.call(this.table, this.body, this.header, x, y);
  }

  /** Get range at canvas coordinates. */
  range(x: number, y: number): Range | null {
    return rangeInAreas.call(this.table, this.body, this.header, x, y);
  }

  /** Render the viewport using the given draw context. */
  render(draw: any): void {
    render.call(this.table, draw, this.body, this.header);
  }
}
