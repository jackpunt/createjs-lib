import { C, className, F, type XYWH } from "@thegraid/common-lib";
import { Graphics, Rectangle, Shape, type DisplayObject, type Text } from "@thegraid/easeljs-module";
import { CenterText } from "./center-text";
import { afterUpdate, textWidth } from "./createjs-functions";
import { NamedContainer } from "./named-container";

declare module '@thegraid/easeljs-module' {

  // declare here until included in @types/easeljs/index.d.ts
  interface Graphics {

    /**
    * Draws a polygon from array of point arrays.
    *
    *      myGraphics.beginFill("#FF0").drawPolygon([100, 100], [150, 50], [200,100], [200,200], [100,200]);
    *      // makes a house shape
    *
    * A tiny API method "pg" also exists.
    *
    * @method drawPolygon
    * @param {Array} points An array of [x,y] points.
    * @param {Boolean} close Whether to close the polygon - default is true.
    * @return {Graphics} The Graphics instance the method is called on (useful for chaining calls.)
    * @chainable
    **/
    drawPolygon(points: [number, number][], close: boolean): void;  // Dan Zen 4/2/21

    /** short form of drawPolygon */
    pg(points: [number, number][], close: boolean): void;
  }
}

export interface Paintable extends DisplayObject {
  /**
   * paint with given or current color; updateCache()
   * @param colorn [current color] color to paint
   * @param force [false] repaint even if same color.
   */
  paint(colorn?: string, force?: boolean): Graphics;

  /** Paintable can compute its own Bounds. setBounds(undefined, 0, 0, 0) */
  setBounds(x: undefined | null | number, y: number, width: number, height: number): void;
  /** compute bounds of this Paintable */
  calcBounds(): XYWH;
  /** ensure Paintable is cached; expect setBounds() already done. */
  setCacheID(): void;
}

/** Create/Color Graphics Function (color, g0); extend graphics with additional instructions.
 * g0 is clone of "baseline" Graphics. (may be clear)
 */
export type CGF = (color: string, g?: Graphics) => Graphics;

/**
 * Usage:
 * @example
 * class MyShape extends PaintableShape {
 *   constructor() {
 *     super((fillc) => this.mycgf(fillc), fillc, g0); // 'this' is allowed!
 *     this._cgf = this.mycgf;  // without => wrapper
 *   }
 *   mycgf(color: string, g = this.g0) => {
 *     return g.f(color).dc(0, 0, rad);
 *   }
 * }
 * ...
 * ms.paint(red); --> ms.graphics = g.f(red) --> new CG(red);
 */
