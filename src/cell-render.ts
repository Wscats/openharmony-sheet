import type Canvas2d from './canvas2d';
import type { CellStyle, CellBorder } from './types';

/** Calculate text x-position based on alignment. */
function textx(align: string, width: number, padding: number): number {
  switch (align) {
    case 'left': return padding;
    case 'center': return width / 2;
    case 'right': return width - padding;
    default: return 0;
  }
}

/** Calculate text y-position based on vertical alignment. */
function texty(align: string, height: number, txtHeight: number, padding: number): number {
  switch (align) {
    case 'top': return padding;
    case 'middle': return height / 2 - txtHeight / 2;
    case 'bottom': return height - padding - txtHeight;
    default: return 0;
  }
}

/** Calculate underline/strikethrough line coordinates. */
function textLine(
  type: string, align: string, valign: string,
  x: number, y: number, w: number, h: number,
): [[number, number], [number, number]] {
  let ty = 0;
  if (type === 'underline') {
    if (valign === 'top') ty = -h;
    else if (valign === 'middle') ty = -h / 2;
  } else if (type === 'strike') {
    if (valign === 'top') ty = -h / 2;
    else if (valign === 'bottom') ty = h / 2;
  }

  let tx = 0;
  if (align === 'center') tx = w / 2;
  else if (align === 'right') tx = w;

  return [[x - tx, y - ty], [x - tx + w, y - ty]];
}

/** Render cell borders. */
function renderBorder(draw: Canvas2d, width: number, height: number, border?: CellBorder): void {
  if (border) {
    const { top, right, bottom, left } = border;
    draw.save();
    if (top) draw.lineStyle(...top).line([0, 0], [width, 0]);
    if (right) draw.lineStyle(...right).line([width, 0], [width, height]);
    if (bottom) draw.lineStyle(...bottom).line([0, height], [width, height]);
    if (left) draw.lineStyle(...left).line([0, 0], [0, height]);
    draw.restore();
  }
}

/** Build a CSS font string. */
function fontString(family?: string, size?: number, italic?: boolean, bold?: boolean): string | undefined {
  if (family && size) {
    let font = '';
    if (italic) font += 'italic ';
    if (bold) font += 'bold ';
    return `${font} ${size}pt ${family}`;
  }
  return undefined;
}

/** Cell rectangle for rendering. */
interface RenderRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Render a single cell with text, background, border, and decorations.
 */
export function cellRender(
  draw: Canvas2d,
  text: string,
  rect: RenderRect,
  style: CellStyle = {},
): void {
  const {
    border, fontSize = 9, fontName, bold, italic,
    color, bgcolor, align = 'left', valign = 'middle',
    underline, strike, rotate, textwrap, padding,
  } = style;

  draw.save().beginPath().translate(rect.x, rect.y);

  renderBorder(draw, rect.width, rect.height, border);

  draw.attr({ fillStyle: bgcolor })
    .rect(0.5, 0.5, rect.width - 1, rect.height - 1)
    .clip()
    .fill();

  draw.save().beginPath().attr({
    textAlign: align,
    textBaseline: valign,
    font: fontString(fontName, fontSize, italic, bold),
    fillStyle: color,
  });

  if (rotate && rotate > 0) {
    draw.rotate(rotate * (Math.PI / 180));
  }

  const [xp, yp] = padding || [5, 5];
  const tx = textx(align, rect.width, xp);
  const txts = text.split('\n');
  const innerWidth = rect.width - (xp * 2);
  const ntxts: string[] = [];

  txts.forEach((it) => {
    const txtWidth = draw.textWidth(it);
    if (textwrap && txtWidth > innerWidth) {
      let txtLine = { w: 0, len: 0, start: 0 };
      for (let i = 0; i < it.length; i += 1) {
        if (txtLine.w > innerWidth) {
          ntxts.push(it.substr(txtLine.start, txtLine.len));
          txtLine = { w: 0, len: 0, start: i };
        }
        txtLine.len += 1;
        txtLine.w += draw.textWidth(it[i]) + 1;
      }
      if (txtLine.len > 0) {
        ntxts.push(it.substr(txtLine.start, txtLine.len));
      }
    } else {
      ntxts.push(it);
    }
  });

  const lineHeight = fontSize * 1.425;
  const txtHeight = (ntxts.length - 1) * lineHeight;
  const lineTypes: string[] = [];
  if (underline) lineTypes.push('underline');
  if (strike) lineTypes.push('strike');

  let ty = texty(valign, rect.height, txtHeight, yp);
  ntxts.forEach((it) => {
    const txtWidth = draw.textWidth(it);
    draw.fillText(it, tx, ty);
    lineTypes.forEach((type) => {
      draw.line(...textLine(type, align, valign, tx, ty, txtWidth, fontSize));
    });
    ty += lineHeight;
  });

  draw.restore();
  draw.restore();
}

export default {};
