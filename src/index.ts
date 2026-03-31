/* global window, document */
import { stringAt, expr2xy } from './alphabet';
import Canvas2d from './canvas2d';
import { newRange, eachRanges } from './range';
import Range from './range';
import Viewport from './viewport';
import type {
  CellValue, CellStyle, LineStyle, SelectionStyle,
  RowConfig, ColConfig, RowGetter, ColGetter, CellGetter,
} from './types';

/** Throttle a function to execute at most once per `wait` ms. */
function throttle<T extends (...args: any[]) => void>(func: T, wait: number = 50): T {
  let timer: ReturnType<typeof setTimeout> | 0 = 0;
  return function (this: any, ...args: any[]) {
    const context = this;
    if (!timer) {
      timer = setTimeout(() => {
        timer = 0;
        func.call(context, ...args);
      }, wait);
    }
  } as T;
}

function bind(target: EventTarget, eventName: string, func: EventListener): void {
  target.addEventListener(eventName, func);
}

function unbind(target: EventTarget, eventName: string, func: EventListener): void {
  target.removeEventListener(eventName, func);
}

function bindMouseMoveUp(
  target: HTMLElement & { bindMouseup?: EventListener },
  moveFunc: EventListener,
  upFunc: EventListener,
): void {
  bind(target, 'mousemove', moveFunc);
  target.bindMouseup = (evt: Event) => {
    unbind(target, 'mousemove', moveFunc);
    unbind(window, 'mouseup', target.bindMouseup!);
    delete target.bindMouseup;
    upFunc(evt);
  };
  bind(window, 'mouseup', target.bindMouseup);
}

/**
 * WolfTable - A high-performance canvas-based spreadsheet engine.
 *
 * Layout:
 * ```
 * |            | column header                                   |
 * ----------------------------------------------------------------
 * |            |                                                 |
 * | row header |              body                               |
 * |            |                                                 |
 * ```
 */
class Table {
  $rows: number = 100;
  $cols: number = 26;
  $row: RowGetter = () => ({ height: 25, hide: false, autoFit: false });
  $col: ColGetter = () => ({ width: 100, hide: false, autoFit: false });
  $cell: CellGetter = () => '';

  $lineStyle: LineStyle = { width: 1, color: '#e6e6e6' };

  $cellStyle: CellStyle = {
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

  $merges: string[] = [];

  $rowHeader = {
    width: 60,
    cell(r: number): CellValue { return r + 1; },
  };

  $colHeader = {
    height: 25,
    rows: 1,
    merges: [] as string[],
    cell(_r: number, c: number): CellValue { return stringAt(c); },
    get rowHeight(): number { return this.height / this.rows; },
  };

  $headerLineStyle: LineStyle = { width: 1, color: '#e6e6e6' };

  $headerCellStyle: CellStyle = {
    bgcolor: '#f4f5f8',
    align: 'center',
    valign: 'middle',
    color: '#585757',
    fontSize: 9,
    fontName: 'Source Sans Pro',
  };

  $focus: [number, number] | undefined = undefined;
  $selection: Range | undefined = undefined;

  $selectionStyle: SelectionStyle = {
    borderWidth: 2,
    borderColor: '#4b89ff',
    bgcolor: '#4b89ff14',
  };

  $startRow: number = 0;
  $startCol: number = 0;
  $scrollRows: number = 0;
  $scrollCols: number = 0;
  $freeze: [number, number] = [0, 0];
  $freezeLineStyle: LineStyle = { width: 2, color: '#d8d8d8' };

  $onClick: (type: number, cellRect: any, evt?: Event) => void = (type, cellRect) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const area = document.querySelector('.area') as HTMLElement;
    textarea.style.display = 'none';
    area.style.display = 'none';

    if (type === 4) {
      const { col, height, row, width, x, y } = cellRect;
      textarea.style.display = 'block';
      area.style.display = 'block';
      textarea.style.width = `${width - 8}px`;
      textarea.style.height = `${height - 4}px`;
      area.style.left = `${x - 2}px`;
      area.style.top = `${y - 1}px`;

      const value = window.data[row][col];
      textarea.value = typeof value === 'string' || typeof value === 'number'
        ? String(value) : (value as any).text;

      textarea.addEventListener('input', (e: Event) => {
        const input = (e.target as HTMLTextAreaElement).value;
        window.table = (this as any);
        (this as any).cell((ri: number, ci: number) => {
          if (ri === row && ci === col) {
            return window.data[ri][ci] = typeof value === 'string' || typeof value === 'number'
              ? input : { ...(value as object), text: input };
          }
          return window.data[ri][ci];
        });
      });
    }
  };

