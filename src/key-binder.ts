import { EventDispatcher } from '@thegraid/easeljs-module';
import { S, stime } from './index.js'

// An injected singleton
/**
 * Must insert code into app.components.ts 
 * which will instantiate a KeyBinder, and use @HostListener to forward keyboard events.
 * 
  constructor(private keyBinder: KeyBinder) { }

  // app.component has access to the 'Host', so we use @HostListener here
  // Listen to all Host events and forward them to our internal EventDispatcher
  @HostListener('document:keyup', ['$event'])
  @HostListener('document:keydown', ['$event'])
  @HostListener('mouseenter', ['$event'])
  @HostListener('mouseleave', ['$event'])
  @HostListener('focus', ['$event'])
  @HostListener('blur', ['$event'])
  dispatchAnEvent(event) {
    //console.log(stime(this), "dispatch: "+event.type);
    this.keyBinder.dispatchEvent(event);
  }
 *
 * and in app.modules.ts: 

 providers: [
    KeyBinder,
  ],

 *
 */
type Cast<X, Y> = X extends Y ? X : Y
type KeyBits = { shift?: boolean, ctrl?: boolean, meta?: boolean, alt?: boolean, keyup?: boolean }
/** unless BindFunc returns true, then e.preventDefault() */
export type BindFunc = (arg?: any, e?: KeyboardEvent | string) => boolean | void
export type KeyScope = { keymap?: Keymap, lastFunc?: BindFunc }
/** 
 * kcode is bound to Binding, invokes: func.call(scope, argVal, event) 
 */
export type Binding = { thisArg?: object, func: BindFunc, argVal?: any, _kcode?: number }
export type Keymap = { [key: number]: Binding, scope?: KeyScope, regexs?: { regex: RegExp, bind: Binding }[] }

const SHIFT: number = 512;
const CTRL: number = 1024;
const META: number = 2048;
const ALT: number = 4096;
const KEYUP: number = 8192;
/** chars that when typed on usual keyboard will also have the SHIFT key 
 * See also: UPPER.test(char)
 */
const upshiftedKeys = ['~', '!', '@','#','$','%','^','&','*','(',')','_','+','{','}', '|',':', '"','\'','<','>','?']
const unshiftedKeys = ['`', '1', '2','3','4','5','6','7','8','9','0','-','=','[',']','\\',';','\'','\'',',','.','/']
/** code internally as Meta-Shift-unshiftedKey(upshiftedKey)  */
const shiftedKeys = new Map()
upshiftedKeys.forEach((char, n) => shiftedKeys.set(char, unshiftedKeys[n]))
//Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").forEach(char => shiftedKeys.set(char, char.toLowerCase()))

/** EventDispatcher with keybinding (key => thisArg.func(argVal, e)) */
export class KeyBinder extends EventDispatcher implements KeyScope {
  static keyBinder: KeyBinder;
  static instanceId = 0
  private instanceId = 0;
  constructor() {
    super()
    this.instanceId = KeyBinder.instanceId++
    this.keymap = Array<Binding>()
    this.keymap.scope = this
    this.keymap.regexs = []
    console.log(stime(this, ".constructor Id = "), this.instanceId );
    if (!!KeyBinder.keyBinder) alert(`Making Alternate KeyBinder!! ${this.instanceId}`)
    this.initListeners();
    KeyBinder.keyBinder = this
  }

  /** global map from e.keyCode to Binding {thisArg, func: BindFunc, argval}  */
  keymap: Keymap;
  /** last BindFunc invoked from this keymap. */
  lastFunc: BindFunc
  /** GLOBAL FOCUS: a keymap bound to a KeyScope object */
  private focus: KeyScope = this; // target for localSetKey bindings (adds 'keymap' field)