// The "origin story" was to create new Shapes without subclassing.
// Just make a new PaintableShape with its CGF
// can even compose by passing/invoking the CGF of other Shapes.
// the tricky bit for that is finding the 'inherited' CGF;
// capture and save before overwriting in constructor
// maybe a known static; or constructor arg: either a CGF or a PS instance.
export class PaintableShape extends Shape implements Paintable {
  static defaultRadius = 60;
  /** if supplied in contructor, cgf extends a clone [otherwise use new Graphics()] */
  _g0?: Graphics;
  /** initial/baseline Graphics, cgf extends to create cgfGraphics */
  get g0() {
    return this._g0?.clone() ?? new Graphics(); // clone, so original is not mutated.
  }
  /** previous/current Graphics that were rendered. (optimization... paint(color, true) to override) */
  cgfGraphics?: Graphics; // points to this.graphics after cgf runs.
  /**
   *
   * @param _cgf Create Graphics Function
   * @param colorn paint with this color
   * @param g0 Graphics to clone (or create); used as baseline Graphics for each paint()
   */
  constructor(public _cgf: CGF, public colorn: string = C.BLACK, g0?: Graphics) {
    super();
    this._g0 = g0;
    this.name = className(this); // visible in debugger
  }
  // if caller is buiding a Graphics that will operate on existing cache, may be false.
  updateCacheInPaint = true;      // except for unusual cases
  get cgf() { return this._cgf; }
  /** set new cgf; and clear "previously rendered Graphics" */
  set cgf(cgf: CGF) {
    this._cgf = cgf;
    if (this.cgfGraphics) {
      this.paint(this.colorn, true);
    }
  }
  /** render graphics from cgf. */
  paint(colorn: string = this.colorn, force = false): Graphics {
    if (force || this.graphics !== this.cgfGraphics || this.colorn !== colorn) {
      // need to repaint, even if same color:
      this.graphics = this.g0;  // reset to initial Graphics.
      this.graphics = this.cgfGraphics = this.cgf(this.colorn = colorn); // apply this.cgf(color)
      if (this.updateCacheInPaint && this.cacheID) this.updateCache();
    }
    return this.graphics;
  }
  // easeljs does: BitMap, Sprite (Frame?), Text, Filter, BitmapCache, BlurFilter
  // easeljs does Container as union of bounds provided by children.
  /**
   * Paintable shape can & should calculate its Bounds.
   *
   * Subclasses should override to calculate their bounds.
   * @param x
   * * undefined -> calculate bounds,
   * * null -> remove bounds,
   * * number -> set to {x, y, width, height}
   * @param y
   * @param width
   * @param height
   */
  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      const cached = this.cacheID; // undefined | number >= 1
      this.uncache();              // setBoundsNull();   // not nec'sary/useful
      const { x, y, w, h } = this.calcBounds()
      super.setBounds(x, y, w, h);
      if (cached) this.cache(x, y, w, h); // recache if previously cached
    } else {
      super.setBounds(x!, y, width, height);
    }
  }

  /** subclass to override to compute actual bounds of their Shape. */
  calcBounds(): XYWH {
    return { x: 0, y: 0, w: 5, h: 5 }
  }

  /** ensure PaintableShape is cached; uses getBounds() ?? calcBounds(). 
   * 
   * @param scale [1] scale to use if cache is created
   */
  setCacheID(scale = 1) {
    if (this.cacheID) return;  // also: if already cached, get/setBounds is useless
    let b = this.getBounds() as Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>
    if (!b) {
      const { x, y, w, h } = this.calcBounds();
      b = { x, y, width: w, height: h }
    }
    this.cache(b.x, b.y, b.width, b.height, scale);
  }
}

/** an n-sided Polygon, tilted */
export class PolyShape extends PaintableShape {
  public rad = PaintableShape.defaultRadius;
  public nsides = 4;
  public pSize = 0;
  public tilt = 0;
  public fillc = C.grey;
  public strokec = C.black;

  /**
   * A regular equilateral Polygon Shape, may be tilted clockwise.
   * 
   * this.pscgf() invokes drawPolygon at (0, 0, ...);
   *
   * To adjust (x,y): supply g0 = new Graphics().mt(x,y)
   * @param params \{ rad, nsides, pSize, tilt, fillc, strokec }
   * - rad: radius of polygon
   * - nsides: number of sides
   * - pSize: point size of vertex [0]
   * - tilt: clockwise tilt in degrees [0]
   * - fillc: fill color [grey]
   * - strokec: stroke color [black] use '' for no stroke.
   * @param g0 Graphics base
   */
  constructor({ rad, nsides, pSize, tilt, fillc, strokec }:
    { rad?: number, nsides?: number, pSize?: number, tilt?: number, fillc?: string, strokec?: string }, g0?: Graphics) {
    super((fillc) => this.pscgf(fillc), fillc, g0);

    this.nsides = nsides ?? 4;
    this.rad = rad ?? PaintableShape.defaultRadius;
    this.pSize = pSize ?? 0;
    this.tilt = tilt ?? 0;
    this.fillc = fillc ?? C.grey;
    this.strokec = strokec ?? C.black;
    this._cgf = this.pscgf;
    this.paint(fillc);
  }

  /** set fillc and strokec, invoke drawPoly(0, 0, ...) */
  pscgf(fillc: string, g = this.g0) {
    ((this.fillc = fillc) ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    g.dp(0, 0, this.rad, this.nsides, this.pSize, this.tilt); // drawPolygon()
    return g;
  }

  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      // overestimate: without nsides & tilt
      this.setBounds(-this.rad, -this.rad, 2 * this.rad, 2 * this.rad)
    } else {
      super.setBounds(x, y, width, height)
    }
  }
}

