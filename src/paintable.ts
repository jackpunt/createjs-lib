import { type XYWH, C, className, F } from "@thegraid/common-lib";
import { type DisplayObject, Graphics, Shape, type Rectangle, type Text } from "@thegraid/easeljs-module";
import { CenterText } from "./center-text";
import { afterUpdate, textWidth } from "./createjs-functions";
import { NamedContainer } from "./named-container";

export interface Paintable extends DisplayObject {
  /** paint with new player color; updateCache() */
  paint(colorn: string, force?: boolean): Graphics;

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
 * Usage: ??? [obsolete?]
 * - ps = super.makeShape(); // ISA PaintableShape
 * - ps.cgf = (color) => new CGF(color);
 * - ...
 * - ps.paint(red); --> ps.graphics = gf(red) --> new CG(red);
 * -
 * - const cgf: CGF = (color: string, g = new Graphics()) => {
 * -     return g.f(this.color).dc(0, 0, rad);
 * -   }
 * - }
 */
// The "origin story" was to create new Shapes without subclassing.
// Just make a new PaintableShape with its CGF
// can even compose by passing/invoking the CGF of other Shapes.
// the tricky bit for that is finding the 'inherited' CGF;
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
  cgfGraphics: Graphics; // points to this.graphics after cgf runs.
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
      super.setBounds(x as any as number, y, width, height);
    }
  }

  /** subclass to override to compute actual bounds of their Shape. */
  calcBounds(): XYWH {
    return { x: 0, y: 0, w: 5, h: 5 }
  }

  /** ensure PaintableShape is cached; expect setBounds() already done. */
  setCacheID() {
    if (this.cacheID) return;  // also: if already cached, get/setBounds is useless
    let b = this.getBounds() as Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>
    if (!b) {
      const { x, y, w, h } = this.calcBounds();
      b = { x, y, width: w, height: h }
    }
    this.cache(b.x, b.y, b.width, b.height);
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
   * pscgf() invokes drawPoly(0,0,...);
   *
   * To adjust (x,y): supply g0 = new Graphics().mt(x,y)
   * @param params \{ rad, nsides, pSize, tilt, fillc, strokec }
   * @param g0 Graphics base
   */
  constructor({ rad, nsides, pSize, tilt, fillc, strokec }:
    { rad?: number, nsides?: number, pSize: number, tilt?: number, fillc?: string, strokec?: string }, g0?: Graphics) {
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

  readonly degToRadians = 180/Math.PI;
  /** set fillc and strokec, invoke drawPoly(0, 0, ...) */
  pscgf(fillc: string, g = this.g0) {
    ((this.fillc = fillc) ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    g.dp(0, 0, this.rad, this.nsides, this.pSize, this.tilt * this.degToRadians);
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

export class EllipseShape extends PaintableShape {
  /**
   * ellipse centered on (0,0), axis is NS/EW, rotate after.
   * @param radx radius in x dir
   * @param rady radisu in y dir
   * retain g0, to use as baseline Graphics for each paint()
   */
  constructor(public fillc = C.white, public radx = PaintableShape.defaultRadius / 2, public rady = PaintableShape.defaultRadius / 2, public strokec = C.black, g0?: Graphics) {
    super((fillc) => this.cscgf(fillc), strokec, g0);
    this._cgf = this.cscgf; // overwrite to remove indirection...
    this.paint(fillc);
  }

  cscgf(fillc: string, g = this.g0) {
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
type XYWHRS = Partial<XYWH> & { r?: number, s?: number }

/** a Rectangular Shape, maybe with rounded corners */
export class RectShape extends PaintableShape {

  // compare to Bounds;
  // this._bounds: Rectangle === { x, y, width, height }
  /** the rectangle to draw & fill; components set by setRectRad() */
  readonly _rect: XYWH = { x: 0, y: 0, w: 10, h: 10 };
  _cRad!: number;
  _sSiz!: number;
  strokec!: string;

  /**
   * Paint a rectangle (possibly with rounded corners) with fillc and stroke.
   * @param rect \{ x=0, y=0, w=rad, h=rad, r=0, s=1 } origin, extent, corner radius, stroke width.
   * @param fillc [C.white] color to paint the rectangle, '' for no fill
   * @param strokec [C.black] stroke color, '' for no stroke
   * @param g0 [new Graphics()] Graphics to clone and extend during paint()
   */
  constructor(
    { x = 0, y = 0, 
      w = PaintableShape.defaultRadius, 
      h = PaintableShape.defaultRadius, 
      r = 0, s = 1 }: XYWHRS,
    fillc = C.white,
    strokec = C.black,
    g0?: Graphics,
  ) {
    super((fillc) => this.rscgf(fillc), fillc, g0);
    this._cgf = this.rscgf;     // replace ()=>{} with direct function (now that we can say 'this')
    this.strokec = strokec;
    this.setRectRad({ x, y, w, h, r, s })
    this.paint(fillc, true); // this.graphics = rscgf(...)
  }

  /** update any of {x, y, w, h, r, s} & setBounds(...); for future paint() */
  setRectRad({ x, y, w, h, r, s }: XYWHRS) {
    const rect = this._rect;
    (x !== undefined) && (rect.x = x);
    (y !== undefined) && (rect.y = y);
    (w !== undefined) && (rect.w = w);
    (h !== undefined) && (rect.h = h);
    (r !== undefined) && (this._cRad = r);
    (s !== undefined) && (this._sSiz = s);
    this.setBounds(undefined, 0, 0, 0);
  }

  override setBounds(x: number | undefined | null, y: number, width: number, height: number): void {
    if (x === undefined) {
      const { x, y, w, h } = this._rect;
      this.setBounds(x, y, w, h)
    } else {
      super.setBounds(x, y, width, height) // can be different from _rect
    }
  }

  /** draw rectangle, maybe with rounded corner, maybe with ss & strokec */
  rscgf(fillc: string, g = this.g0) {
    const { x, y, w, h } = this._rect;
    const ss1 = (this.strokec && this._sSiz) ? this._sSiz : 0, ss2 = (ss1 > 0) ? 2 * ss1 + 1 : 0;
    (fillc ? g.f(fillc) : g.ef());
    (this.strokec ? g.s(this.strokec) : g.es());
    if (this.strokec && (ss1 > 0)) g.ss(ss2);  // use ss only if: strokec && (ss > 0)
    // enlarge _rect to include ss;
    if (this._cRad === 0) {
      g.dr(x - ss1, y - ss1, w + ss2, h + ss2);
    } else {
      g.rr(x - ss1, y - ss1, w + ss2, h + ss2, this._cRad);
      // note: there is also a drawRoundRectComplex(x,y,w,h,rTL,rTR,rBR,rBL)
    }
    return g;
  }
}


/** Container with a colored RectShape behind the given DisplayObject. */
export class RectWithDisp extends NamedContainer implements Paintable {

  /**
   * Create Container a RectShape behind the given DisplayOBject.
   *
   * The RectShape extends around (disp.getBounds() ?? { 0, 0, 10, 10 })
   * @param disp a DisplayObject
   * @param color [WHITE] of background RectShape.
   * @param border [5] extend RectShape around disp
   * @param corner [0] corner radius
   * @param cgf [tscgf] CGF for the RectShape
   */
  constructor(disp: DisplayObject, options: RectWithDispOptions, cgf?: CGF) {
    super('rectWithDisp');               // ISA new Container()
    const { bgColor, border, corner } = { bgColor: C.WHITE, border: 5, corner: 0, ...options };
    if (cgf) this.rectShape._cgf = cgf;  // HasA RectShape & DisplayObject
    this.disp = disp;
    this.corner = corner;               // rectShape._cRad = corner
    this.border = border;               // calc & setBounds (disp + border) -> rectShape -> this
    const rect = this.calcBounds();
    this.rectShape.setRectRad(rect);
    this.paint(bgColor, true);            // set initial color, Graphics
    this.addChild(this.rectShape, this.disp);
  }

  /** draws a RectShape around disp, with border, no strokec */
  rectShape: RectShape = new RectShape({ x: 0, y: 0, w: 8, h: 8, r: 0 }, C.WHITE, '');
  /** DisplayObject displayed above a RectShape of color  */
  readonly disp: DisplayObject;

  dx0 = 0
  dx1 = 0
  dy0 = 0
  dy1 = 0

  /** Note; call setBounds(undefined, 0, 0, 0) after adjusting dx* or dy* */ 
  set dx(dx: number) { this.dx0 = this.dx1 = dx }
  /** Note; call setBounds(undefined, 0, 0, 0) after adjusting dx* or dy* */ 
  set dy(dy: number) { this.dy0 = this.dy1 = dy }

  /** extend RectShape around DisplayObject bounds. */
  set border(b: number) {
    this.dx = this.dy = b
    this.setBounds(undefined, 0, 0, 0)
  }
  get borders() { return [this.dx0, this.dx1, this.dy0, this.dy1] as [number, number, number, number] }

  _corner: number;
  /** corner radius, does not repaint/recache */
  get corner() { return this._corner; }
  set corner(r: number) {
    this._corner = r;
    this.rectShape.setRectRad({ r })
  }

  /** RectWithDisp.paint(color) paints new color for the backing RectShape. */
  paint(color = this.rectShape.colorn, force = false ) {
    this.rectShape.rscgf;
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

  /**
   * Create Container with Text above a RectShape.
   * @param text label as Text or string
   * @param options [{}] border, corner, fontSize, textColor
   * @param cgf [tscgf] CGF for the RectShape
   * @options
   * * bgColor: [C.WHITE] color of background RectShape
   * * border: [.3] extend RectShape around Text; fraction of fontSize
   * * corner: [0] corner radius of background; fraction of fontSize
   * * fontSize: [defaultRadius/2] if label is a string
   * * textColor: [C.BLACK] if laabel is a string
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
  }

  get fontSize() { return F.fontSize(this.disp.font) }; 
  get fontName() { return F.fontName(this.disp.font) };
  get textWidth() { return textWidth(this.disp.text, this.fontSize, this.fontName) }
  get textColor() { return this.disp.color ?? C.BLACK }
  get bgColor() { return this.rectShape.colorn }

  /** Text object displayed above a RectShape of color */
  get label() { return this.disp; }

  /** extend RectShape around Text bounds;
   * set all borders = tb * (line height of text)
   * @param tb fraction of line height. 
   */
  override set border(tb: number) { super.border = tb; }
  override get borders() { 
    const lh = this.disp.getMeasuredLineHeight();
    const bb = super.borders
    return bb.map(d => d * lh) as [number, number, number, number]
  }

  /** corner radius; fraction of line height. */
  override get corner() { return this._corner; }
  override set corner(tr: number) {
    this._corner = tr;     // get corner() returns this unscaled value
    // but internally, _cRad is scaled by lineHeight
    const r = tr * this.disp.getMeasuredLineHeight();
    this.rectShape.setRectRad({ r })
  }
  /** the string inside the Text label. aka innerText */
  get label_text() { return this.disp.text; }
  set label_text(txt: string | undefined) {
    this.disp.text = txt as string;
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

export type TextInRectOptions = RectWithDispOptions & TextStyle;

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
   * * textColor: [C.BLACK] if laabel is a string
   * @param cgf [tscgf] CGF for the RectShape
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
  rollover: (mouseIn: boolean) => void;
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
