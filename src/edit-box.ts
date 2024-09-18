import { C, F, S, XYWH } from "@thegraid/common-lib";
import { Graphics, MouseEvent, Text } from "@thegraid/easeljs-module";
import { stopPropagation, textWidth } from "./createjs-functions.js";
import { Binding, KeyBinder, KeyScope } from "./key-binder.js";
import { PaintableShape, TextInRect, type TextInRectOptions, type TextStyle } from "./paintable.js";

/** a Container with a [rectangle] Shape and a Text.
 * keystrokes to the Shape are inserted into the Text.
 * 
 * EditBox:
 * localSetKey(BS,DEL,C-A, C-K, C-W, C-Y, C-B, C-F) to edit functions...?
 */
export class EditBox extends TextInRect implements TextStyle {
  // TODO: find platform 'clipboard' so can cut/paste outside createjs
  static killBuf: string[] = [] // from C-k, suitable for C-y
  // disp: Text = new Text();
  buf: string[] = []
  point: number = 0 // buf[0..point] are before the cursor; buf[point+1..max] are after cursor

  // cmarks is a PaintableShape, so cmark.paint('blue') works.
  cmark = new PaintableShape((color, g = new Graphics()) => g.c().s(color).mt(0, 1).lt(0, this.fontSize - 1));

  // TODO: need option to expand rect/shape OR scroll OR wrap the text within box.
  /**
   * A box that can display & edit Text
   * @param text initial Text or string in EditBox.
   * @param style
   *  * bgColor: fillColor for box
   *  * fontSize: for text in box
   *  * fontName: for text in box
   *  * textColor: for text in box
   */
  constructor(text = '', style: TextStyle & TextInRectOptions = {}) {
    const { fontSize, fontName, textColor } = style
    const disp = new Text(text, F.fontSpec(fontSize, fontName), textColor);
    super(disp, { border: 0, corner: 0, ...style })
    this.Aname = 'EditBox';
    this.setText0(this.disp.text, style)
    this.paintCursor();
    this.initKeys()
    this.clickToFocus()
  }

  // Note: there is also createjs.DisplayObject.cursor:
  // A CSS cursor (ex. "pointer", "help", "text", etc) that will be displayed when the user hovers over this display object.
  /**
   * set color (and Graphics) for cursor; the mark at 'point' between chars.
   * 
   * default is a simple vertical line.
   * @param color [BLACK] color to paint
   * @param dy [1] inset from top & bottom of edit rectangle
   * @param cgf [s(color).mt(0,dy).lt(0,fs-dy)] paint function for cursor.
   */
  paintCursor(color = C.BLACK, dy = 1, cgf = (c: string, g = new Graphics()) => g.c().s(c).mt(0, dy).lt(0, this.fontSize - dy)) {
    this.cmark.cgf = cgf;
    this.cmark.paint(color)
    this.cmark.setBounds(-1, 0, 1, this.fontSize + 1) // extra pixel border
    // this.cmark.cache(-1, 0, 1, this.fontSize + 1)
    this.addChild(this.cmark)
    this.cmark[S.Aname] = 'cursor'
  }
  // initially no keymap, lastFunc; onFocus informs if we gain/lose focus:
  keyScope: KeyScope = { onFocus: (f: boolean) => this.onFocus(f) };

  initKeys() {
    const selfKey: RegExp = /^(\S)$/, kb = KeyBinder.keyBinder, scope = this.keyScope
    kb.setKey(selfKey, (arg, estr) => this.selfInsert(estr, estr), scope) // no argVal -> use estr
    kb.setKey("Space", (arg, estr) => this.selfInsert(' '), scope)
    kb.setKey("Backspace", () => this.delBack(), scope)
    kb.setKey("ArrowRight", () => this.movePoint('+'), scope)
    kb.setKey("ArrowLeft", () => this.movePoint('-'), scope)
    kb.setKey("C-f", () => this.movePoint('+'), scope)
    kb.setKey("C-b", () => this.movePoint('-'), scope)
    kb.setKey("M-<", () => this.movePoint('min'), scope)
    kb.setKey("M->", () => this.movePoint('max'), scope)
    kb.setKey("C-a", () => this.movePoint('min'), scope)
    kb.setKey("C-e", () => this.movePoint('max'), scope)
    kb.setKey("C-d", () => this.delForw(), scope)
    kb.setKey("C-k", () => this.kill(), scope)
    kb.setKey("C-y", () => this.yank(), scope)
    kb.setKey("C-l", () => this.repaint(), scope)
    kb.setKey('M-v', () => this.pasteClipboard(), scope)

  }

  /** S.click -> this.setFocus(true) & stopPropagation(event)
   * 
   * if you want additional click effects, will need to override/extend
   */
  clickToFocus() {
    this.on(S.click, (ev: MouseEvent) => { 
      this.setFocus(true);   // will invoke this.keyScope.onFocus(true)
      stopPropagation(ev);
    })
  }

