import { Binding, KeyBinder } from './src'

let kb0 = new KeyBinder()
let kb = KeyBinder.keyBinder; // assert( kb === kb0)

function setKey(codeStr: string, bind: Binding): number {
  let kcode = kb.setKey(codeStr, bind)
  console.log('bind', { codeStr, kcode, func: bind.func })
  return kcode
}
function onKeyEvent(argVal?: any, evt?: KeyboardEvent | string) {
  let e = evt as KeyboardEvent
  let kcode = KeyBinder.keyBinder.getKeyCodeFromEvent(e as KeyboardEvent)
  let codek = KeyBinder.keyBinder.keyCodeToString(kcode)
  console.log('recv', { Bind: codek, Key: e.key, Kcode: kb.getKeyCodeFromEvent(e) });
  // KeyBinder.keyBinder.showKeyEvent(codek, e);
  return false;
}
let keyback: Binding = { func: onKeyEvent }

let ev = KeyBinder.keyEvent
let kbEvents: KeyboardEvent[] = [
  //                  shift  ctrl   meta    alt   keyup
  ev('s', 'KeyS', 83, false, false, false, false, false), // s
  ev('S', 'KeyS', 83, true,  false, false, false, false), // S
  ev('s', 'KeyS', 83, false, true,  false, false, false), // C-s
  ev('s', 'KeyS', 83, false, false, true,  false, false), // M-s
  ev('ß', 'KeyS', 83, false, false, false, true,  false), // A-s
  ev('s', 'KeyS', 83, false, false, false, false, true ), // ^-s

  ev('s', 'KeyS', 83, true, true,  false, false, false),  // C-S
  ev('s', 'KeyS', 83, true, true,  true,  false, false),  // C-M-s
  
  ev('å', 'KeyA', 65, false, false, false, true,  false), // A-a

  ev('Alt', 'AltLeft', 18, false, false, false, true, false), // Alt down
]
//kbEvents.forEach(evt => kb.dispatchEvent(evt))
kbEvents.forEach(evt => { 
  let kcode = kb.getKeyCodeFromEvent(evt)
  // let { shiftKey: shift, ctrlKey: ctrl, metaKey: meta, altKey: alt, type } = evt
  // let bits = {shift, ctrl, meta, alt, keyup: (type=="keyup")}
  // let keycode = kb.getKeyCode(kcode, bits)
  let codeStr = kb.keyCodeToString(kcode)
  let kcodeB = setKey(codeStr, keyback) // uses getKeyCodeFromChar('A-Alt')
  let rv = kb.dispatchKey(evt); 
  console.log('done', { codeStr, kcode, rv, kcodeB })
})
