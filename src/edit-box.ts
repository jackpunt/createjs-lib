import { C, F, S, XYWH } from "@thegraid/common-lib";
import { Graphics, MouseEvent, Shape, Text } from "@thegraid/easeljs-module";
import { textWidth } from "./createjs-functions.js";
import { Binding, KeyBinder, KeyScope } from "./key-binder.js";
import { NamedContainer } from "./named-container.js";

export type TextStyle = { bgColor?: string, fontSize?: number, fontName?: string, textColor?: string }
/** a Container with a [rectangle] Shape and a Text.
 * keystrokes to the Shape are inserted into the Text.
 * 
 * EditBox:
 * localSetKey(BS,DEL,C-A, C-K, C-W, C-Y, C-B, C-F) to edit functions...?
 */
export class EditBox extends NamedContainer implements TextStyle {
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
  cmark = new Shape(new Graphics().s(C.black).mt(0,0).lt(0,32)); // cursor mark
  // cursor: A CSS cursor (ex. "pointer", "help", "text", etc) that will be displayed when the user hovers over this display object.
  makeCursor(color = C.BLACK, dy = this.fontSize) {
    this.cmark.graphics.c().s(color).mt(0,0).lt(0,dy)
    //this.cmark.cache(-1,0,2,1+dy)
    this.addChild(this.cmark)
    this.cmark[S.Aname] = 'cursor'
  }
  // TODO: need option to expand rect/shape OR scroll OR wrap the text within box.
  /**
   * A box can display & edit Text
   * @param rect  bounding rectange for box
   * @param style \{
   *  - bgColor: fillColor for box
   *  - fontSize: for text in box
   *  - fontName: for text in box
   *  - textColor for text in box
   * 
   * }
   */
  constructor(rect: XYWH = { x: 0, y: 0, w: 100, h: 40 }, style?: TextStyle) {
    super('EditBox')
    this.rect = rect
    this.addChild(this.box)
    this.addChild(this.text)
    this.reset(rect, '', style)
    this.initKeys()
  }
  /** draw bounding box, and repaint Text */
  reset({ x, y, w, h }: XYWH, text = this.buf.join(''), style?: TextStyle) {
    this.box.graphics.c().f(this.bgColor).rect(x, y, w, h)
    this.setText(text, style)
  }

  /**
   * resize box to hold given Text
   * @param text [this.text]
   * @param dw extend box by dw to left and right
   * @param dh extend box by hw above and below
   */
  fitRectToText(text = this.text, dw = 0, dh = 0) {
    const { x, y, width: w, height: h } = text.getBounds();
    this.reset({ x: x - dw, y: y - dw, w: w + 2 * dw, h: h + 2 * dh }, text.text);
  }

  initKeys() {
    const selfKey: RegExp = /^(\S)$/, kb = KeyBinder.keyBinder, scope = this.keyScope
    kb.setKey(selfKey, (arg, estr) => this.selfInsert(estr, estr), scope) // no argVal -> use estr
    kb.setKey("Space", { thisArg: this, func: this.selfInsert, argVal: ' ' }, scope)
    kb.setKey("Backspace", { thisArg: this, func: this.delBack }, scope)
    kb.setKey("ArrowRight", { thisArg: this, func: this.movePoint, argVal: '+' }, scope)
    kb.setKey("ArrowLeft", { thisArg: this, func: this.movePoint, argVal: '-' }, scope)
    kb.setKey("C-f", { thisArg: this, func: this.movePoint, argVal: '+' }, scope)
    kb.setKey("C-b", { thisArg: this, func: this.movePoint, argVal: '-' }, scope)
    kb.setKey("M-<", { thisArg: this, func: this.movePoint, argVal: 'min' }, scope)
    kb.setKey("M->", { thisArg: this, func: this.movePoint, argVal: 'max' }, scope)
    kb.setKey("C-a", { thisArg: this, func: this.movePoint, argVal: 'min' }, scope)
    kb.setKey("C-e", { thisArg: this, func: this.movePoint, argVal: 'max' }, scope)
    kb.setKey("C-d", { thisArg: this, func: this.delForw }, scope)
    kb.setKey("C-k", { thisArg: this, func: this.kill }, scope)
    kb.setKey("C-y", { thisArg: this, func: this.yank }, scope)
    kb.setKey("C-l", { thisArg: this, func: this.repaint }, scope)
    kb.setKey('M-v', () => { this.pasteClipboard() })
    this.on(S.click, (ev: MouseEvent) => { 
      this.setFocus(true); 
      const nevt = ev.nativeEvent;
      nevt.preventDefault(); // ev is non-cancelable, but stop the native event...
      nevt.stopImmediatePropagation() 
    })
  }
  setStyle(style?: TextStyle) {
    if (style) {
      const f = ['fontSize', 'fontName', 'textColor', 'bgColor'] as (keyof TextStyle)[];
      f.forEach(key => {
        if (style.hasOwnProperty(key))
          (this as Record<typeof key, string | number>)[key] = style[key]
      })
    }
    this.makeCursor()
  }
  /** replace buffer contents with given text string */
  setText(text = '', style?: TextStyle) {
    this.setStyle(style)
    this.text.font = F.fontSpec(this.fontSize, this.fontName)
    this.text.color = this.textColor
    this.buf = Array.from(text)
    this.point = this.buf.length
    this.repaint(text)
  }
  get innerText() { return this.text.text }
  /**
   * splice into the buffer (combination delete & insert)
   * 
   * this.buf.splice(pt, n, text); this.repaint()
   * @param pt start deletion (current point)
   * @param n chars to delete (all the rest)
   * @param text string to insert ('')
   */
  splice(pt = this.point, n = this.buf.length, text = '') {
    this.buf.splice(pt, n, ...Array.from(text))
    this.repaint
  }