export class PathShape extends PaintableShape {
  /** array of [x, y] points */
  public points: [number, number][];
  public fillc: string;
  public strokec: string;

  /**
   * Arbitrary polygon shape.
   * 
   * @param options \{ points, fillc? strokec? \}
   * - points: array of [x, y] points, path will be auto-closed.
   * - fillc: fill color [grey]
   * - strokec: stroke color [black]
   * @param g0 initial Graphics [this.graphics]
   */
  constructor({ points, tilt, fillc, strokec }:
    { points: [number, number][], tilt?: number, fillc?: string, strokec?: string }, g0?: Graphics) {
    super((fillc) => this.pscgf(fillc), fillc, g0);
    this.points = points;
    this.fillc = fillc ?? C.grey;
    this.strokec = strokec ?? C.black;
    this._cgf = this.pscgf;
    this.paint(fillc);
  }

  /** set fillc and strokec, invoke drawPoly(0, 0, ...) */
  pscgf(fillc: string, g = this.g0) {
    ((this.fillc = fillc) ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    g.pg(this.points, true);  // close the loop
    return g;
  }
}

export class EllipseShape extends PaintableShape {
  /**
   * ellipse centered on (0,0), axis is NS/EW, rotate after.
   * @param radx radius in x dir
   * @param rady radisu in y dir
   * retain g0, to use as baseline Graphics for each paint()
   */
  constructor(public fillc = C.white, 
    public radx = PaintableShape.defaultRadius / 2, 
    public rady = PaintableShape.defaultRadius / 2, 
    public strokec = C.black, g0?: Graphics
  ) {
    super((fillc) => this.escgf(fillc), strokec, g0);
    this._cgf = this.escgf; // overwrite to remove indirection...
    this.paint(fillc);
  }

  /** EllispseShape.cgf */
  escgf(fillc: string, g = this.g0) {
    ((this.fillc = fillc) ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    g.de(-this.radx, -this.rady, 2 * this.radx, 2 * this.rady);
    return g;
  }

  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      this.setBounds(-this.radx, -this.rady, 2 * this.radx, 2 * this.rady)
    } else {
      super.setBounds(x, y, width, height)
    }
  }
  override getBounds(): Rectangle {
    const b = super.getBounds();
    if (b) { return b }
    return super.getBounds() ?? new Rectangle(this.x - this.radx, this.y - this.rady, 2 * this.radx, 2 * this.rady)
  }
}

/**
 * Circle centered on (0,0)
 * @param rad radius
 * retain g0, to use as baseline Graphics for each paint()
 */
export class CircleShape extends EllipseShape {
  constructor(fillc = C.white, rad = PaintableShape.defaultRadius / 2, strokec = C.black, g0?: Graphics) {
    super(fillc, rad, rad, strokec, g0);
  }
}

/** XYWH & cornerRadius & strokeSize  */
type XYWHRS = Partial<XYWH> & { r?: number, s?: number, rr?: [tl: number, tr: number, bl: number, br: number], }

/** a Rectangular Shape, maybe with rounded corners */
export class RectShape extends PaintableShape {

  // compare to Bounds; this._bounds: Rectangle === { x, y, width, height }
  /** the XYWH rectangle to draw & fill; components set by setRectRad() */
  readonly _rect: XYWH = { x: 0, y: 0, w: 10, h: 10 };
  /** complex RoundedRect, each corner can be different */
  _rr?: [tl: number, tr: number, bl: number, br: number];
  /** _cRad used if _rr is undefined  */
  _cRad = 0; 
  /** stroke size. For no stroke use strokec = ''; ({ s: 0 } is not effective) */
  _sSiz = 1;
  strokec!: string;

