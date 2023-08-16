import { KeyBinder } from './src/index.js'
import { EditBox } from './src/index.js'

let kb = new KeyBinder()
//kb.details = true
let tb = new EditBox({ x: 0, y: 0, w: 600, h: 400 }, { textColor: 'lightgrey' })
tb.setFocus()
kb.dispatchChar("a");
kb.dispatchChar("b");
kb.dispatchChar("Enter")
kb.dispatchChar("c");
kb.dispatchChar("d");
kb.dispatchChar("e");
kb.dispatchChar("f");
console.log("test-edit-box.ts: innerText=", tb.innerText)
kb.dispatchChar("Backspace");
kb.dispatchChar("ArrowLeft");
kb.dispatchChar("C-b");
kb.dispatchChar("C-k");
kb.dispatchChar("C-e");
kb.dispatchChar("C-a");
kb.dispatchChar("C-y");
console.log("test-edit-box.ts: innerText=", tb.innerText)
