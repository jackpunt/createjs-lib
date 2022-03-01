import { KeyBinder } from './src'
import { EditBox } from './src'

let kb = new KeyBinder()
//kb.details = true
let tb = new EditBox('lightgrey', {x: 0, y: 0, w: 600, h: 400})
tb.setFocus()
kb.dispatchChar("a");
kb.dispatchChar("b");
kb.dispatchChar("Enter")
kb.dispatchChar("c");
kb.dispatchChar("d");
kb.dispatchChar("e");
kb.dispatchChar("f");
console.log("test-edit-box.ts: getText=", tb.getText())
kb.dispatchChar("Backspace");
kb.dispatchChar("ArrowLeft");
kb.dispatchChar("C-b");
kb.dispatchChar("C-k");
kb.dispatchChar("C-e");
kb.dispatchChar("C-a");
kb.dispatchChar("C-y");
console.log("test-edit-box.ts: getText=", tb.getText())