  /**
   * Convert shift indicators to binary-mapped number.
   * Extend numeric keycode with SHIFT, CTRL, META, ALT, KEYUP bits
   * @param kcode unicode(char) 
   * @param bits KeyBits
   * @returns kcode with higher order bits possibly set
   */
  getKeyCode(kcode: number, bits: KeyBits = {}): number {
    return kcode
      | (bits.shift ? SHIFT : 0)
      | (bits.ctrl ? CTRL : 0)
      | (bits.meta ? META : 0)
      | (bits.alt ? ALT : 0)
      | (bits.keyup ? KEYUP : 0);
  }
  /** return "^-C-M-A-S-keyname" for given keycode */
  keyCodeToString(keycode: number): string {
    let xbit = (kcode: number, bit: number) => { let b = kcode & bit; keycode -= b; return b != 0 }
    let bits = [ALT, META, CTRL, KEYUP, SHIFT].map( bit => xbit(keycode, bit))
    let ccode = String.fromCharCode(keycode)
    let mods = ['A-', 'M-', 'C-', '^-']
    let str = KeyBinder.codeKey(keycode)
    if (str) { mods.push('S-') } else { str = (bits[4] ? ccode : ccode.toLowerCase()) }
    //this.details && console.log( `keycode(${keycode}) => string(${str})`)
    mods.forEach((mod, n) => { if (bits[n]) { str = `${mod}${str}` } })
    return str
  }

  /**
   * setting modifier values for key binding: keyup-ctrl-meta-alt-shift char 
   * x or X for shift.
   * @param str "^-C-M-A-X" or "^-C-M-A-x" OR e.key/e.code(keyname)
   * @return keyCode of "X" with indicated shift-bits added in.
   */
  getKeyCodeFromChar(str: string): number {
    const UPPER = /[A-Z]/; const LOWER = /[a-z]/
    let bits: KeyBits = {}
    bits.keyup = !!str.match("^-")
    bits.ctrl = !!str.match("C-")
    bits.meta = !!str.match("M-")
    bits.alt = !!str.match("A-")
    bits.shift = !!str.match("S-");
    let char = /^([CMAS^]-)*/[Symbol.replace](str, '')
    if (char.length == 1) {
      // Assert: a single [ASCII/utf8] char in the string
      if (bits.meta && shiftedKeys.has(char)) {
        bits.shift = true
        char = shiftedKeys.get(char)
      } else if (UPPER.test(char)) {
        bits.shift = true;
      } else if (LOWER.test(char)) {
        char = char.toUpperCase();
      }
    }
    return this.getKeyCode(KeyBinder.keyCode(char), bits); // numeric unicode for char (OR key)
  }
  /** event.key name -> numeric kcode. */
  static keyCode(key: string): number | undefined {
    return (key.length == 1) ? key.charCodeAt(0) : KeyBinder.key_keyCode[key]
  }
  /** event.code name -> numeric kcode. */
  static codeCode(code: string): number | undefined {
    let key = code.startsWith('Key') ? code.substring(3).toLowerCase() : code
    return KeyBinder.keyCode(key) // key can be 'Alt'
  }
  static codeKey(kcode: number) {
    let keyCode = Object.entries(KeyBinder.key_keyCode).find(([key, code]) => code == kcode)
    return !!keyCode ? keyCode[0] : undefined
  }
  // if you want to replace deprecated e.keycode:
  static key_keyCode = {
    Bel: 7, Backspace: 8, Tab: 9, Enter: 13, Control: 17, Shift: 16, Alt: 18,
    AltLeft: 18, AltRight: 19, Escape: 27, Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39,
    ArrowDown: 40, MetaLeft: 91, MetaRight: 93 } // '[' : 219

  static keyEvent(key: string, code: string, keyCode:number, shiftKey: boolean, ctrlKey: boolean, metaKey: boolean, altKey: boolean, keyup: boolean): KeyboardEvent {
    let rv = {key, code, keyCode, shiftKey, ctrlKey, metaKey, altKey, type: (keyup? 'keyup':'keydown')}
    return rv as unknown as KeyboardEvent
  }

