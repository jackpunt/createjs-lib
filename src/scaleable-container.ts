import { Container, DisplayObject, Point, Matrix2D, Event } from '@thegraid/easeljs-module';
import { XY, S, stime } from './index.js';

export type SC = ScaleableContainer

/** see scaleInit */
export type ScaleParams = { zscale?: number, initScale?: number, scale0?: number, steps?: number, unscaleMin?: number, scaleMax?: number, unscaleMax?: number }

export class ScaleEvent extends Event {
  constructor(type: string, scale: number, scaleNdx: number) {
    super(type, true, true)
    this.scale = scale
    this.scaleNdx = scaleNdx
  }
  scale: number;
  scaleNdx: number
}
/** ScalableContainer is a Container, implements transforms to scale the display.
 * Child elements can be scaled with the Container (addChild)
 * or remain a constant size even as the Container scales (addUnscaled)
 */
export class ScaleableContainer extends Container {
  transform?: Matrix2D; // not used
  initIndex: number = 1;

  /** 
    * Create a Container
    * then makeZoomable: so can Zoom/unZoom at the mouse-point
    * if there are interposed transforms, it may not work right.
    * @param parent If supplied: parent.addChild(this); [createjs.stage]
    */
  constructor(parent?: Container, params?: ScaleParams) {
    super(); // Container();
    // x0,y0 is used for reset (di==0)
    // also default zoom point; but mousezoom always supplies mousepoint
    this.name = "ScaleableContainer"
    if (parent) {
      parent.addChild(this);
      //console.log(stime(this, ".constructor parent="), parent);
      this.makeZoomable(params); // requires parent -> stage
    }
  }

  //scaleAry=[0.625,0.7875,1,1.250,1.5752961,2,2.5,3,4,5,6,8,10,13,16,20,25,32,40,50,64,80,101,127,160,202,254,321,404,509,641]
  // [ -3:0.5, -2:0.65, -1:0.8, 0:1.0, 1:1.26, ... 30:1026] 
  /** scale factor of  for each increment of zoom */
  protected scaleAry: Array<number> = [1]
  protected scaleNdx: number = 0;
  protected scaleBase: number = 1;
  protected scaleMaxNdx = 32
  protected unscaleMax = 1
  protected unscaleMin = 1
  protected macro = 2;

  private stopEvent(ev: WheelEvent) {
    // prevent window scrolling on WheelEvent
    ev.stopPropagation();
    ev.preventDefault();
    ev.returnValue = false;
    return false;
  }

  /** 
   * addEventListener for mousewheel and DOMMouseScroll to zoom to/from XY. 
   * @param zscale sensitivity to event.wheelDelta (.3)
   * @return initial {index, scale}
  */
  makeZoomable(params: ScaleParams = {}): number {
    let ndxScale = this.scaleInit(params);
    let zscale = params.zscale || .33; // slow down the zoom, require multiple events to change scale
    let contr = this
    let stage = contr.stage;
    let di: number = 0 // accumulate scroll increments
    const mouseWheelHandler = ((e: WheelEvent) => {
      let pmx: number = stage.mouseX / stage.scaleX;
      let pmy: number = stage.mouseY / stage.scaleY;
      let p: Point = new Point(pmx, pmy);
      let delta = -e.deltaY // +N or -N (N greater for faster scroll, zscale for slower)
      // noting that *I* have scroll reversed from Apple std of "drag the document"
      //console.log(stime(this, ".mouseWheelHandler e="), delta, e.deltaX, e.deltaZ, e);
      di += Math.sign(delta) * zscale
      let dj = Math.trunc(di)

      if (dj != 0) {
        contr.scaleContainer(dj, p);  // zoom in/out by dj
        di -= dj;
        stage.update();
      }
      return contr.stopEvent(e);
    });
    // createjs can get the "click" and "drag" events from mouse.
    // createjs does not access the "wheel" or "mousewheel" event
    // only comes from Element (ie HTMLElement; and HTMLCanvasElement in our case)
    let canvas = (stage.canvas as HTMLCanvasElement);
    if (!!canvas) canvas.addEventListener("wheel", mouseWheelHandler, false);
    return ndxScale
  }

