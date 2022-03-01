import type * as createjs from 'createjs-module'
import { className } from './src';
export class EventDispatcher implements createjs.EventDispatcher {
  addEventListener(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): Function;
  addEventListener(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): Function;
  addEventListener(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): Object;
  addEventListener(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): Object;
  addEventListener(type: any, listener: any, useCapture?: any): Object | Function {
    throw new Error('Method not implemented.');
  }
  dispatchEvent(eventObj: Object, target?: Object): boolean;
  dispatchEvent(eventObj: string, target?: Object): boolean;
  dispatchEvent(eventObj: createjs.Event, target?: Object): boolean;
  dispatchEvent(eventObj: any, target?: any): boolean {
    throw new Error('Method not implemented.');
  }
  hasEventListener(type: string): boolean {
    throw new Error('Method not implemented.');
  }
  off(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): void;
  off(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): void;
  off(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): void;
  off(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): void;
  off(type: string, listener: Function, useCapture?: boolean): void;
  off(type: any, listener: any, useCapture?: any): void {
    return;
  }
  on(type: string, listener: (eventObj: Object) => boolean, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
  on(type: string, listener: (eventObj: Object) => void, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
  on(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Object;
  on(type: string, listener: { handleEvent: (eventObj: Object) => void; }, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Object;
  on(type: any, listener: any, scope?: any, once?: any, data?: any, useCapture?: any): Object | Function {
    return listener;
  }
  removeAllEventListeners(type?: string): void {
    return;
  }
  removeEventListener(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): void;
  removeEventListener(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): void;
  removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
  removeEventListener(type: any, listener: any, useCapture?: any): void {
    return
  }
  toString(): string {
    return this.toString()
  }
  willTrigger(type: string): boolean {
    throw new Error('Method not implemented.');
  }
  
}
export class DisplayObject implements createjs.DisplayObject {
  alpha: number;
  cacheCanvas: Object | HTMLCanvasElement;
  cacheID: number;
  compositeOperation: string;
  cursor: string;
  filters: createjs.Filter[];
  hitArea: createjs.DisplayObject;
  id: number;
  mask: createjs.Shape;
  mouseEnabled: boolean;
  name: string;
  parent: createjs.Container;
  regX: number;
  regY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  shadow: createjs.Shadow;
  skewX: number;
  skewY: number;
  snapToPixel: boolean;
  stage: createjs.Stage;
  tickEnabled: boolean;
  transformMatrix: createjs.Matrix2D;
  visible: boolean;
  x: number;
  y: number;
  cache(x: number, y: number, width: number, height: number, scale?: number): void {
    return;
  }
  clone(): createjs.DisplayObject {
    return this;
  }
  draw(ctx: CanvasRenderingContext2D, ignoreCache?: boolean): boolean {
    throw new Error('Method not implemented.');
  }
  getBounds(): createjs.Rectangle {
    throw new Error('Method not implemented.');
  }
  getCacheDataURL(): string {
    throw new Error('Method not implemented.');
  }
  getConcatenatedDisplayProps(props?: createjs.DisplayProps): createjs.DisplayProps {
    throw new Error('Method not implemented.');
  }
  getConcatenatedMatrix(mtx?: createjs.Matrix2D): createjs.Matrix2D {
    throw new Error('Method not implemented.');
  }
  getMatrix(matrix?: createjs.Matrix2D): createjs.Matrix2D {
    throw new Error('Method not implemented.');
  }
  getStage(): createjs.Stage {
    throw new Error('Method not implemented.');
  }
  getTransformedBounds(): createjs.Rectangle {
    throw new Error('Method not implemented.');
  }
  globalToLocal(x: number, y: number, pt?: Object | createjs.Point): createjs.Point {
    throw new Error('Method not implemented.');
  }
  hitTest(x: number, y: number): boolean {
    throw new Error('Method not implemented.');
  }
  isVisible(): boolean {
    throw new Error('Method not implemented.');
  }
  localToGlobal(x: number, y: number, pt?: Object | createjs.Point): createjs.Point {
    throw new Error('Method not implemented.');
  }
  localToLocal(x: number, y: number, target: createjs.DisplayObject, pt?: Object | createjs.Point): createjs.Point {
    throw new Error('Method not implemented.');
  }
  set(props: Object): createjs.DisplayObject {
    throw new Error('Method not implemented.');
  }
  setBounds(x: number, y: number, width: number, height: number): void {
    throw new Error('Method not implemented.');
  }
  setTransform(x?: number, y?: number, scaleX?: number, scaleY?: number, rotation?: number, skewX?: number, skewY?: number, regX?: number, regY?: number): createjs.DisplayObject {
    throw new Error('Method not implemented.');
  }
  uncache(): void {
    throw new Error('Method not implemented.');
  }
  updateCache(compositeOperation?: string): void {
    throw new Error('Method not implemented.');
  }
  updateContext(ctx: CanvasRenderingContext2D): void {
    throw new Error('Method not implemented.');
  }
  addEventListener(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): Function;
  addEventListener(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): Function;
  addEventListener(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): Object;
  addEventListener(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): Object;
  addEventListener(type: any, listener: any, useCapture?: any): Object | Function {
    throw new Error('Method not implemented.');
  }
  dispatchEvent(eventObj: Object, target?: Object): boolean;
  dispatchEvent(eventObj: string, target?: Object): boolean;
  dispatchEvent(eventObj: createjs.Event, target?: Object): boolean;
  dispatchEvent(eventObj: any, target?: any): boolean {
    throw new Error('Method not implemented.');
  }
  hasEventListener(type: string): boolean {
    throw new Error('Method not implemented.');
  }
  off(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): void;
  off(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): void;
  off(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): void;
  off(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): void;
  off(type: string, listener: Function, useCapture?: boolean): void;
  off(type: any, listener: any, useCapture?: any): void {
    throw new Error('Method not implemented.');
  }
  on(type: string, listener: (eventObj: Object) => boolean, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
  on(type: string, listener: (eventObj: Object) => void, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
  on(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Object;
  on(type: string, listener: { handleEvent: (eventObj: Object) => void; }, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Object;
  on(type: any, listener: any, scope?: any, once?: any, data?: any, useCapture?: any): Object | Function {
    throw new Error('Method not implemented.');
  }
  removeAllEventListeners(type?: string): void {
    throw new Error('Method not implemented.');
  }
  removeEventListener(type: string, listener: (eventObj: Object) => boolean, useCapture?: boolean): void;
  removeEventListener(type: string, listener: (eventObj: Object) => void, useCapture?: boolean): void;
  removeEventListener(type: string, listener: { handleEvent: (eventObj: Object) => boolean; }, useCapture?: boolean): void;
  removeEventListener(type: string, listener: { handleEvent: (eventObj: Object) => void; }, useCapture?: boolean): void;
  removeEventListener(type: string, listener: Function, useCapture?: boolean): void;
  removeEventListener(type: any, listener: any, useCapture?: any): void {
    throw new Error('Method not implemented.');
  }
  toString(): string {
    return className(this);
  }
  willTrigger(type: string): boolean {
    throw new Error('Method not implemented.');
  }

}
export class Container extends DisplayObject implements createjs.Container {
  constructor() { super() }
  children: createjs.DisplayObject[];
  mouseChildren: boolean;
  numChildren: number;
  tickChildren: boolean;
  addChild<T extends createjs.DisplayObject>(child: T): T;
  addChild<T extends createjs.DisplayObject>(child0: createjs.DisplayObject, lastChild: T): T;
  addChild<T extends createjs.DisplayObject>(child0: createjs.DisplayObject, child1: createjs.DisplayObject, lastChild: T): T;
  addChild<T extends createjs.DisplayObject>(child0: createjs.DisplayObject, child1: createjs.DisplayObject, child2: createjs.DisplayObject, lastChild: T): T;
  addChild(...children: createjs.DisplayObject[]): createjs.DisplayObject;
  addChild(child0?: any, child1?: any, child2?: any, lastChild?: any, ...rest: any[]): DisplayObject {
    return child0;
  }
  addChildAt<T extends createjs.DisplayObject>(child: T, index: number): T;
  addChildAt<T extends createjs.DisplayObject>(child0: createjs.DisplayObject, lastChild: T, index: number): T;
  addChildAt<T extends createjs.DisplayObject>(child0: createjs.DisplayObject, child1: createjs.DisplayObject, lastChild: T, index: number): T;
  addChildAt(...childOrIndex: (number | createjs.DisplayObject)[]): createjs.DisplayObject;
  addChildAt(child0?: any, child1?: any, lastChild?: any, index?: any, ...rest: any[]): createjs.DisplayObject {
    return child0;
  }
  override clone(recursive?: boolean): this {
    throw new Error('Method not implemented.');
  }
  contains(child: createjs.DisplayObject): boolean {
    throw new Error('Method not implemented.');
  }
  getChildAt(index: number): createjs.DisplayObject {
    throw new Error('Method not implemented.');
  }
  getChildByName(name: string): createjs.DisplayObject {
    throw new Error('Method not implemented.');
  }
  getChildIndex(child: createjs.DisplayObject): number {
    throw new Error('Method not implemented.');
  }
  getNumChildren(): number {
    throw new Error('Method not implemented.');
  }
  getObjectsUnderPoint(x: number, y: number, mode: number): createjs.DisplayObject[] {
    throw new Error('Method not implemented.');
  }
  getObjectUnderPoint(x: number, y: number, mode: number): createjs.DisplayObject {
    throw new Error('Method not implemented.');
  }
  removeAllChildren(): void {
    throw new Error('Method not implemented.');
  }
  removeChild(...child: createjs.DisplayObject[]): boolean {
    throw new Error('Method not implemented.');
  }
  removeChildAt(...index: number[]): boolean {
    throw new Error('Method not implemented.');
  }
  setChildIndex(child: createjs.DisplayObject, index: number): void {
    throw new Error('Method not implemented.');
  }
  sortChildren(sortFunction: (a: createjs.DisplayObject, b: createjs.DisplayObject) => number): void {
    throw new Error('Method not implemented.');
  }
  swapChildren(child1: createjs.DisplayObject, child2: createjs.DisplayObject): void {
    throw new Error('Method not implemented.');
  }
  swapChildrenAt(index1: number, index2: number): void {
    throw new Error('Method not implemented.');
  }
  
}
export class Graphics implements createjs.Graphics {
  command: Object;
  instructions: Object[];
  append(command: Object, clean?: boolean): createjs.Graphics {
    return this;
  }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise: boolean): createjs.Graphics {
    return this;
  }
  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): createjs.Graphics {
    return this;
  }
  beginBitmapFill(image: Object, repetition?: string, matrix?: createjs.Matrix2D): createjs.Graphics {
    return this;
  }
  beginBitmapStroke(image: Object, repetition?: string): createjs.Graphics {
    return this;
  }
  beginFill(color: string): createjs.Graphics {
    return this;
  }
  beginLinearGradientFill(colors: string[], ratios: number[], x0: number, y0: number, x1: number, y1: number): createjs.Graphics {
    return this;
  }
  beginLinearGradientStroke(colors: string[], ratios: number[], x0: number, y0: number, x1: number, y1: number): createjs.Graphics {
    return this;
  }
  beginRadialGradientFill(colors: string[], ratios: number[], x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): createjs.Graphics {
    return this;
  }
  beginRadialGradientStroke(colors: string[], ratios: number[], x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): createjs.Graphics {
    return this;
  }
  beginStroke(color: string): createjs.Graphics {
    return this;
  }
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): createjs.Graphics {
    return this;
  }
  clear(): createjs.Graphics {
    return this;
  }
  clone(): createjs.Graphics {
    return this;
  }
  closePath(): createjs.Graphics {
    return this;
  }
  curveTo(cpx: number, cpy: number, x: number, y: number): createjs.Graphics {
    return this;
  }
  decodePath(str: string): createjs.Graphics {
    return this;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    return;
  }
  drawAsPath(ctx: CanvasRenderingContext2D): void {
    return;
  }
  drawCircle(x: number, y: number, radius: number): createjs.Graphics {
    return this;
  }
  drawEllipse(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  drawPolyStar(x: number, y: number, radius: number, sides: number, pointSize: number, angle: number): createjs.Graphics {
    return this;
  }
  drawRect(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  drawRoundRect(x: number, y: number, w: number, h: number, radius: number): createjs.Graphics {
    return this;
  }
  drawRoundRectComplex(x: number, y: number, w: number, h: number, radiusTL: number, radiusTR: number, radiusBR: number, radisBL: number): createjs.Graphics {
    return this;
  }
  endFill(): createjs.Graphics {
    return this;
  }
  endStroke(): createjs.Graphics {
    return this;
  }
  getInstructions(): Object[] {
    return [];
  }
  inject(callback: (data: any) => any, data: any): createjs.Graphics {
    return this;
  }
  isEmpty(): boolean {
    return true;
  }
  lineTo(x: number, y: number): createjs.Graphics {
    return this;
  }
  moveTo(x: number, y: number): createjs.Graphics {
    return this;
  }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): createjs.Graphics {
    return this;
  }
  rect(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  setStrokeStyle(thickness: number, caps?: string | number, joints?: string | number, miterLimit?: number, ignoreScale?: boolean): createjs.Graphics {
    return this;
  }
  setStrokeDash(segments?: number[], offset?: number): createjs.Graphics {
    return this;
  }
  store(): createjs.Graphics {
    return this;
  }
  toString(): string {
    return `mock-Graphics`;
  }
  unstore(): createjs.Graphics {
    return this;
  }
  a(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise: boolean): createjs.Graphics {
    return this;
  }
  at(x1: number, y1: number, x2: number, y2: number, radius: number): createjs.Graphics {
    return this;
  }
  bf(image: Object, repetition?: string, matrix?: createjs.Matrix2D): createjs.Graphics {
    return this;
  }
  bs(image: Object, repetition?: string): createjs.Graphics {
    return this;
  }
  f(color: string): createjs.Graphics {
    return this;
  }
  lf(colors: string[], ratios: number[], x0: number, y0: number, x1: number, y1: number): createjs.Graphics {
    return this;
  }
  ls(colors: string[], ratios: number[], x0: number, y0: number, x1: number, y1: number): createjs.Graphics {
    return this;
  }
  rf(colors: string[], ratios: number[], x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): createjs.Graphics {
    return this;
  }
  rs(colors: string[], ratios: number[], x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): createjs.Graphics {
    return this;
  }
  s(color: string): createjs.Graphics {
    return this;
  }
  bt(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): createjs.Graphics {
    return this;
  }
  c(): createjs.Graphics {
    return this;
  }
  cp(): createjs.Graphics {
    return this;
  }
  p(str: string): createjs.Graphics {
    return this;
  }
  dc(x: number, y: number, radius: number): createjs.Graphics {
    return this;
  }
  de(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  dp(x: number, y: number, radius: number, sides: number, pointSize: number, angle: number): createjs.Graphics {
    return this;
  }
  dr(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  rr(x: number, y: number, w: number, h: number, radius: number): createjs.Graphics {
    return this;
  }
  rc(x: number, y: number, w: number, h: number, radiusTL: number, radiusTR: number, radiusBR: number, radisBL: number): createjs.Graphics {
    return this;
  }
  ef(): createjs.Graphics {
    return this;
  }
  es(): createjs.Graphics {
    return this;
  }
  lt(x: number, y: number): createjs.Graphics {
    return this;
  }
  mt(x: number, y: number): createjs.Graphics {
    return this;
  }
  qt(cpx: number, cpy: number, x: number, y: number): createjs.Graphics {
    return this;
  }
  r(x: number, y: number, w: number, h: number): createjs.Graphics {
    return this;
  }
  ss(thickness: number, caps?: string | number, joints?: string | number, miterLimit?: number, ignoreScale?: boolean): createjs.Graphics {
    return this;
  }
  sd(segments?: number[], offset?: number): createjs.Graphics {
    return this;
  }
  
}

export class Shape extends DisplayObject implements createjs.Shape {
  constructor(graphics?: Graphics) {
    super()
    this.graphics = graphics || new Graphics()
  }
  graphics: Graphics = new Graphics();
  override clone(recursive?: boolean): createjs.Shape {
    return null;
  }
  override set(props: Object): Shape {
    return this;
  };
  override setTransform(x?: number, y?: number, scaleX?: number, scaleY?: number, rotation?: number, skewX?: number, skewY?: number, regX?: number, regY?: number): Shape {
    return this;
  };

}

export class Text extends DisplayObject implements createjs.Text {
  constructor(text?: string, font?: string, color?: string) {
    super()
    this.text = text;
    this.font = font;
    this.color = color;    
  }
  color: string;
  font: string;
  lineHeight: number;
  lineWidth: number;
  maxWidth: number;
  outline: number;
  text: string;
  textAlign: string;
  textBaseline: string;
  override clone(): createjs.Text {
    return this;
  }
  getMeasuredHeight(): number {
    throw new Error('Method not implemented.');
  }
  getMeasuredLineHeight(): number {
    throw new Error('Method not implemented.');
  }
  getMeasuredWidth(): number {
    throw new Error('Method not implemented.');
  }
  getMetrics(): Object {
    throw new Error('Method not implemented.');
  }
  override set(props: Object): createjs.Text {
    return this;
  }
  override setTransform(x?: number, y?: number, scaleX?: number, scaleY?: number, rotation?: number, skewX?: number, skewY?: number, regX?: number, regY?: number): createjs.Text {
    return this;
  }

}