  $onSelected: () => void = () => {};

  $target: HTMLCanvasElement;
  $draw: Canvas2d;
  $width: number;
  $height: number;

  constructor(container: string | HTMLElement, width: number, height: number) {
    const target = document.createElement('canvas');
    const parent = typeof container === 'string'
      ? document.querySelector(container)!
      : container;
    parent.appendChild(target);
    this.$target = target;
    this.$draw = Canvas2d.create(target);
    this.$width = width;
    this.$height = height;
  }

  get viewport(): Viewport {
    return new Viewport(this as any);
  }

  /** Render the table and bind event handlers. */
  render(): this {
    const viewport = new Viewport(this as any);
    const { $draw, $target } = this;

    bind($target, 'click', (evt: Event) => {
      const mouseEvt = evt as MouseEvent;
      const cell = viewport.cell(mouseEvt.offsetX, mouseEvt.offsetY);
      if (cell) this.$onClick(cell[0], cell[1], evt);
    });

    bind($target, 'mousedown', (evt: Event) => {
      const mouseEvt = evt as MouseEvent;
      const range = viewport.range(mouseEvt.offsetX, mouseEvt.offsetY);
      if (!range) return;
      this.selection(range);
      viewport.render($draw);

      bindMouseMoveUp($target, throttle((e: Event) => {
        const me = e as MouseEvent;
        const nrange = viewport.range(me.offsetX, me.offsetY);
        if (nrange && !nrange.within(range)) {
          this.$selection = range.union(nrange);
          eachRanges(this.$merges, (it) => {
            if (this.$selection && it.intersects(this.$selection)) {
              this.$selection = it.union(this.$selection);
            }
          });
          viewport.render($draw);
        }
      }), () => {});
    });

    viewport.render($draw);
    return this;
  }

  /** Set the selection range. Accepts a ref string ('A1:B2') or a Range object. */
  selection(ref: string | Range): this {
    if (typeof ref === 'string') {
      this.$selection = newRange(ref);
    } else {
      this.$selection = ref;
    }
    if (this.$selection) {
      this.$focus = this.$selection.start;
    }
    return this;
  }

  /** Set the freeze position. */
  freeze(ref: string): this {
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
    this.$freeze = expr2xy(ref).reverse() as [number, number];
    return this;
  }

  /** Factory method. */
  static create(cssSelector: string, width: number, height: number): Table {
    return new Table(cssSelector, width, height);
  }
}

// Single-value property setters (chainable)
(['width', 'height', 'rows', 'cols', 'row', 'col', 'cell',
  'startRow', 'startCol', 'scrollRows', 'scrollCols',
  'merges', 'onClick',
] as const).forEach((it) => {
  (Table.prototype as any)[it] = function (this: Table, arg: any): Table {
    (this as any)[`$${it}`] = arg;
    return this;
  };
});

// Object-merge property setters (chainable)
(['lineStyle', 'cellStyle', 'headerCellStyle', 'headerLineStyle',
  'selectionStyle', 'freezeLineStyle', 'rowHeader', 'colHeader',
] as const).forEach((it) => {
  (Table.prototype as any)[it] = function (this: Table, arg: any): Table {
    Object.assign((this as any)[`$${it}`], arg || {});
    return this;
  };
});

export default Table;

window.WolfTable = Table;