  /**
   * Paint a rectangle (possibly with rounded corners) with fillc and stroke.
   * 
   * The stroke goes *outside* the given (w, h)
   * 
   * corner radius: rr = [tl, tr, br, bl] OR r = radius for all 4
   * 
   * rscgf(fillc) uses rect, strokec, cRad, sSiz, g0 to paint a rectangle.
   * @param rect \{ x=0, y=0, w=rad, h=rad, r=0, s=1 } 
   * - x, y: origin, 
   * - w, h: extent, 
   * - r | rr: corner radius, 
   * - s: stroke width.
   * @param fillc [C.white] color to paint the rectangle, '' for no fill
   * @param strokec [C.black] stroke color, '' for no stroke
   * @param g0 [new Graphics()] Graphics to clone and extend during paint()
   */
  constructor(
    { x = 0, y = 0, 
      w = PaintableShape.defaultRadius, 
      h = PaintableShape.defaultRadius, 
      r = 0, s = 1, rr = undefined }: XYWHRS,
    fillc = C.white,
    strokec = C.black,
    g0?: Graphics,
  ) {
    super((fillc) => this.rscgf(fillc), fillc, g0);
    this._cgf = this.rscgf;     // replace ()=>{} with direct function (now that we can say 'this')
    this.strokec = strokec;
    this.setRectRad({ x, y, w, h, r, s, rr })
    this.paint(fillc, true); // this.graphics = rscgf(...)
  }

  /** update any of {x, y, w, h, r, s} & setBoundsNull(); for future paint() */
  setRectRad({ x, y, w, h, r, s, rr }: XYWHRS) {
    const rect = this._rect;
    (x !== undefined) && (rect.x = x);
    (y !== undefined) && (rect.y = y);
    (w !== undefined) && (rect.w = w);
    (h !== undefined) && (rect.h = h);
    (r !== undefined) && (this._cRad = r);
    (s !== undefined) && (this._sSiz = s);
    (rr !== undefined) && (this._rr = rr);
    this.setBounds(undefined, 0, 0, 0);
  }

  override getBounds(): Rectangle {
    const b = super.getBounds();
    if (b) { return b; }
    const ssi = Math.ceil(this.strokec ? (this._sSiz ?? 0) : 0), sse = 2 * ssi; 
    return new Rectangle(Math.floor(this.x + this._rect.x - ssi), Math.floor(this.y + this._rect.y - ssi), Math.ceil(this._rect.w + sse), Math.ceil(this._rect.h + sse))
  }

  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      const { x, y, w, h } = this._rect;
      // try to avoid truncation of bounding box due to later rounding:
      // ssi is _sSiz rounded up to an even integer, sse = 2 * ssi; (also an int)
      const ssi = Math.ceil(this.strokec ? (this._sSiz ?? 0) : 0), sse = 2 * ssi;
      this.setBounds(Math.floor(x - ssi), Math.floor(y - ssi), Math.ceil(w + sse), Math.ceil(h + sse))
    } else {
      super.setBounds(x, y, width, height) // can be different from _rect
    }
  }

  /** draw rectangle, maybe with rounded corner, maybe with ss & strokec
   * 
   * RectShape tweaks things so the border stroke is drawn outside the given xywh rectangle.
   * 
   * the bounds are computed by rounding sSize up to an even int.
   */
  rscgf(fillc: string, g = this.g0) {
    const { x, y, w, h } = this._rect;
    const ss = this.strokec ? (this._sSiz ?? 0) : 0;
    (fillc ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    if (this.strokec && (ss > 0)) g.ss(ss);  // use ss only if: strokec && (ss > 0)
    // enlarge _rect to include ss;
    if (!!this._rr) {
      const [tl, tr, br, bl] = this._rr
      g.rc(x - ss / 2, y - ss / 2, w + ss, h + ss, tl, tr, br, bl);
    } else if (this._cRad === 0) {
      g.dr(x - ss / 2, y - ss / 2, w + ss, h + ss);
    } else {
      g.rr(x - ss / 2, y - ss / 2, w + ss, h + ss, this._cRad);
      // note: there is also a drawRoundRectComplex(x,y,w,h,rTL,rTR,rBR,rBL)
    }
    return g;
  }
}


/** Container with a colored RectShape behind the given DisplayObject.
 * 
 * The RectShape extends by 'border' around the bounds of the DisplayObject.
 * 
 * To tweak border extents, set: .borders, .dx, .dy, .dx0, .dx1, .dy0, .dy1
 * 
 */
export class RectWithDisp extends NamedContainer implements Paintable {

