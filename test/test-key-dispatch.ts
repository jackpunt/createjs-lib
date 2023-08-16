import { AT, Binding, KeyBinder } from './src/index.js'

const kb0 = new KeyBinder()
const kb = KeyBinder.keyBinder; // assert( kb === kb0)

let kcodeRecv: number = undefined;
let codekRecv: string = undefined;
let ekeyRecv: string = undefined;

function onKeyEvent(argVal?: any, keyStr?: string) {
  //let e = evt as KeyboardEvent
  //let kcode = KeyBinder.keyBinder.getKeyCodeFromEvent(e as KeyboardEvent)
  let kcode = KeyBinder.keyBinder.getKeyCodeFromChar(keyStr)
  let codek = KeyBinder.keyBinder.keyCodeToString(kcode)
  kcodeRecv = kcode
  codekRecv = codek
  ekeyRecv = keyStr
  // console.log('recv', { Bind: codek, Key: ekeyRecv, Kcode: kcodeRecv });
  // KeyBinder.keyBinder.showKeyEvent(codek, e);
  return false;
}

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
  ev('Space', 'Space', 32, false, false, false, false, false),  // Space
  ev('SPACE', 'SPACE', 32,  true, false, false, false, false),  // S-Space
  ev('Enter', 'Enter', 13, false, false, false, false, false),  // Enter
  ev('Enter', 'Enter', 13,  true, false, false, false, false),  // S-Enter
  ev('Alt', 'AltLeft', 18, false, false, false,  true, false),  // Alt down
  ev('Alt', 'AltLeft', 18,  true, false, false, false, false),  // S-Alt
  ev('Alt', 'AltLeft', 18,  true, false, false, false, false),  // S-Alt
]

const recv = AT.ansiText(['green'], 'recv');
const FAIL = AT.ansiText(['$red'], 'FAIL');
//kbEvents.forEach(evt => kb.dispatchEvent(evt))
for (let mode = 1; mode <= 3; mode++) {
  console.log(`-------- mode ${mode} ----------`);
  kbEvents.forEach(evt => {
    const kcode = kb0.getKeyCodeFromEvent(evt)
    const codeStr = kb0.keyCodeToString(kcode)
    const kb = new KeyBinder(true);
    const [kcodeB, func] =
      (mode == 1) ? [kb.setKey(codeStr, { func: onKeyEvent }), 'onKeyEvent'] :
        (mode == 2) ? [kb.setKey(codeStr, () => onKeyEvent(undefined, codeStr)), '() => onKeyEvent(...)'] :
          (mode == 3) ? [kb.setKey(codeStr, onKeyEvent, this), 'this.onKeyEvent'] : [,];
    console.log('bind', { codeStr, kcode, func })
    kcodeRecv = undefined
    codekRecv = '*****'
    const rv = kb.dispatchKey(evt);
    const test = (!kcodeRecv || kcodeRecv !== kcode) ? FAIL : recv;
    console.log(test, { codeRec: codekRecv, Kcode: kcodeRecv, Key: ekeyRecv });
    console.log('done', { '^^^^^': codeStr, kcode, rv, kcodeB })
  })
}