  repaint(text = this.buf.join('')) {
    // first: assume no line-wrap
    this.text.text = text    // TODO: show cursor moved...
    let lines = text.split('\n'), bol = 0, pt = this.point
    // scan to find line containing cursor (pt)
    lines.forEach((line, n) => {
      // if cursor on this line, show it in the correct place: assume textAlign='left'
      if (pt >= bol && pt <= bol + line.length) {
        let pre = line.slice(0, pt-bol)
        this.cmark.x = textWidth(pre, this.fontSize, this.fontName) + this.text.x;
        this.cmark.y = n * this.fontSize // or measuredLineHeight()?
      }
      bol += (line.length + 1)
    })
    this.stage?.update()
  }
  /**
   * 
   * @param argVal 'min' 'max' 'bol' 'eol' or number (offset into this.buf == this.text.text)
   * @param eStr (ignored)
   */
  movePoint(argVal: any, eStr?: string) {
    if (argVal == 'min') this.point = 0
    else if (argVal == 'max') this.point = this.buf.length
    else if (argVal == '+') this.point = Math.min(this.buf.length, this.point + 1)
    else if (argVal == '-') this.point = Math.max(0, this.point - 1)
    else if (typeof argVal == 'number') this.point = Math.max(0, Math.min(this.buf.length, argVal))
    this.repaint()
  }
  /**
   * Insert (argVal ?? keyStr) into text at point++ (insert-before-point)
   * @param argVal char-string to insert, else use eStr
   * @param keyStr the keyCodeToString, probably from regexp
   */
  selfInsert(argVal?: string, keyStr?: string) {
    this.buf.splice(this.point++, 0, argVal ?? keyStr as string)
    this.repaint()
  }
  /** selfInsert newline */
  newline(argVal: any, eStr: string) {
    this.selfInsert('\n')
  }
  /** delete char before cursor */
  delBack(argVal: any, eStr: string) {
    if (this.point < 1) return
    this.buf.splice(--this.point, 1)
    this.repaint()
  }
  delForw(argVal: any, eStr: string) {
    if (this.point >= this.buf.length) return
    this.buf.splice(this.point, 1)
    this.repaint()
  }
  kill(argVal: any, eStr: string) {
    EditBox.killBuf = this.buf.splice(this.point, this.buf.length - this.point)
    this.repaint()
  }
  yank(argVal: any, eStr: string) {
    this.buf.splice(this.point, 0, ...EditBox.killBuf)
    this.point += EditBox.killBuf.length
    this.repaint()
  }

  /**
   * insert text from window system clipboard: await navigator.clipboard.readText();
   * @param pt where to inject text [this.point]
   * @param n number of following chars to delete [0], if n<0 delete ALL following chars
   */
  pasteClipboard(pt = this.point, n = 0) {
    const paste = async () => {
      let text = await navigator.clipboard.readText();
      this.splice(pt, n < 0 ? undefined : n, text);
    }
    paste();
  }
  //_keyMap: Keymap
  keyScope: KeyScope = {};
  
  setFocus(f = true) {
    KeyBinder.keyBinder.setFocus(f ? this.keyScope : undefined)
    if (this.stage && !this.stage['EB.unFocus']) {
      let unFocus = this.stage.on(S.click, (ev: MouseEvent) => { this.setFocus(false)}, this, false, null, true)
      unFocus[S.Aname] = `EditBox.unFocus`
      this.stage['EB.unFocus'] = unFocus
    }
  }
  setBind(w: number, h: number, init?: string, focus?: Binding, blur?: Binding) {

  }
}