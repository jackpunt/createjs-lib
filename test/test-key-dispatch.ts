import { Binding, KeyBinder } from './src'

const kb0 = new KeyBinder()
const kb = KeyBinder.keyBinder; // assert( kb === kb0)

function setKey(codeStr: string, bind: Binding): number {
  let kcode = kb.setKey(codeStr, bind)
  console.log('bind', { codeStr, kcode, func: bind.func })
  return kcode
}
let kcodeRecv: number = undefined;
let codekRecv: string = undefined;
let ekeyRecv: string = undefined;

function onKeyEvent(argVal?: any, evt?: KeyboardEvent | string) {
  let e = evt as KeyboardEvent
  let kcode = KeyBinder.keyBinder.getKeyCodeFromEvent(e as KeyboardEvent)
  let codek = KeyBinder.keyBinder.keyCodeToString(kcode)
  kcodeRecv = kcode
  codekRecv = codek
  ekeyRecv = e.key
  // console.log('recv', { Bind: codek, Key: ekeyRecv, Kcode: kcodeRecv });
  // KeyBinder.keyBinder.showKeyEvent(codek, e);
  return false;
}
const keyback: Binding = { func: onKeyEvent }

const ev = KeyBinder.keyEvent // key, code, keyCode, shiftKey, ctrlKey, metaKey, altKey, type
const kbEvents: KeyboardEvent[] = [
  // key   code       shift  ctrl   meta    alt   keyup
  ev('s', 'KeyS', 83, false, false, false, false, false), // s
  ev('S', 'KeyS', 83, true,  false, false, false, false), // S
  ev('s', 'KeyS', 83, false, true,  false, false, false), // C-s
  ev('s', 'KeyS', 83, false, false, true,  false, false), // M-s
  ev('ß', 'KeyS', 83, false, false, false, true,  false), // A-s
  ev('s', 'KeyS', 83, false, false, false, false, true ), // ^-s

  ev('s', 'KeyS', 83, true, true,  false, false, false),  // C-S
  ev('s', 'KeyS', 83, true, true,  true,  false, false),  // C-M-s
  
  ev('å', 'KeyA', 65, false, false, false, true,  false), // A-a

  ev(' ', ' ', 32, false, false, false, false, false),    // ' ' literal Space
  ev(' ', ' ', 32,  true, false, false, false, false),    // S-Space
  ev(' ', ' ', 32,  false, true, false, false, false),    // C-Space
  ev('Space', 'Space', 32, false, false, false, false, false), // Space
  ev('SPACE', 'SPACE', 32,  true, false, false, false, false), // S-Space
  ev('Alt', 'AltLeft', 18, false, false, false,  true, false),  // Alt down
  ev('Alt', 'AltLeft', 18,  true, false, false, false, false),  // S-Alt
]
//kbEvents.forEach(evt => kb.dispatchEvent(evt))
kbEvents.forEach(evt => { 
  let kcode = kb.getKeyCodeFromEvent(evt)
  // let { shiftKey: shift, ctrlKey: ctrl, metaKey: meta, altKey: alt, type } = evt
  // let bits = {shift, ctrl, meta, alt, keyup: (type=="keyup")}
  // let keycode = kb.getKeyCode(kcode, bits)
  let codeStr = kb.keyCodeToString(kcode)
  let kcodeB = setKey(codeStr, keyback) // uses getKeyCodeFromChar('A-Alt')
  kcodeRecv = undefined
  codekRecv = '*****'
  let rv = kb.dispatchKey(evt); 
  if (kcodeRecv) 
    console.log('recv', { codeRec: codekRecv, Kcode: kcodeRecv, Key: ekeyRecv });
  else 
    console.log('FAIL', { codeRec: codekRecv, Kcode: kcodeRecv, Key: ekeyRecv });
  console.log('done', { '^^^^^': codeStr, kcode, rv, kcodeB })
})