  /** get our numeric encoding of the key in the KeyboardEvent. */
  getKeyCodeFromEvent(e: KeyboardEvent): number {
    // Shift-down = 528 = 16 + 512 (because e.shiftKey is set on keydown)
    // Shift-up = 8208 = 16 + 8192 (because e.keyup)
    // Use key name; but use numeric code for non-char keys: "Shift", "Enter" or whatever
    let key = e.altKey ? e.code : e.key  // dodge Alt+key which make special/unicode 
    let kcode = (key.length == 1) ? this.getKeyCodeFromChar(key) : e.keyCode
    let keycode = this.getKeyCode(
      kcode, {
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      alt: e.altKey,
      keyup: (e.type == "keyup")
    });
    return keycode
  }

  _bindKey(keymap: Keymap, kcode: number, bind: Binding): number {
    //console.log(stime(this, "_bindKey: "), { kcode: kcode, func: bind, scope: keymap["scope"] });
    if (typeof (bind.func) == 'function') {
      keymap[kcode] = bind
      let {thisArg, func, argVal} = bind ; keymap[kcode] = { _kcode: kcode, thisArg, func, argVal }
    } else if (!!bind.func) {
      let msg = "KeyBinder.globalSetKey: unrecognized key-binding"
      this.details && console.log(stime(this, "_bindKey:"), msg, { bind })
      alert(msg)
    } else {
      delete keymap[kcode];
    }
    return kcode
  }
  /** bindRegexp is constrained to match only on 'plain' (non-chord) alpha keys */
  _bindRegex(keymap: Keymap, regex: RegExp, bind: Binding): RegExp {
    if (!keymap.regexs) keymap.regexs = []
    keymap.regexs.unshift({ regex, bind })
    return regex
  }

  // arg:function crashes tsc [3/2017]
  // func:function(e, p, k)
  globalSetKey(kcode: number, bind: Binding) {
    return this._bindKey(this.keymap, kcode, bind)
  }

  /**
   * Bind key to event handling function.
   * @param str a string describing a single keychord.
   * @param bind a Binding {thisArg: keymap, func: ()=>void, argVal?: arg}
   */
  globalSetKeyFromChar(str: string, bind: Binding) {
    return this.globalSetKey(this.getKeyCodeFromChar(str), bind);
  }
  setKey(key: RegExp, bind: Binding, scope?: object): RegExp
  setKey(key: number | string, bind: Binding, scope?: object): number
  setKey(key: number | string | RegExp, bind: Binding, scope?: object): number | RegExp {
    if (key instanceof RegExp) return this.localBindToRegex(scope, key, bind)
    if (typeof key === 'string') key = this.getKeyCodeFromChar(key)
    return this._bindKey(this.getKeymap(scope), key, bind);
  }

  localSetKeyFromChar(scope: KeyScope, str: string, bind: Binding) {
    return this._bindKey(this.getKeymap(scope), this.getKeyCodeFromChar(str), bind);
  }
  localBindToRegex(scope: KeyScope, regex: RegExp, bind: Binding) {
    let keymap = this.getKeymap(scope)
    let rv = this._bindRegex(keymap, regex, bind)
    this.details && console.log(`localBindToRegex`, keymap, keymap.regexs, keymap.regexs[0])
    return rv
  }

  getKeymap(scope: KeyScope): Keymap {
    if (!scope) return this.keymap
    let keymap = scope.keymap
    if (!keymap) scope.keymap = keymap = Array<Binding>()
    return keymap as Keymap
  }