  /** 
   * take or release the keyboard focus.
   * 
   * Note: puts a capture-phase click listener on stage will setFocus(false)
   * 
   * @param f [true] focus(this); false -> focus(global keyBinder)
   */
  setFocus(f = true) {
    // keyBinder.setFocus invokes keyScope.onFocus(f) -> this.onFocus(f)
    KeyBinder.keyBinder.setFocus(f ? this.keyScope : KeyBinder.keyBinder);
    // if not a stage listener, add it:
    const EB_unfocus = 'EditBox.unfocus'
    if (this.stage && !this.stage[EB_unfocus]) {
      // click any other DisplayObject on stage to unfocus this editbox.
      // record and save the on-listener function:
      const thus = this;
      const unFocus = this.stage.on(S.click, (ev: MouseEvent) => this.setFocus(false), thus, false, null, true)
      unFocus[S.Aname] = EB_unfocus;
      this.stage[EB_unfocus] = unFocus;
    }
  }

  /**
   * invoked when KeyBinder gives/takes focus from this EditBox
   * 
   * default is to view/hide cmark.
   * 
   * subclass could: @example
   * this.cmark.paint(f ? alpha1 : alpha0)
   */
  onFocus(f: boolean) {
    this.cmark.visible = f; // alternatly: this.cmark.paint(f? alpha1: alpha0)
    this.stage?.update();
  }

  /** initialize buffer contents with given text string and style. */
  setText0(text = '', style?: TextStyle) {
    const { fontSize, fontName, textColor } = {
      fontSize: F.defaultSize,
      fontName: F.defaultFont,
      textColor: C.BLACK,
      ...style 
    };
    // disp.textBaseline: Default is 'top' [vs 'alphabetic'.. the 'line' baseline]
    this.disp.font = F.fontSpec(fontSize, fontName)
    this.disp.color = textColor
    this.buf = Array.from(text)
    this.point = this.buf.length
  }

  /** edit method: replace buffer contents with given text string and style; repaint() */
  setText(text = '', style?: TextStyle) {
    this.setText0(text, style)
    return this.repaint();
  }
  /** disp.text OR buf.join('') */
  get innerText() { return this.disp.text }
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
    return this.repaint()
  }
  /** after content change: set cursor position and stage.update() */
  repaint(text = this.buf.join('')) {
    // first: assume no line-wrap (see also: EditLines)
    this.disp.text = text;      // set content to display
    let lines = text.split('\n'), bol = 0, pt = this.point
    // scan to find line containing cursor (pt)
    lines.forEach((line, n) => { 
      // if cursor on this line, show it in the correct place: assume textAlign='left'
      if (pt >= bol && pt <= bol + line.length) {
        let pre = line.slice(0, pt-bol)
        this.cmark.x = textWidth(pre, this.fontSize, this.fontName) + this.disp.x;
        this.cmark.y = n * this.fontSize // or measuredLineHeight()?
      }
      bol += (line.length + 1)
    })
    this.stage?.update()
    return this;
  }
  /**
   * KeyBinder function to move point
   * @param argVal 'min' 'max' '+' '-' or number (offset into this.buf == this.text.text)
   * @param eStr (ignored)
   */
  movePoint(argVal: any, eStr?: string) {
    const len = this.buf.length
    if (argVal == 'min') this.point = 0;
    else if (argVal == 'max') this.point = len;
    else if (argVal == '+') this.point = Math.min(len, this.point + 1);
    else if (argVal == '-') this.point = Math.max(0, this.point - 1);
    else if (typeof argVal == 'number') this.point = Math.max(0, Math.min(len, argVal));
    return this.repaint()
  }
  /**
   * Insert (argVal ?? keyStr) into text at point++ (insert-before-point)
   * @param argVal char-string to insert, else use eStr
   * @param keyStr the keyCodeToString, probably from regexp
   */
  selfInsert(argVal?: string, keyStr?: string) {
    this.buf.splice(this.point++, 0, argVal ?? keyStr as string)
    return this.repaint()
  }
  /** selfInsert newline */
  newline(argVal?: any, eStr?: string) {
    this.selfInsert('\n')
  }
  /** delete char before cursor */
  delBack(argVal?: any, eStr?: string) {
    if (this.point < 1) return this;
    this.buf.splice(--this.point, 1)
    return this.repaint()
  }
  delForw(argVal?: any, eStr?: string) {
    if (this.point >= this.buf.length) return this;
    this.buf.splice(this.point, 1)
    return this.repaint()
  }
  // Note: EditLines uses repeated kill(true) to accumulate into killBuf!
  /** edit method to kill to eob, saving in killBuf */
  kill(pt = this.point, n = this.buf.length - pt, rpt = false) {
    const kill = this.buf.splice(pt, n), killBuf = EditBox.killBuf;
    if (!rpt) killBuf.length = 0
    killBuf.splice(killBuf.length, 0, ...kill)
    return this.repaint()
  }
  /** Binding func to insert killBuf into buf at point */
  yank(argVal?: any, eStr?: string) {
    const killBuf = EditBox.killBuf;
    this.buf.splice(this.point, 0, ...killBuf)
    this.point += killBuf.length
    return this.repaint()
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

  setBind(w: number, h: number, init?: string, focus?: Binding, blur?: Binding) {

  }
}