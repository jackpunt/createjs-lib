import { Container, Shape, Text } from "@thegraid/createjs-module"
import { C, F, XYWH } from "."
import { KeyBinder, Binding  } from "./key-binder";

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
  text: Text;
  buf: string[] = []
  point: number = 0

  // TODO: need option to expand rect/shape OR scroll OR wrap the text within box.
  constructor(color: string, rect: XYWH, fontSize: number = 20, fontName?: string, textColor = C.black) {
    super()
    this.box.graphics.f(color).rect(rect.x, rect.y, rect.h, rect.w)
    this.addChild(this.box)
    this.setText('', fontSize, fontName, textColor)
    this.init()
  }

  init() {
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
  setText(text?: string, fontSize?: number, fontName?: string, color: string = C.black) {
    this.text = new Text(text, F.fontSpec(fontSize, fontName), color)
    this.buf = Array.from(text)
    this.point = Math.max(0, this.buf.length - 1)
    this.repaint()
  }
  getText() {
    return this.text.text
  }
  repaint() {
    this.text.text = this.buf.join('')    // TODO: show cursor moved...
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
   * insert eStr to text at point++
   * @param argVal undefined & unused (unless Binding includes something)
   * @param eStr a single char [\S]
   */
  selfInsert(argVal: any, eStr: string | KeyboardEvent) {
    this.buf.splice(this.point++, 0, eStr as string)
    this.repaint()
  }
  newline(argVal: any, eStr: string | KeyboardEvent) {
    this.selfInsert(argVal, '/n')
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