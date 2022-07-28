import { Container, Graphics, Shape, Text } from "@thegraid/easeljs-module"
import { C, F, S, textWidth, XYWH } from "./index.js"
import { KeyBinder, Binding  } from "./key-binder.js";

export type TextStyle = { bgColor: string, fontSize?: number, fontName?: string, textColor?: string }
/** a Container with a [rectangle] Shape and a Text.
 * keystrokes to the Shape are inserted into the Text.
 * 
 * EditBox:
 * localSetKey(BS,DEL,C-A, C-K, C-W, C-Y, C-B, C-F) to edit functions...?
 */
export class EditBox extends Container {
  // TODO: find platform 'clipboard' so can cut/paste outside createjs
  static killBuf: string[] = [] // from C-k, suitable for C-y
  box: Shape = new Shape()
  text: Text = new Text();
  buf: string[] = []
  point: number = 0 // buf[0..point] are before the cursor; buf[point+1..max] are after cursor
  rect: XYWH 
  bgColor: string = C.WHITE
  fontSize: number = 32
  fontName: string;
  textColor: string = C.BLACK
  // text.textBaseline: Default is "top" [vs "alphabetic".. the 'line' baseline]
  cmark = new Shape(new Graphics().f(C.black).mt(0,0).lt(0,32)); // cursor mark
  // cursor: A CSS cursor (ex. "pointer", "help", "text", etc) that will be displayed when the user hovers over this display object.
  makeCursor(color = C.BLACK, y = this.fontSize) {
    this.cmark.graphics.c().f(color).mt(0,0).lt(0,y)
    this.cmark.cache(-1,0,2,1+y)
    this.addChild(this.cmark)
    this.cmark[S.Aname] = 'cursor'
  }
  // TODO: need option to expand rect/shape OR scroll OR wrap the text within box.
  /**
   * A box can display & edit Text
   * @param rect  bounding rectange for box
   * @param bgColor fillColor for box
   * @param fontSize for text in box
   * @param fontName for text in box
   * @param textColor for text in box
   */
  constructor(rect: XYWH = { x: 0, y: 0, w: 100, h: 40 }, style: TextStyle) {
    super()
    this.rect = rect
    this.initKeys()
    this.addChild(this.box)
    this.addChild(this.text)
    this.reset(rect, '', style)
  }
  reset(rect: XYWH, text = this.buf.join(''), style?: TextStyle) {
    this.box.graphics.c().f(this.bgColor).rect(rect.x, rect.y, rect.w, rect.h)
    this.setText(text, style)
  }

  initKeys() {
    let selfKey: RegExp = /\S| /, scope = this
    KeyBinder.keyBinder.setKey(selfKey, { thisArg: this, func: this.selfInsert }, scope)
    KeyBinder.keyBinder.setKey("Enter", { thisArg: this, func: this.newline }, scope)
    KeyBinder.keyBinder.setKey("Backspace", { thisArg: this, func: this.delBack }, scope)
    KeyBinder.keyBinder.setKey("ArrowRight", { thisArg: this, func: this.movePoint, argVal: 1 }, scope)
    KeyBinder.keyBinder.setKey("ArrowLeft", { thisArg: this, func: this.movePoint, argVal: -1 }, scope)
    KeyBinder.keyBinder.setKey("C-f", { thisArg: this, func: this.movePoint, argVal: 1 }, scope)
    KeyBinder.keyBinder.setKey("C-b", { thisArg: this, func: this.movePoint, argVal: -1 }, scope)
    KeyBinder.keyBinder.setKey("C-e", { thisArg: this, func: this.movePoint, argVal: 'max' }, scope)
    KeyBinder.keyBinder.setKey("C-a", { thisArg: this, func: this.movePoint, argVal: 'min' }, scope)
    KeyBinder.keyBinder.setKey("C-k", { thisArg: this, func: this.kill }, scope)
    KeyBinder.keyBinder.setKey("C-y", { thisArg: this, func: this.yank}, scope)
  }
  setStyle(style?: TextStyle) {
    style?.hasOwnProperty('fontSize') && (this.fontSize = style.fontSize)
    style?.hasOwnProperty('fontName') && (this.fontName = style.fontName)
    style?.hasOwnProperty('textColor') && (this.textColor = style.textColor)
    style?.hasOwnProperty('bgColor') && (this.bgColor = style.bgColor)
    this.makeCursor()
  }
  setText(text = '', style?: TextStyle) {
    this.setStyle(style)
    this.text.font = F.fontSpec(this.fontSize, this.fontName)
    this.text.color = this.textColor
    this.buf = Array.from(text)
    this.point = Math.max(0, this.buf.length)
    this.repaint(text)
  }
  get innerText() { return this.text.text }

  repaint(text = this.buf.join('')) {
    // first: assume no line-wrap
    this.text.text = text    // TODO: show cursor moved...
    // QQQQ: should cursor be a Text/Char? or a Shape(graphics)?
    // either way: compute length of text up to cursor, calc XY coords,
    // show cursor and rest of text at that point.
    let pre = this.buf.slice(0,this.point).join('')
    let w = textWidth(pre, this.fontSize, this.fontName)
    this.cmark.x = w
    this.stage?.update()
    // compute text length, move 'cursor' Shape to right place.
    // see est-scm text layout code for hints on multi-line layout
    // OR: do an Array<Line> ... but therein lies other madness.
  }
  movePoint(argVal: any, eStr: string | KeyboardEvent) {
    if (argVal == 'min') this.point = 0
    else if (argVal == 'max') this.point = this.buf.length
    else this.point = Math.max(0, Math.min(this.buf.length, this.point + argVal))
    this.repaint()
  }
  /**
   * insert eStr to text at point++ (insert-before-point)
   * @param argVal undefined & unused (unless Binding includes something)
   * @param eStr a single char [\S]
   */
  selfInsert(argVal: any, eStr: string | KeyboardEvent) {
    this.buf.splice(this.point++, 0, eStr as string)
    this.repaint()
  }
  newline(argVal: any, eStr: string | KeyboardEvent) {
    this.selfInsert(argVal, '/n')  // TODO: confirm createjs/DOM does the right thing
  }
  /** delete char before cursor */
  delBack(argVal: any, eStr: string | KeyboardEvent) {
    if (this.point < 1) return
    this.buf.splice(--this.point, 1)
    this.repaint()
  }
  kill(argVal: any, eStr: string | KeyboardEvent) {
    EditBox.killBuf = this.buf.splice(this.point, this.buf.length - this.point)
    this.repaint()
  }
  yank(argVal: any, eStr: string | KeyboardEvent) {
    this.buf.splice(this.point, 0, ...EditBox.killBuf)
    this.repaint()
  }
  setFocus(f = true) {
    KeyBinder.keyBinder.setFocus(f ? this : undefined)
  }
  setBind(w: number, h: number, init?: string, focus?: Binding, blur?: Binding) {

  }
}