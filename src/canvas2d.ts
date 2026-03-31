/* global window */

/** Get device pixel ratio. */
function dpr(): number {
  return window.devicePixelRatio || 1;
}

/** Scale a pixel value by the device pixel ratio. */
function npx(px: number): number {
  return px * dpr();
}

/** Temporarily modify a canvas context attribute, execute callback, then restore. */
function attrRadio(ctx: CanvasRenderingContext2D, key: string, v: (val: any) => any, cb: () => void): void {
  if (dpr() === 1) {
    cb();
  } else {
    const old = (ctx as any)[key];
    (ctx as any)[key] = v((ctx as any)[key]);
    cb();
    (ctx as any)[key] = old;
  }
}

/**
 * Canvas 2D drawing wrapper with DPI-aware rendering.
 * All coordinates are automatically scaled for Retina displays.
 */
export default class Canvas2d {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  [key: string]: any;

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    this.ctx = el.getContext('2d')!;
  }

  /** Resize the canvas to the given dimensions (DPI-aware). */
  resize(width: number, height: number): this {
    const { el } = this;
    this.clearRect(0, 0, width, height);
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.width = npx(width);
    el.height = npx(height);
    return this;
  }

  /** Get or set canvas context attributes. */
  attr(options: string | Record<string, any>): any {
    if (typeof options === 'string') {
      return (this.ctx as any)[options];
    }
    Object.entries(options).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        (this.ctx as any)[k] = v;
      }
    });
    return this;
  }

  /** Measure the width of text. */
  textWidth(txt: string): number {
    return this.ctx.measureText(txt).width;
  }

  /** Draw a line through multiple points. */
  line(...xys: [number, number][]): this {
    if (xys.length > 1) {
      this.moveTo(...xys[0]);
      for (let i = 1; i < xys.length; i += 1) {
        this.lineTo(...xys[i]);
      }
      this.stroke();
    }
    return this;
  }

  /** Draw multiple lines. */
  lines(...xyss: [number, number][][]): this {
    if (xyss.length > 0) {
      xyss.forEach((xys) => this.line(...xys));
    }
    return this;
  }

  /** Set line style: thin | medium | thick | dashed | dotted. */
  lineStyle(style: string, color: string): this {
    const { ctx } = this;
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    if (style === 'medium') {
      ctx.lineWidth = 2;
    } else if (style === 'thick') {
      ctx.lineWidth = 3;
    } else if (style === 'dashed') {
      ctx.setLineDash([3, 2]);
    } else if (style === 'dotted') {
      ctx.setLineDash([1, 1]);
    }
    return this;
  }

  /** Draw an arc (DPI-aware). */
  arc(x: number, y: number, radius: number, ...args: number[]): this {
    this.ctx.arc(npx(x), npx(y), npx(radius), ...args as [number, number]);
    return this;
  }

  /** Draw a rounded rectangle. */
  roundRect(x: number, y: number, w: number, h: number, r: number): this {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  }

  /** Stroke the current path (DPI-aware line width). */
  stroke(): this {
    const { ctx } = this;
    attrRadio(ctx, 'lineWidth', (it: number) => npx(it), () => ctx.stroke());
    return this;
  }

  /** Stroke a rectangle (DPI-aware). */
  strokeRect(x: number, y: number, width: number, height: number): this {
    const { ctx } = this;
    attrRadio(ctx, 'lineWidth', (it: number) => npx(it),
      () => ctx.strokeRect(npx(x), npx(y), width, height));
    return this;
  }

  /** Factory method. */
  static create(el: HTMLCanvasElement): Canvas2d {
    return new Canvas2d(el);
  }
}

// Proxy simple context methods
['save', 'restore', 'beginPath', 'closePath', 'clip', 'fill', 'rotate'].forEach((it) => {
  (Canvas2d.prototype as any)[it] = function (this: Canvas2d, ...args: any[]) {
    (this.ctx as any)[it](...args);
    return this;
  };
});

// Proxy text methods (DPI-aware coordinates and font size)
['fillText', 'strokeText'].forEach((it) => {
  (Canvas2d.prototype as any)[it] = function (this: Canvas2d, ...args: any[]) {
    args[1] = npx(args[1]);
    args[2] = npx(args[2]);
    const { ctx } = this;
    attrRadio(ctx, 'font',
      (font: string) => font.replace(/([\d|.]*)(pt|px)/g, (_w: string, size: string, u: string) => `${npx(parseFloat(size))}${u}`),
      () => (ctx as any)[it](...args));
    return this;
  };
});

// Proxy coordinate methods (DPI-aware with sub-pixel alignment)
Object.entries({
  translate: 2, rect: 2, fillRect: 2, clearRect: 2,
  moveTo: 2, lineTo: 2, arcTo: 4,
  bezierCurveTo: 6, quadraticCurveTo: 4,
  createRadialGradient: 6, createLinearGradient: 4,
} as Record<string, number>).forEach(([it, cnt]) => {
  (Canvas2d.prototype as any)[it] = function (this: Canvas2d, ...args: number[]) {
    const { ctx } = this;
    const even = npx(ctx.lineWidth) % 2 === 0;
    (ctx as any)[it](...args.map((arg, index) => {
      let n = npx(arg);
      if (!even && index < cnt) n -= 0.5;
      return n;
    }));
    return this;
  };
});
