import { XYWH } from "@thegraid/common-lib";
import { textWidth } from "./createjs-functions.js";
import { EditBox } from "./edit-box.js";
import { KeyBinder, } from "./key-binder.js";
import type { TextInRectOptions, TextStyle } from "./paintable.js";

/** a multi-line EditBox. with keybindings to move up/down lines */
export class EditLines extends EditBox {
  /** number of lines displayed in box */
  nlines: number;
  /** n-th newline of buf; first line to display, shown at top of box */
  d0: number = 0;
  /** beginning of line holding point (set by this.bol()) */
  bol0: number = 0;
  /** N lines of text displayed in box; N = floor(box.height / fontSize) */
  dlines: string[];
  /** current line of display holding point */
  linen: number = 0;
  /** postion of cmark: buf[point - col - 1] = '\n' */
  col: number = 0;
  /** target col for [repeated] upLine/downLine TBD: prev-cmd */
  col0: number = 0;

  /**
   * 
   * @param text ['']
   * @param style []
   * @param rect [{x:0, y:0, w:80, h:40}] bounds of viewing rectangle
   */
  constructor(text = '', style?: TextStyle & TextInRectOptions, rect?: XYWH) {
    super (text, style)
    const { x, y, w, h } = rect ?? { x: 0, y: 0, w: 80, h: 40 }
    this.setBounds(x, y, w, h);
    this.nlines = Math.floor(Math.ceil(h) / this.fontSize)
  }
  
  /** return count of newlines between p0 and p1; negative if p0 > p1.
   * 
   * return index[] of each newline 
   * @returns [count, bol[]] tuple
   */
  countLines(p0: number, p1: number): [number, number[]] {
    let bols: number[] = [], buf = this.buf, neg = p0 > p1
    while (p0 < p1) { if (buf[p0] == '\n') bols.push(p0); p0++ }
    while (p1 < p0) { if (buf[p1] == '\n') bols.push(p1); p1++ }
    let nl = neg ? -bols.length : bols.length
    return [nl, bols]
  }
  /** display text from buf[bol0 ... eob) */
  fillDisplay(bol0: number) {
    this.d0 = bol0
    let dtext = this.buf.slice(bol0).join('') // all text from d0...EOB
    let dlines = this.dlines = dtext.split('\n', this.nlines)  // dlines: [0 .. nlines-1]
    this.disp.text = dlines.join('\n')
    this.moveCursor(dlines)
  }
  /**
   * Find line containing point, 'scroll' so that cursor is within dlines.
   * 
   * compute this.col, this.linen; 
   * 
   * @param dlines 
   */
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
   * repaint multi-line display, scroll text to show cursor.
   * 
   * invokes fillDisplay(...)
   * @param text [ignored] the whole buffer text (EditLines extracts from d0; join/split)
   */
  override repaint() {
    let [nl, bols] = this.countLines(this.d0, this.point), lines = this.dlines
    if (nl >= 0 && nl < this.nlines) {
      this.fillDisplay(this.d0)       // if buffer is 'dirty'
    } else if (nl < 0) {  // TODO: if (nl > -nlines) keep some this.lines[...] ??
      this.fillDisplay(this.bol(0))
    } else { // (nl >= nlines)
      this.fillDisplay(bols[nl - this.nlines]+1)
    }
    // display text, rotating up/down by one line if necessary
    this.stage?.update()
    return this;
  }

  override initKeys() {
    super.initKeys()
    let kb = KeyBinder.keyBinder, scope = this.keyScope
    kb.setKey("Enter", { thisArg: this, func: this.newline }, scope)
    kb.setKey("C-a", () => this.movePoint('bol'), scope)
    kb.setKey("C-e", () => this.movePoint('eol'), scope)
    kb.setKey("C-o", () => this.openLine(), scope)
    kb.setKey("C-k", () => this.killLine(), scope)
    // upLine & downLine rely on KeyBinder to track consecutive keyStrokes!
    // TODO: C-u to set repeatCount, and upLine/downLine checs that.
    // requires a mini-mode to collect digits/sign
    kb.setKey("ArrowUp", { thisArg: this, func: this.upLine }, scope)
    kb.setKey("ArrowDown", { thisArg: this, func: this.downLine }, scope)
    kb.setKey("C-n", { thisArg: this, func: this.downLine }, scope)
    kb.setKey("C-p", { thisArg: this, func: this.upLine }, scope)
  }
  /** set this.bol0 = bol(0) and return index of nth bol */
  bol(n = 0) {
    let bol = this.point, min = 0; this.bol0 = -1
    do {
      for (; bol > min && this.buf[bol-1] != '\n'; bol -= 1) { } // move bol to prev newline
    } 
    // repeat up to 'n' times: (could maybe simplify if we trusted this.d0 ?)
    while ((this.bol0 < 0 && (this.bol0 = bol, true)) && --n >= 0 && bol > min && (bol -= 1, true))
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
  override movePoint(argVal: any, eStr?: string) {
    if (argVal == 'bol') this.point = this.bol()
    else if (argVal == 'eol') this.point = this.eol()
    return super.movePoint(argVal, eStr)
  }

  /** insert newline after point */
  openLine() {
    let pt = this.point
    this.selfInsert('', '\n')
    this.movePoint(pt, '')
    return this;
  }

  /** Binding.func: kill to eol, saving to killBuf 
   * @param argVal kill to nth eol
   */
  killLine(n = 1) {
    const eol = this.eol(n)
    const rpt = (this.keyScope.lastFunc === this.killLine);
    this.kill(this.point, Math.max(1, eol - this.point), rpt)
  }

  /**
   * edit method to kill multiple lines, saving into killBuf (for yank)
   * @param n [1] kill to eol(n)
   * @param rpt [false] if true concat to killBuf
   * @returns this
   */
  killLines(n = 1, rpt = false) {
    const eol = this.eol(n)
    this.kill(this.point, Math.max(1, eol - this.point), rpt)
    return this;
  }

  /** return col0 if lastFunc was upLine or downLine, else normal current this.col */
  get keyCol() {
    return ([this.upLine, this.downLine].includes(this.keyScope.lastFunc)) ? this.col0 : this.col
  }
  /** a Binding.func that uses/sets col0 for repeated calls */
  upLine() {
    this.linen--
    let col = this.keyCol;   // may reuse this.col0
    this.col0 = col          // assert new/same this.col0
    let bol0 = this.bol(0)
    let bol1 = this.bol(1)   //
    if (bol0 == 0) return    // nothing to do
    let eol_1 = bol0 - 1     // this.eol(-1)
    let pt = Math.min(bol1 + col, eol_1) 
    this.movePoint(pt, '')
  }
  /** Binding.func that uses/sets col0 for repeated calls  */
  downLine() {
    this.linen++
    let col = this.keyCol
    this.col0 = col
    let eol1 = this.eol(1)
    let bol_1 = this.eol(0) + 1 // this.bol(-1)
    let pt = Math.min(eol1, bol_1 + col)
    this.movePoint(pt, '')
  }
  /** edit method to move up in same columns */
  upLines(n = 1) {
    const col0 = this.keyCol    // generally: this.col
    for (let k = 0; k < n; k++) {
      this.col = col0;
      this.upLine()
    }
    return this;
  }
  /** edit method to move down in same column */
  downLines(n = 1) {
    const col0 = this.keyCol    // generally: this.col
    for (let k = 0; k < n; k++) {
      this.col = col0;
      this.downLine()
    }
    return this;
  }
}