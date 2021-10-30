import { cellRender } from './cell-render';
import { eachRanges } from './range';
import { newArea } from './area';

/**
 * render the grid lines
 * @param {Canvas2d} draw
 * @param {Area} area
 * @param {width, color} param2 the line style
 */
function renderLines(draw, area, { width, color }) {
  // render row-col-lines
  if (width > 0) {
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
function renderCell(draw, ri, ci, cell, cellRect, cellStyle) {
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
function renderCells(draw, type, area, cell, cellStyle, selection, selectionStyle, merges) {
  draw.save().rect(0, 0, area.width, area.height).clip();
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

function renderLinesAndCells(draw, type, area,
  cell, cellStyle, lineStyle, selection, selectionStyle, merges) {
  renderLines(draw, area, lineStyle);
  renderCells(draw, type, area, cell, cellStyle,
    selection, selectionStyle, merges);
}

// private methods --- start ----

function renderRowHeader(draw, area) {
  const { cell, width } = this.$rowHeader;
  // render row-index
  if (width > 0) {
    draw.save().translate(0, area.y);
    const { $selection } = this;
    let nselection = null;
    if ($selection) {
      nselection = this.$selection.clone();
      nselection.startCol = 0;
      nselection.endCol = 0;
    }
    renderLinesAndCells(draw, 'row-header', area,
      cell, this.$headerCellStyle, this.$headerLineStyle,
      nselection, this.$selectionStyle);
    draw.restore();
  }
}

function renderColHeader(draw, area) {
  const { cell, height, merges } = this.$colHeader;
  // render col-index
  if (height > 0) {
    draw.save().translate(area.x, 0);
    const { $selection } = this;
    let nselection = null;
    if ($selection) {
      nselection = this.$selection.clone();
      nselection.startRow = 0;
      nselection.endRow = area.endRow;
    }
    renderLinesAndCells(draw, 'col-header', area,
      cell, this.$headerCellStyle, this.$headerLineStyle,
      nselection, this.$selectionStyle, merges);
    draw.restore();
  }
}

function renderBody(draw, area) {
  draw.save().translate(area.x, area.y);
  renderLinesAndCells(draw, 'body', area,
    this.$cell, this.$cellStyle, this.$lineStyle,
    this.$selection, this.$selectionStyle, this.$merges);
  draw.restore();
}

function renderFreezeLines(draw, x, y) {
  const [fr, fc] = this.$freeze;
  const { width, color } = this.$freezeLineStyle;
  if (width > 0 && (fr > 0 || fc > 0)) {
    draw.save().beginPath().attr({ lineWidth: width, strokeStyle: color });
    if (fr > 0) draw.line([0, y], [this.$width, y]);
    if (fc > 0) draw.line([x, 0], [x, this.$height]);
    draw.restore();
  }
}

export function render(draw,
  [area1, area2, area3, area4],
  [iarea1, iarea21, iarea23, iarea3]) {
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
      newArea(0, 0, 0, 0, () => ({ width: x }), () => ({ height: y })),
      () => '', this.$headerCellStyle, this.$headerLineStyle);
  }
}

export default {};
