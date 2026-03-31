import { cellRender } from './cell-render';
import { eachRanges } from './range';
import { newArea, eachRange } from './area';
import type Canvas2d from './canvas2d';
import type Area from './area';
import type Range from './range';
import type { CellStyle, CellValue, LineStyle, SelectionStyle } from './types';

/**
 * render the grid lines
 * @param {Canvas2d} draw
 * @param {Area} area
 * @param {width, color} param2 the line style
 */
function renderLines(draw: Canvas2d, area: Area, { width, color }: LineStyle): void {
  // render row-col-lines
  if (width > 0) {
    // const [rs, cs, re, ce, aw, ah] = area;
    draw.save().beginPath()
      .attr({ lineWidth: width, strokeStyle: color });

    area.eachRow((ri, v) => {
      const h = v.y + v.height;
      draw.line([0, h], [area.width, h]);
    });

    area.eachCol((ci, v) => {
      const w = v.x + v.width;
      draw.line([w, 0], [w, area.height]);
    });
    draw.restore();
  }
}

/**
 * render cell given params
 * @param {Canvas2d} draw
 * @param {int} ri the row index
 * @param {int} ci the col index
 * @param {Function} cell { text, style, type ...}
 * @param {x, y, width, height} cellRect
 * @param {style} cellStyle the style of default-cell
 */
function renderCell(
  draw: Canvas2d, ri: number, ci: number,
  cell: (ri: number, ci: number) => CellValue,
  cellRect: { x: number; y: number; width: number; height: number },
  cellStyle: CellStyle,
): void {
  const c = cell(ri, ci);
  let text = '';
  let style = cellStyle;
  if (c !== undefined) {
    if (typeof c === 'string' || typeof c === 'number') text = `${c}`;
    else {
      text = c.text || '';
      if (c.style) {
        style = { ...style, ...c.style };
      }
    }
  }
  // console.log('text:', text, ', rect:', cellRect, style);
  cellRender(draw, text, cellRect, style);
}

/**
 * render cells
 * @param {Canvas2d} draw
 * @param {string} type 'row-header' | 'col-header' | 'body'
 * @param {Area} area
 * @param {Function} cell
 * @param {style} cellStyle
 * @param {Range} selection
 * @param {style} selectionStyle
 * @param {Array<string>} merges
 */
function renderCells(
  draw: Canvas2d, type: string, area: Area,
  cell: (ri: number, ci: number) => CellValue,
  cellStyle: CellStyle, selection: Range | undefined,
  selectionStyle: SelectionStyle, merges?: string[],
): void {
  draw.save().rect(0, 0, area.width, area.height).clip();
  // const [rs, cs, re, ce] = area;
  area.each((ri, ci, rect) => {
    renderCell(draw, ri, ci, cell, rect, cellStyle);
  });

  // render merges
  eachRanges(merges, (it) => {
    if (it.intersects(area)) {
      renderCell(draw, it.startRow, it.startCol,
        cell, area.rect(it), cellStyle);
    }
  });

  // render selection
  if (selection && area.intersects(selection)) {
    const {
      x, y, width, height,
    } = area.rect(selection);
    const { bgcolor, borderWidth, borderColor } = selectionStyle;
    const bw = type === 'body' ? borderWidth : 0;
    draw.save()
      .attr({ fillStyle: bgcolor })
      .rect(x + bw / 2, y + bw / 2, width - bw, height - bw)
      .fill();
    if (type === 'body') {
      draw.attr({
        strokeStyle: borderColor,
        lineWidth: borderWidth,
      }).stroke();
    }
    draw.restore();
  }
  draw.restore();
}

function renderLinesAndCells(
  draw: Canvas2d, type: string, area: Area,
  cell: (ri: number, ci: number) => CellValue,
  cellStyle: CellStyle, lineStyle: LineStyle,
  selection?: Range, selectionStyle?: SelectionStyle, merges?: string[],
): void {
  renderLines(draw, area, lineStyle);
  renderCells(draw, type, area, cell, cellStyle, selection, selectionStyle!, merges);
}

// private methods --- start ----

function renderRowHeader(this: any, draw: Canvas2d, area: Area): void {
  const { cell, width } = this.$rowHeader;
  // render row-index
  if (width > 0) {
    draw.save().translate(0, area.y);
    const { $selection } = this;
    let nselection: Range | null = null;
    if ($selection) {
      nselection = this.$selection.clone();
      nselection!.startCol = 0;
      nselection!.endCol = 0;
    }
    renderLinesAndCells(draw, 'row-header', area,
      cell, this.$headerCellStyle, this.$headerLineStyle,
      nselection!, this.$selectionStyle);
    draw.restore();
  }
}

function renderColHeader(this: any, draw: Canvas2d, area: Area): void {
  const { cell, height, merges } = this.$colHeader;
  // render col-index
  if (height > 0) {
    draw.save().translate(area.x, 0);
    const { $selection } = this;
    let nselection: Range | null = null;
    if ($selection) {
      nselection = this.$selection.clone();
      nselection!.startRow = 0;
      nselection!.endRow = area.endRow;
    }
    renderLinesAndCells(draw, 'col-header', area,
      cell, this.$headerCellStyle, this.$headerLineStyle,
      nselection!, this.$selectionStyle, merges);
    draw.restore();
  }
}

function renderBody(this: any, draw: Canvas2d, area: Area): void {
  draw.save().translate(area.x, area.y);
  renderLinesAndCells(draw, 'body', area,
    this.$cell, this.$cellStyle, this.$lineStyle,
    this.$selection, this.$selectionStyle, this.$merges);
  draw.restore();
}

function renderFreezeLines(this: any, draw: Canvas2d, x: number, y: number): void {
  const [fr, fc] = this.$freeze;
  const { width, color } = this.$freezeLineStyle;
  // console.log('width:', width, color, fr, fc);
  if (width > 0 && (fr > 0 || fc > 0)) {
    draw.save().beginPath().attr({ lineWidth: width, strokeStyle: color });
    if (fr > 0) draw.line([0, y], [this.$width, y]);
    if (fc > 0) draw.line([x, 0], [x, this.$height]);
    draw.restore();
  }
}

export function render(
  this: any, draw: Canvas2d,
  [area1, area2, area3, area4]: [Area, Area, Area, Area],
  [iarea1, iarea21, iarea23, iarea3]: [Area, Area, Area, Area],
): void {
  draw.resize(this.$width, this.$height);

  // render area-4
  renderBody.call(this, draw, area4);

  // render area-1
  renderBody.call(this, draw, area1);
  renderColHeader.call(this, draw, iarea1);

  // render area-3
  renderBody.call(this, draw, area3);
  renderRowHeader.call(this, draw, iarea3);

  // render area-2
  renderBody.call(this, draw, area2);
  renderColHeader.call(this, draw, iarea21);
  renderRowHeader.call(this, draw, iarea23);

  // render freeze
  renderFreezeLines.call(this, draw, area4.x, area4.y);

  // left-top
  const { x, y } = area2;
  if (x > 0 && y > 0) {
    renderLinesAndCells(draw, 'header',
      newArea(0, 0, 0, 0, () => ({ width: x, hide: false }), () => ({ height: y, hide: false })),
      () => '', this.$headerCellStyle, this.$headerLineStyle);
  }
}

export default {};