  // NOTE: bindings will be to kcode chord with a letter, not just shift keys.
  // However, it could happen that C-X is seen before C-M-X, so both would be triggered.
  // Q: Do we need to wait nnn-msecs, so see if another event comes to replace the current one?
  // nnn < ~50 ?
  // Promise to resolve to (func.call(this, e, kcode0))
  // but when new chord comes, attempt to cancel the Promise, and replace
  /** dispatch keyup and keydown events [keypress dispatches to keydown, the default] 
   * KeyboardEvent is HTML Event, so current/target path is: window, document, html, body
   * Useless for 'local' bindings; we need a 'focus' on DisplayObject, and target to that.
   * Text/EditBox can listen for 'click' and set focus. (currentTarget)
   * Text/EditBox can listen for 'Enter' and release focus (blur) [also: onCollapse of menu]
   */
  dispatchKey(e: KeyboardEvent) {
    return this.dispatchKeyCode(this.getKeyCodeFromEvent(e), e.key, e) // encode all the C-M-A-Shift bits:
  }
  /** invoke keyBound function AS IF kcode(str) was received. 
   * @param str KeyCode like "^-C-M-z"
   */
  dispatchChar(str: string) {
    return this.dispatchKeyCode(this.getKeyCodeFromChar(str), str) // for ex: "^-C-M-z"
  }
  /**
   * Dispatch based on keycode.
   * @param kcode extracted from KeyboardEvent, or synthesized from getKeyCodeFromChar(str)
   * @param e either a KeyboardEvent with .key, or the equivalent .key string
   */
  dispatchKeyCode(kcode: number, keyStr?: string, e?: KeyboardEvent ): boolean {
    let keymap: Keymap = this.getKeymap(this.focus)
    let plain = (kcode & (KEYUP | ALT | META | CTRL)) == 0  // may be named-char! (Space, Bel, Arrow*)
    let bind: Binding = keymap[kcode] 
    // check regexs if kcode indicates keyDown [TODO: have a map of keyUp-Regexps]
    if (!bind && plain && !!keymap.regexs && keymap.regexs.length > 0) {
      let regexs = keymap.regexs
      let rexBind = regexs.find(({regex, bind}) => {
        this.details && console.log(stime(this, ".dispatchKeyCode: find"), { keyStr, regex, bind}, regex.exec(keyStr))
        return regex.test(keyStr)
      })
      this.details && console.log(stime(this, `.dispatchKeyCode: rexBind=`), rexBind)
      bind = rexBind?.bind
    }
    if (this.details) // TODO: maybe use console.debug()
      console.log(stime(this, ".dispatchKeyCode:"), 
      { keyStr, bind, kcode, keymap: this.showBindings(keymap), regexs: keymap.regexs, focus: this.focus }, e);
    let rv: boolean;
    if (!!bind && typeof (bind.func) == 'function') {
      rv = bind.func.call(bind.thisArg, bind.argVal, keyStr) // false | undefined indicates preventDefault
      if (rv !== true && e instanceof Event) e.preventDefault()
      this.focus.lastFunc = bind.func
    }
    return rv // indicating no preventDefault...
  }

  showBindings(keymap: Keymap): string[] {
    let showBind = (b: Binding) => `${this.keyCodeToString(b._kcode)}->{${b.thisArg}.${b.func.name}(${b.argVal})}`
    return (keymap as Binding[]).map(b => showBind(b))
  }
  /** use _keymap of the given target (or global if not supplied) */
  setFocus(target: KeyScope = this) {
    this.focus = target
  }
  details = false // details of event to console.log 

  private initListeners() {
    console.log(stime(this, ".initListeners: keyBinder="), this);

    this.on("keydown", this.dispatchKey, this)[S.Aname] = "KeyBinder.dispatchKey"
    this.on("keyup", this.dispatchKey, this)[S.Aname] = "KeyBinder.dispatchKey"

    // let mousein = (e) => {evtd.showevent("onFocus", e)};
    // this.addEventListener("mouseenter", mousein);
    // let mouseout = (e) => {evtd.showevent("onBlur", e)};
    // this.addEventListener("mouseleave", mouseout);
  }

  showKeyEvent(str: string, e: KeyboardEvent) {
    console.log(stime(this, `.showKeyEvent`), { Bind: str, Key: e.key, Kcode: this.getKeyCodeFromEvent(e), event: e });
  }
}