  /** reset the zoom-scaling array: 
   * 
   * Note: unscaled objects *are* scaled when scaleNdx\<0 (if min\<0)
   * 
   * Note: unscaled objests are super-scaled (1.5x) when scaleNdx>(max-2)
   * @param params -
   * - scale0: scale a 0: [1]
   * - scaleMax: scale at max: [1000]
   * - steps: highest index: [32]
   * - initScale: initial scale: [scale0] --> determines initIndex = findIndex(initScale)
   * - unscaleMax: max scale of unscaled zoomed out [1/scaleAry[2]]
   * - unscaleMin: min scale of unscaled zoomed in [1/scaleAry[steps-2]]
   * - zscale: zoom speed scaling
   * 
   * @return initIndex [findIndex(initScale)]
   */
  public scaleInit(params: ScaleParams = {}): number {
    let { scale0 = 1.0, steps: steps = 30, scaleMax: scaleMax = 1000, initScale = scale0, unscaleMin, unscaleMax } = params;
    //console.log(stime(this, ".scaleInit:"), params)
    this.scaleMaxNdx = steps;
    this.setupScaleAry(scale0, scaleMax, steps)
    this.unscaleMax = unscaleMax || (1/this.scaleAry[2])
    this.unscaleMin = unscaleMin || (1/this.scaleAry[steps-2])
    this.initIndex = this.scaleNdx = this.findIndex(initScale)
    this.scaleContainer(0) // reset using this.initIndex
    return this.initIndex;
  }
  /** divide interval from scale0 to scaleMax into nSteps (nSteps+1 values) */
  setupScaleAry(scale0: number, scaleMax: number, nSteps: number) {
    this.scaleAry = new Array();
    this.scaleMaxNdx = nSteps
    let base = this.scaleBase = 1 + Math.log(scaleMax / scale0) / (nSteps - 2)
    for (let i: number = 0; i <= nSteps; i++) {
      let scale = scale0 * Math.pow(base, i), rs = Math.round(scale)
      if (scale > 1.8 && Math.abs(scale - rs) < .08 * scale) scale = rs; // use integral scale when close
      this.scaleAry[i] = scale
    }
  }
  /** find scaleIndex that gets closest to scale
   * @param scale the scale factor you want to get (or 'base' when setting)
   * @param setAry true to setup the scaleAry, false to simply query [default]
   * @return index that gets closest so given scale
   */
  findIndex(scale: number) {
    let r = Math.round(Math.log(scale/this.scale0) / Math.log(this.scaleBase ))
    return Math.max(0, Math.min(r, this.scaleMaxNdx));
  }

  /** lowest scale for unscaled items */
  get scale0() { return this.scaleAry[0] }
  /** the current index into the scale array */
  get scaleIndex() { return this.scaleNdx }
  /** the current scale factor from scaleAry (actual scaleX/scaleY may be different) */
  get scaleXY() { return this.scaleAry[this.scaleNdx] }

  /** set scaleIndex & return associated scale factor */
  getScale(ndx: number = this.scaleNdx): number {
    ndx = Math.min(this.scaleMaxNdx, Math.max(0, ndx));
    return this.scaleAry[this.scaleNdx = ndx];  // scale associated with given ndx
  }
  /** add di to find new index into scale array 
   * @param di typically: -1, +1 (0 to return currentScale)
   */
  incScale(di: number): number {
    return this.getScale(this.scaleNdx + di);   // new scale
  }

  /**
   * Set scale exactly; set scale index approximately and return it.
   * @param ns new scale
   * @param xy scale around this point (so 'p' does not move on display) = {0,0}
   * @param sxy move to offset? in new coords?
   * @returns the nearby scaleNdx
   */
  setScale(ns = 1.0, xy: XY = { x: 0, y: 0 }, sxy: XY = { x: 0, y: 0 }): number {
    this.getScale(this.findIndex(ns)); // close appx, no side effects.
    this.scaleInternal(this.scaleX, ns, xy);
    return ns;
  }

