import { XYWH } from "@thegraid/common-lib";
import { textWidth } from "./createjs-functions.js";
import { EditBox, type TextStyle } from "./edit-box.js";
import { KeyBinder, } from "./key-binder.js";

/** a multi-line EditBox. with keybindings to move up/down lines */
export class EditLines extends EditBox {
  nlines: number;    // number of lines displayed in rect
  d0: number = 0;    // n-th line of buf; shown at top of box
  bol0: number = 0;  // beginning of line holding point (set by this.bol())
  dlines: string[];  // N lines of text displayed in box; N = floor(box.height / fontSize)
  linen: number = 0; // current line of display holding point 
  col: number = 0;   // buf[point-col - 1] = '\n'
  col0: number = 0;  // target col for [repeated] upLine/downLine TBD: prev-cmd

  constructor(rect: XYWH = { x: 0, y: 0, w: 100, h: 40 }, style: TextStyle) {
    super (rect, style)
    this.nlines = Math.floor(Math.ceil(this.rect.h) / this.fontSize)
  }
  
  /** return number of newlines between p0 and p1; negative if p0 > p1. 
   * also return location of each newline */
  countLines(p0: number, p1: number): [number, number[]] {
    let bols: number[] = [], buf = this.buf, neg = p0 > p1
    while (p0 < p1) { if (buf[p0] == '\n') bols.push(p0); p0++ }
    while (p1 < p0) { if (buf[p1] == '\n') bols.push(p1); p1++ }
    let nl = neg ? -bols.length : bols.length
    return [nl, bols]
  }
  fillDisplay(bol0: number) {
    this.d0 = bol0
    let dtext = this.buf.slice(bol0).join('') // all text from d0...EOB
    let dlines = this.dlines = dtext.split('\n', this.nlines)  // dlines: [0 .. nlines-1]
    this.text.text = dlines.join('\n')
    this.moveCursor(dlines)
    }
  moveCursor(dlines = this.dlines) {
    let bols = [], bol = this.d0, pt = this.point // bol is offset from d0 (dtext)
    // find line containing point, ensure it is in display:
    // compute this.col, this.linen; ASSERT cursor is withing dlines.
    for (let n = 0; n < dlines.length; n++) {
      bols[n] = bol
      let dline = dlines[n], eoln = bol + dline.length
      if (pt >= bol && pt <= eoln) {
        this.linen = n
        this.col = pt - bol
        this.cmark.x = textWidth(dline.slice(0, this.col), this.fontSize, this.fontName)
        this.cmark.y = n * this.fontSize
        break
      }
      bol = eoln + 1
    }
  }
  // a 'window' on the text buffer:
  // text = this.buf.join(''); the text to display; usually: obtain from this.buf.join('')
  /**
   * repaint multi-line display, moving text to show cursor.
   * @param text the whole buffer text (EditLines extracts from d0; join/split)
   */
  override repaint(text?: string) {
    //this.buf = Array.from(text)
    let [nl, bols] = this.countLines(this.d0, this.point), lines = this.dlines
    if (nl >= 0 && nl < this.nlines) {
      this.fillDisplay(this.d0)       // if buffer is 'dirty'
      //this.moveCursor(this.dlines)    // if buffer not modified
    } else if (nl < 0) {  // TODO: if (nl > -nlines) recycle some this.lines[...] ??
      this.fillDisplay(this.bol(0))
    } else { // (nl >= nlines)
      // d0 = bols[nl - nlines]
      // display nlines(bol_0, all new lines)
      this.fillDisplay(bols[nl - this.nlines]+1)
    }
    // display text, rotating up/down by one line if necessary
    this.stage?.update()
  }

  override initKeys() {
    super.initKeys()
    let kb = KeyBinder.keyBinder, scope = this.keyScope
    kb.setKey("Enter", { thisArg: this, func: this.newline }, scope)
    kb.setKey("C-a", { thisArg: this, func: this.movePoint, argVal: 'bol' }, scope)
    kb.setKey("C-e", { thisArg: this, func: this.movePoint, argVal: 'eol' }, scope)
    kb.setKey("ArrowRight", { thisArg: this, func: this.movePoint, argVal: '+' }, scope)
    kb.setKey("ArrowLeft", { thisArg: this, func: this.movePoint, argVal: '-' }, scope)
    kb.setKey("ArrowUp", { thisArg: this, func: this.upLine, argVal: 1 }, scope)
    kb.setKey("ArrowDown", { thisArg: this, func: this.downLine, argVal: 1 }, scope)
    kb.setKey("C-k", { thisArg: this, func: this.killLine }, scope)
    kb.setKey("C-n", { thisArg: this, func: this.downLine }, scope)
    kb.setKey("C-p", { thisArg: this, func: this.upLine }, scope)
    kb.setKey("C-o", { thisArg: this, func: this.openLine }, scope)
  }
  /** set this.m0 = bol(0) and return nth bol */
  bol(n = 0) {
    let bol = this.point, min = 0; this.bol0 = -1
    do {
      for (; bol > min && this.buf[bol-1] != '\n'; bol -= 1) { }
    } while ((this.bol0 < 0 && (this.bol0 = bol, true)) && --n >= 0 && bol > min && (bol -= 1, true))
    return bol
  }
  eol(n = 0) {
    let eol = this.point, lim = this.buf.length
    do {
      for (; eol < lim && this.buf[eol] != '\n'; eol += 1) { }
    } while (--n >= 0 && (eol < lim && (eol += 1, true)))
    return eol
  }

  /** argVal: bol, min, max, pt */
  override movePoint(argVal: any, eStr: string): void {
    if (argVal == 'bol') this.point = this.bol()
    else if (argVal == 'eol') this.point = this.eol()
    super.movePoint(argVal, eStr)
  }

  /** killLine */
  killLine(argVal: any, eStr: string) {
    let eol = this.eol()
    EditBox.killBuf = this.buf.splice(this.point, Math.max(1, eol - this.point))
    this.repaint()
  }
  /** insert newline after point */
  openLine() {
    let pt = this.point
    this.selfInsert('', '\n')
    this.movePoint(pt, '')
  }
  upLine() {
    this.linen--
    let col = ([this.upLine, this.downLine].includes(this.keyScope.lastFunc)) ? this.col0 : this.col
    this.col0 = col
    let bol0 = this.bol(0)
    let bol1 = this.bol(1)   //
    if (bol0 == 0) return    // nothing to do
    let eol_1 = bol0 - 1     // this.eol(-1)
    let pt = Math.min(bol1 + col, eol_1) 
    this.movePoint(pt, '')
  }
  downLine() {
    this.linen++
    let col = ([this.upLine, this.downLine].includes(this.keyScope.lastFunc)) ? this.col0 : this.col
    this.col0 = col
    let eol1 = this.eol(1)
    let bol_1 = this.eol(0) + 1 // this.bol(-1)
    let pt = Math.min(eol1, bol_1 + col)
    this.movePoint(pt, '')
  }
}