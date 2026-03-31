/** Cell style definition. */
export interface CellStyle {
  border?: CellBorder;
  fontSize?: number;
  fontName?: string;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  bgcolor?: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  underline?: boolean;
  strike?: boolean;
  rotate?: number;
  textwrap?: boolean;
  padding?: [number, number];
}

/** Cell border definition. */
export interface CellBorder {
  top?: [string, string];
  right?: [string, string];
  bottom?: [string, string];
  left?: [string, string];
}

/** Cell data: can be a primitive or an object with text and style. */
export type CellValue = string | number | CellObject;

export interface CellObject {
  text: string;
  style?: Partial<CellStyle>;
  type?: string;
}

/** Row configuration. */
export interface RowConfig {
  height: number;
  hide?: boolean;
  autoFit?: boolean;
}

/** Column configuration. */
export interface ColConfig {
  width: number;
  hide?: boolean;
  autoFit?: boolean;
}

/** Line style for grid lines. */
export interface LineStyle {
  width: number;
  color: string;
}

/** Selection style. */
export interface SelectionStyle {
  borderWidth: number;
  borderColor: string;
  bgcolor: string;
}

/** Row header configuration. */
export interface RowHeaderConfig {
  width: number;
  cell: (row: number) => CellValue;
}

/** Column header configuration. */
export interface ColHeaderConfig {
  height: number;
  rows: number;
  merges: string[];
  cell: (row: number, col: number) => CellValue;
  readonly rowHeight: number;
}

/** Cell rectangle with position and dimensions. */
export interface CellRect {
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Row position info. */
export interface RowInfo {
  y: number;
  height: number;
}

/** Column position info. */
export interface ColInfo {
  x: number;
  width: number;
}

/** Getter function for row config. */
export type RowGetter = (index: number) => RowConfig;

/** Getter function for col config. */
export type ColGetter = (index: number) => ColConfig;

/** Getter function for cell data. */
export type CellGetter = (row: number, col: number) => CellValue;

/** Declare window extensions for the table. */
declare global {
  interface Window {
    WolfTable: unknown;
    table: unknown;
    data: CellValue[][];
  }
}
