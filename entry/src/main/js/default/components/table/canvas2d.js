function dpr() {
  return 1;
}

function npx(px) {
  return px * dpr();
}

function attrRadio(ctx, key, v, cb) {
  if (dpr() === 1) cb();
  else {
    const old = ctx[key];
    ctx[key] = v(ctx[key]);
    cb();
    ctx[key] = old;
  }
}

export default class Canvas2d {
  constructor(el) {
    this.el = el;
    this.ctx = el.getContext('2d');
  }

  resize(width, height) {
    const { el } = this;
    this.clearRect(0, 0, width, height);
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    // for Retina display
    el.width = npx(width);
    el.height = npx(height);
    return this;
  }

  attr(options) {
    if (typeof options === 'string') {
      return this.ctx[options];
    }
    Object.entries(options).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        this.ctx[k] = v;
      }
    });
    return this;
  }

  textWidth(txt) {
    return this.ctx.measureText(txt).width;
  }

  line(...xys) {
    if (xys.length > 1) {
      this.moveTo(...xys[0]);
      for (let i = 1; i < xys.length; i += 1) {
        this.lineTo(...xys[i]);
      }
      this.stroke();
    }
    return this;
  }

  lines(...xyss) {
    if (xyss.length > 0) {
      xyss.forEach((xys) => this.line(...xys));
    }
    return this;
  }

  // style: thin | medium | thick | dashed | dotted
  // color: the line color
  lineStyle(style, color) {
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

  arc(x, y, radius, ...args) {
    this.ctx.arc(npx(x), npx(y), npx(radius), ...args);
    return this;
  }

  roundRect(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  }

  stroke() {
    const { ctx } = this;
    attrRadio(ctx,
      'lineWidth',
      (it) => npx(it),
      () => (ctx.stroke()));
    return this;
  }

  strokeRect(x, y, width, height) {
    const { ctx } = this;
    attrRadio(ctx,
      'lineWidth',
      (it) => npx(it),
      () => (ctx.strokeRect(npx(x), npx(y), width, height)));
    return this;
  }

  static create(el) {
    return new Canvas2d(el);
  }
}

[
  'save', 'restore',
  'beginPath', 'closePath',
  'clip', 'fill', 'rotate',
].forEach((it) => {
  Canvas2d.prototype[it] = function (...args) {
    this.ctx[it](...args);
    return this;
  };
});

['fillText', 'strokeText'].forEach((it) => {
  Canvas2d.prototype[it] = function (...args) {
    args[1] = npx(args[1]);
    args[2] = npx(args[2]);
    const { ctx } = this;
    attrRadio(ctx, 'font',
      (font) => font.replace(/([\d|\\.]*)(pt|px)/g, (w, size, u) => `${npx(size)}${u}`),
      () => (ctx[it](...args)));
    return this;
  };
});

// arcTo: 4
Object.entries({
  translate: 2,
  rect: 2,
  fillRect: 2,
  clearRect: 2,
  moveTo: 2,
  lineTo: 2,
  arc: 2,
  arcTo: 4,
  bezierCurveTo: 6,
  quadraticCurveTo: 4,
  createRadialGradient: 6,
  createLinearGradient: 4,
}).forEach(([it, cnt]) => {
  Canvas2d.prototype[it] = function (...args) {
    const { ctx } = this;
    const even = npx(ctx.lineWidth) % 2 === 0;
    ctx[it](...args.map((arg, index) => {
      let n = npx(arg);
      if (!even && index < cnt) n -= 0.5;
      return n;
    }));
    return this;
  };
});