  /**
   * Create Container a RectShape behind the given DisplayOBject.
   *
   * The RectShape extends around (disp.getBounds() ?? { 0, 0, 10, 10 })
   * @param disp a DisplayObject
   * @param options
   * * color [WHITE] of background RectShape.
   * * border [5] extend RectShape around disp
   * * corner [0] corner radius
   * @param cgf [rscgf] CGF for the RectShape
   */
  constructor(disp: DisplayObject, options: RectWithDispOptions, cgf?: CGF) {
    super('rectWithDisp');               // ISA new Container()
    const { bgColor, border, corner } = { bgColor: C.WHITE, border: 5, corner: 0, ...options };
    if (cgf) this.rectShape._cgf = cgf;  // HasA RectShape & DisplayObject
    this.disp = disp;
    this.corner = corner;               // rectShape._cRad = corner
    this.border = border;               // calc & setBounds (disp + border) -> rectShape -> this
    const rect = this.calcBounds();
    this.rectShape.setRectRad(rect);    // update XYWH
    this.paint(bgColor, true);            // set initial color, Graphics
    this.addChild(this.rectShape, this.disp);
  }

  /** a RectShape using calcBounds[borders, disp], no strokec. */
  rectShape: RectShape = new RectShape({ x: 0, y: 0, w: 8, h: 8, r: 0 }, C.WHITE, '');
  /** DisplayObject displayed above a RectShape of color  */
  readonly disp: DisplayObject;

  dx0 = 0
  dx1 = 0
  dy0 = 0
  dy1 = 0

  /**
   * set dx0 (left) & dx1 (right) border size.
   * 
   * Note: call setBounds(undefined, 0, 0, 0) after adjusting dx* or dy* 
   */ 
  set dx(dx: number) { this.dx0 = this.dx1 = dx }
  /** 
   * set dy0 (top) & dy1 (bottom) border size.
   * 
   * Note: call setBounds(undefined, 0, 0, 0) after adjusting dx* or dy* 
   */ 
  set dy(dy: number) { this.dy0 = this.dy1 = dy }

  /** extend RectShape around DisplayObject bounds. */
  set border(b: number) {
    this.dx = this.dy = b
    this.setBounds(undefined, 0, 0, 0)
  }
  /** [dx0, dx1, dy0, dy1] are [left, right, top, bottom] margins */
  get borders(): [number, number, number, number] { return [this.dx0, this.dx1, this.dy0, this.dy1] }
  /** 
   * set any of [dx0, dx1, dy0, dy1]
   * 
   * Note: setBounds(undefined, 0, 0, 0) after adjusting borders 
   */
  set borders(db: [number | undefined, number | undefined, number | undefined, number | undefined]) {
    db[0] !== undefined && (this.dx0 = db[0]);
    db[1] !== undefined && (this.dx1 = db[1]);
    db[2] !== undefined && (this.dy0 = db[2]);
    db[3] !== undefined && (this.dy1 = db[3]);
  }

  _corner: number = 0;
  /** corner radius, does not repaint/recache */
  get corner() { return this._corner; }
  set corner(r: number) {
    this._corner = r;
    this.rectShape.setRectRad({ r })
  }

  /** RectWithDisp.paint(color) paints rectShape with new color and XYWHRS. */
  paint(color = this.rectShape.colorn, force?: boolean ) {
    return this.rectShape.paint(color, force);
  }

  /** uses PaintableShape.setCacheID. */
  setCacheID() {
    this.rectShape.setCacheID.call(this); //invoke from a PaintableShape
  }

  /** Extend around (disp.getBound() ?? {0, 0, 10, 10})
   *
   * override if (disp.bounds +/- border) is not what you want.
   */
  calcBounds(): XYWH {
    const { x, y, width: w, height: h } = this.disp.getBounds() ?? { x: 0, y: 0, width: 10, height: 10 };
    // disp.bounds is wrt its own origin, translate to this.origin
    const { x: x0, y: y0 } = this.disp;
    const [ dx0, dx1, dy0, dy1 ] = this.borders;
    const b = { x: x0 + x - dx0, y: y0 + y - dy0, w: w + dx0 + dx1, h: h + dy0 + dy1 };
    return b;
  }