  /** zoom to the scale[si] 
   * @param si new scaleNdx
   * @param xy fixed point
   * @return the new scale
   */
  setScaleIndex(si: number, xy?: XY): number {
    let os = this.scaleX
    let ns = this.getScale(si);
    return this.scaleInternal(os, ns, xy);
  }
  /**
   * rescale, set origin, position viewport
   * @deprecated does not use scaleInternal() --> invScale()
   * @param si new scale index; [0 -> scale0 aka initScale]
   * @param xy align xy at parent(0,0) [0,0]
   * @param sxy offset xy to screen position sxy [0,0]
   */
  setScaleXY(si = 0, xy: XY = { x: 0, y: 0 }, sxy: XY = { x: 0, y: 0 }): number {
    let ns = (this.setScaleIndex(si), this.scaleX)
    this.x = sxy.x - xy.x * ns; this.y = sxy.y - xy.y * ns
    return ns
  }
  /**
   * legacy setScaleXY
   * @param si 
   * @param xy set this.{x,y} [0,0]
   */
  setScaleXY0(si: number, xy: XY = { x: 0, y: 0 }) {
    this.setScaleIndex(si)
    this.x = xy.x; this.y = xy.y
  }
  /** Scale this.cont by the indicated scale factor around the given XY.
   * @param di: +1/-1 to increase/decrease scale; 0 to reset to scale0 @ XY
   * @param xy:  scale around this point (so 'p' does not move on display) = {0,0}
   * @return the new scale
   */
  scaleContainer(di: number, xy?: XY): number {
    let os = this.scaleX;            // current scale, for offsets
    let ns = this.incScale(di);
    if (di == 0) { os = 0; ns = this.getScale(this.initIndex) }
    return this.scaleInternal(os, ns, xy);
  }
  /** convert from os to ns; if os=0 then reset to ns 
   * unscaleObj all this._unscale objects.
   * @param os oldScale (or 0 to force reset to p:XY)
   * @param ns newScale
   * @param p  fixed point around which to scale; default: (0,0) OR when os==0: reset to (x,y)
   */
  scaleInternal(os: number, ns: number, p: XY = { x: 0, y: 0}): number {
    let sc = this;
    //console.log(stime(this, ".scaleInternal:"), cont, os, this.scaleNdx, ns, p);
    if (os == 0) {                  // special case to reset origin
      sc.x = p.x;
      sc.y = p.y;
    } else {                        // else: scale around given [mouse] point
      sc.x = (p.x + (sc.x - p.x) * ns / os);
      sc.y = (p.y + (sc.y - p.y) * ns / os);
    }
    sc.scaleX = sc.scaleY = ns;
    // console.log(stime(this, ".scaleInternal:   os="), os.toFixed(4)+" ns="+ns.toFixed(4)+" scale="+scale.toFixed(4)
    //                           +"  p.x="+p.x+"  p.y="+p.y+"  x="+x+" y="+y);
    this.setInvScale(ns)
    //console.log(stime(this, ".invScale="), this.invScale, this.scaleNdx, ns*this.invScale);
    this.unscaleAll();
    if (ns != os) this.dispatchEvent(new ScaleEvent(S.scaled, ns, this.scaleNdx))
    return ns
  }
  /** Scalable.container.addChild() */
  addChildXY(child: DisplayObject, x: number, y: number): DisplayObject {
    this.addChild(child);
    child.x = x;
    child.y = y;
    return child;
  }

  private invScale: number = 1.0;
  private _unscaled: Array<DisplayObject> = new Array<DisplayObject>(); // Set<DisplayObject>
  public addUnscaled(dobj: DisplayObject): void {
    this._unscaled.push(dobj);
    this.unscaleObj(dobj);
  }
  public removeUnscaled(dobj: DisplayObject): void {
    let ndx: number = this._unscaled.indexOf(dobj);
    if (ndx < 0) return;
    delete this._unscaled[ndx];
  }
  protected unscaleObj(dobj: DisplayObject, invScale = this.invScale): void {
    if (dobj != undefined) {
      dobj.regX *= dobj.scaleX/invScale
      dobj.regY *= dobj.scaleY/invScale
      dobj.scaleX = invScale;
      dobj.scaleY = invScale;
    }
    // var tm: Matrix = dobj.transform.matrix;
    // tm.scale(invScale / tm.a, invScale / tm.d); // also scales tm.x, tm.y
    // dobj.transform.matrix = tm;
  }
  protected setInvScale(ns = this.scaleX): number {
    this.invScale = Math.min(this.unscaleMax, Math.max(1 / ns, this.unscaleMin))
    return this.invScale
  }
  protected unscaleAll(invScale = this.invScale): void {
    this._unscaled.forEach(item => this.unscaleObj(item, invScale));
  }
}
