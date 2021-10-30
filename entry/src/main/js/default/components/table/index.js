import { stringAt, expr2xy } from './alphabet';
import Canvas2d from './canvas2d';
import { newRange, eachRanges } from './range';
import Viewport from './viewport';

/**
 * ----------------------------------------------------------------
 * |            | column header                                   |
 * ----------------------------------------------------------------
 * |            |                                                 |
 * | row header |              body                               |
 * |            |                                                 |
 * ----------------------------------------------------------------
 * row { height, hide, autoFit }
 * col { width, hide, autoFit }
 * cell {
 *   text,
 *   style: {
 *     border, fontSize, fontName,
 *     bold, italic, color, bgcolor,
 *     align, valign, underline, strike,
 *     rotate, textwrap, padding,
 *   },
 *   type: text | button | link | checkbox | radio | list | progress | image | imageButton | date
 * }
 */
class Table {
  // the count of rows
  $rows = 100;

  // the count of cols;
  $cols = 26;

  /**
   * get row given rowIndex
   * @param {int} rowIndex
   * @returns { height, hide, autoFit } row
   */
  $row = () => ({ height: 25, hide: false, autoFit: false });

  /**
   * get col given colIndex
   * @param {int} coIndex
   * @returns { width, hide, autoFit } col
   */
  $col = () => ({ width: 100, hide: false, autoFit: false });

  /**
   * get cell given rowIndex, colIndex
   * @param {int} rowIndex
   * @param {int} colIndex
   * @returns { text, style, type, ...} cell
   */
  $cell = () => '';

  $lineStyle = {
    width: 1,
    color: '#e6e6e6',
  };

  $cellStyle = {
    bgcolor: '#ffffff',
    align: 'left',
    valign: 'middle',
    textwrap: true,
    underline: false,
    color: '#0a0a0a',
    bold: false,
    italic: false,
    rotate: 0,
    fontSize: 9,
    fontName: 'Source Sans Pro',
  };

  $merges = [];

  // row header
  $rowHeader = {
    width: 60,
    cell(r) {
      return r + 1;
    },
  }

  // column header
  $colHeader = {
    height: 25,
    rows: 1,
    merges: [],
    cell(r, c) {
      return stringAt(c);
    },
    get rowHeight() {
      return this.height / this.rows;
    },
  }

  $headerLineStyle = {
    width: 1,
    color: '#e6e6e6',
  };

  $headerCellStyle = {
    bgcolor: '#f4f5f8',
    align: 'center',
    valign: 'middle',
    color: '#585757',
    fontSize: 9,
    fontName: 'Source Sans Pro',
  };

  // a highlight cell without background filled shows as focused cell
  $focus = undefined;

  // The selection range contains multiple cells
  $selection = undefined;

  $selectionStyle = {
    borderWidth: 2,
    borderColor: '#4b89ff',
    bgcolor: '#4b89ff14',
  };

  // row of the start position in table
  $startRow = 0;

  // col of the start position in table
  $startCol = 0;

  // count of rows scrolled
  $scrollRows = 0;

  // count of cols scrolled
  $scrollCols = 0;

  // freezed cell
  $freeze = [0, 0];

  $freezeLineStyle = {
    width: 2,
    color: '#d8d8d8',
  };

  /**
   * trigger the event by clicking
   * @param {int} type
   * @param {row, col,  x, y, width, height } cellRect
   * @param {Event} evt
   */
  $onClick = (type) => { };

  $onSelected = () => { };

  constructor(container, width, height) {
    this.$target = container;
    this.$draw = Canvas2d.create(container);
    this.$width = width;
    this.$height = height;
  }

  render() {
    this.viewport.render(this.$draw);
    return this;
  }

  get viewport() {
    return new Viewport(this);
  }

  // ref: 'A1:B2' | 'A:B' | '1:4' | 'A1'
  selection(ref) {
    if (typeof ref === 'string') {
      this.$selection = newRange(ref);
    } else {
      this.$selection = ref;
    }
    this.$focus = this.$selection.start;
    return this;
  }

  // ref: 'A1:B2' | 'A:B' | '1:4' | 'A1'
  freeze(ref) {
    if (ref !== 'A1') {
      this.$startRow = this.$scrollRows;
      this.$startCol = this.$scrollCols;
      this.$scrollRows = 0;
      this.$scrollCols = 0;
    } else {
      this.$scrollRows = this.$startRow;
      this.$scrollCols = this.$startCol;
      this.$startRow = 0;
      this.$startCol = 0;
    }
    this.$freeze = expr2xy(ref).reverse();
    return this;
  }

  static create(cssSelector, width, height) {
    return new Table(cssSelector, width, height);
  }
}

// single property
[
  'width', 'height', 'rows', 'cols', 'row', 'col', 'cell',
  'startRow', 'startCol', 'scrollRows', 'scrollCols',
  'merges',
  'onClick',
].forEach((it) => {
  Table.prototype[it] = function (arg) {
    this[`$${it}`] = arg;
    return this;
  };
});

// object property
[
  'lineStyle', 'cellStyle',
  'headerCellStyle', 'headerLineStyle',
  'selectionStyle', 'freezeLineStyle',
  'rowHeader', 'colHeader',
].forEach((it) => {
  Table.prototype[it] = function (arg) {
    Object.assign(this[`$${it}`], arg || {});
    return this;
  };
});

export default Table;