  // Bounds = calcBounds (disp.bounds + border) -> rectShape._rect [& cRad] -> this._bounds
  /**
   * Note: if you addChild() to this Container, setBounds(undefined) won't consider them
   * unless you override calcBounds() to do a Rectangle.union()
   */
  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      const cached = this.cacheID;
      this.uncache();
      const { x, y, w, h } = this.calcBounds();
      this.rectShape.setRectRad({ x, y, w, h }); // reshape & setBounds()
      super.setBounds(x, y, w, h);        // save in this._bounds
      if (cached) this.cache(x, y, w, h); // recache if previously cached
    } else {
      super.setBounds(x as any as number, y, width, height);
    }
  }
}

/** A Text label above a colored RectShape.
 *
 * Configure the border width [.3] and corner radius [0].
 */
export class TextInRect extends RectWithDisp implements Paintable, TextStyle {

  declare disp: Text;
  /** Text object displayed above a RectShape of color */
  get label() { return this.disp as Text }

  /**
   * Create Container with Text above a RectShape.
   * @param text label as Text or string
   * @param options [{}] border, corner, fontSize, textColor
   * @param cgf [rscgf] CGF for the RectShape
   * @options
   * * bgColor: [C.WHITE] color of background RectShape
   * * border: [.3] extend RectShape around Text; fraction of fontSize
   * * corner: [0] corner radius of background; fraction of fontSize
   * * fontSize: [defaultRadius/2] if label is a string
   * * textColor: [C.BLACK] initial text.color if label is a string (deprecated)
   * * textColors: [[C.BLACK, C.WHITE]] pick best contrast when paint(color); OR false to retain textColor
   * 
   * textColor is retained when textColors == false or if paint() is not called.
   */
  constructor(label: Text | string, options: TextInRectOptions = {}, cgf?: CGF) {
    const { fontSize, fontName, textColor, border, corner, bgColor } =
      { fontSize: F.defaultSize, 
        fontName: F.defaultFont, 
        textColor: C.BLACK, 
        border: .3, corner: 0, 
        bgColor: C.WHITE,
        ...options }
    const text = (typeof label === 'string') ? new CenterText(label, F.fontSpec(fontSize, fontName), textColor) : label;
    super(text, { bgColor, border, corner }, cgf);  // ISA new Container()
    this.textColors = (options.textColors === false) ? [] : (options.textColors ?? [C.black, C.white]);
    if (this.textColors.length > 0) {
      // wrap advice around rscgf to also select text.color:
      this.alsoPickTextColor()
    }
  }

  textColors: string[]
  /**
   * Advise rectShape.cgf so textColor is updated with C.pickTextColor when paint() invokes rectShape.cgf;
   * @param textColors [this.textColors] set/retain as this.textColors
   * @param cgf [this.rectShape.cgf] the cgf to wrap and set as rectShape.cgf
   */
  alsoPickTextColor(textColors = this.textColors, cgf = this.rectShape.cgf, ) {
    this.textColors = textColors;
    this.rectShape.cgf = (color: string, g?: Graphics) => {
      this.label.color = C.pickTextColor(color, this.textColors);
      return cgf.call(this.rectShape, color, g)
    }
  }

  get fontSize() { return F.fontSize(this.label.font) }; 
  get fontName() { return F.fontName(this.label.font) };
  get textWidth() { return textWidth(this.label.text, this.fontSize, this.fontName) }
  get textColor() { return this.label.color ?? C.BLACK }
  get bgColor() { return this.rectShape.colorn }

  /** extend RectShape around Text bounds, in per-LineHeight units;
   * 
   * sets: dx = dy = tb
   * 
   * actual border size will be: tb * (LineHeight of text)
   * @param tb fraction of line height. 
   */
  override set border(tb: number) { super.border = tb; }
  /** set all the borders, in per-LineHeight units */
  override set borders(db) { super.borders = db; }
  /** get all the borders, in pixel units; as used by calcBounds */
  override get borders() { 
    const lh = this.label.getMeasuredLineHeight();
    const bb = super.borders
    return bb.map(d => d * lh) as [number, number, number, number]
  }

  /** corner radius; fraction of line height. */
  override get corner() { return this._corner; }
  override set corner(tr: number) {
    this._corner = tr;     // get corner() returns this unscaled value
    // but internally, _cRad is scaled by lineHeight
    const r = tr * this.label.getMeasuredLineHeight();
    this.rectShape.setRectRad({ r })
  }
  /** the string inside the Text label. aka innerText */
  get label_text() { return this.label.text; }
  set label_text(txt: string | undefined) {
    this.label.text = txt as string;
    this.setBounds(undefined, 0, 0, 0)
    this.paint(undefined, true);
  }
}

export type TextStyle = { 
  fontSize?: number, 
  fontName?: string, 
  textColor?: string,
  textAlign?: string, // rarely used
}

/** RectWithDispOptions */
export type RectWithDispOptions = {
  bgColor?: string, 
  border?: number,
  corner?: number,
}

export type TextInRectOptions = RectWithDispOptions & TextStyle & { textColors?: string[] | false };

export type UtilButtonOptions = {
  rollover?: (mouseIn: boolean) => void,
  active?: boolean,
  visible?: boolean,
}
// From ankh, 'done' button to move to next phase or action.
/** Construct a CenterText for a TextInRect. */
export class UtilButton extends TextInRect {
  /**
   * Create Container with CenterText above a RectShape.
   *
   * on(rollover|rollout, this.rollover(mouseIn))
   *
   * initially visible & mouseEnabled, but deactivated.
   * @param label if not instanceof Text: new CenterText(label, fontSize, textColor)
   * @param options
   * * bgColor: [C.WHITE] color of background RectShape
   * * rollover: [undefined] invoked for rollover/rollout with (true/false)
   * * visible: [false] initial visibility
   * * active: [false] supply true|false to activate(active, visible) including stage?.update()
   * * border: [.3] extend RectShape around Text; fraction of fontSize
   * * corner: [0] corner radius of background; fraction of fontSize
   * * fontSize: [F.defaultSize] if label is a string
   * * textColor: [C.BLACK] if label is a string
   * * textColors: [[C.BLACK, C.WHITE]] pick best contrast when paint(color); OR false
   * @param cgf [rscgf] CGF for the RectShape
   */
  constructor(label: string | Text, options: UtilButtonOptions & TextInRectOptions = {}, cgf?: CGF) {
    const { rollover, active, visible } = options
    super(label, options, cgf)
    this.rollover = rollover;

    this.on('rollover', () => this._active && this.rollover && this.rollover(true), this);
    this.on('rollout', () => this._active && this.rollover && this.rollover(false), this);
    this.mouseEnabled = this.mouseChildren = this._active = false;
    if (active !== undefined) {
      this.activate(active, visible); // this.stage?.update()
    } else {
      this.visible = !!visible;
    }
  }

  /** When activated, this.rollover(mouseIn) is invoked when mouse enter/exits this button. */
  rollover?: (mouseIn: boolean) => void;
  _active = false;
  /** indicates if this button is currently activated. */
  get isActive() { return this._active; }
  /**
   * Activate (or deactivate) this UtilButton.
   *
   * When activated: visible, mouseEnabled, enable rollover(mouseIn).
   *
   * @param active [true] false to deactivate
   * @param vis [active] true or false to set this.visible
   * @param update [vis !== this.visible] if true then stage.update()
   * @returns this
   */
  activate(active = true, vis = active, update = (vis !== this.visible)) {
    this.mouseEnabled = this._active = active;
    this.visible = vis;
    update && this.stage?.update();
    return this;
  }

  /**
   * Maybe hide/deactivate this UtilButton, repaint the stage, then call function/method.
   *
   * Allow Chrome to finish stage.update() before proceeding with after().
   *
   * @param after [() => {}] callback on('drawend') when stage.update is done [none]
   * @param scope [this] thisArg for after [this UtilButton]
   * @param hide [false] true to deactivate this UtilButton
   * @deprecated use easeljs-lib.afterUpdate(dispObj, after, scope) directly
   */
  updateWait(after?: () => void, scope: any = this, hide = false) {
    if (hide) this.activate(false)
    // using @thegraid/easeljs-module@^1.1.8: on(once=true) will now 'just work'
    // using @thegraid/easeljs-lib@^1.3.12: afterUpdate will always update
    afterUpdate(this, after, scope)
  }
}
