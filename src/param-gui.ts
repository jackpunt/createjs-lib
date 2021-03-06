import { Container, Text } from "@thegraid/createjs-module";
import { DropdownButton, DropdownChoice, DropdownItem, DropdownStyle } from "./dropdown";
import { C, F, stime } from './index.js' //'@thegraid/createjs-lib' //

export { DropdownButton, DropdownItem, DropdownStyle, DropdownChoice }
export type ParamType = any; // string | number | boolean
/** Supplied by user */
export interface ParamOpts {
  name?: string
  fontName?: string
  fontSize?: number
  fontColor?: string
  style?: DropdownStyle
  onChange?: (item: ParamItem) => void
  target?: object
}
/** Created by ParamGUI */
export interface ParamSpec extends ParamOpts {
  fieldName: string
  target?: object
  name?: string
  type?: string // boolean, string, string[], number,  ? (not used!?)
  chooser?: DropdownChoice // or other chooser...
  choices?: ParamItem[]
}
export interface ParamItem extends DropdownItem {
  text: string
  fieldName?: string
  value?: ParamType
  bgColor?: string
}
// in each Item: {[button:DropdownButton], text: string, fieldName: string, value: ParamType}

export class ParamLine extends Container {
  get height():number { return this.getBounds().height }
  get width(): number { return this.getBounds().width }
  chooser_w: number = 0 // width of chooser component
  chooser_x: number = 0 // where (on the line) to place chooser 
  chooser: DropdownChoice
  spec: ParamSpec
  nameText: Text
}

/**
 * ParamGUI is a set of Choosers arranged as lines of [Chooser, Label]
 * 
 * When the selected choice [a DropdownChoice] is changed,
 * the selected value is assigned to the indicated field of the Target.
 * 
 * Each line item can be individually configured using ParamOpts
 * to target a specific object, and font { fontSize, fontName, fontColor }
 * and DropdownStyle. 
 * 
 * The 'onChange' action defaults to setValue(item) { this.target[item.fieldName] = item.value }
 * but can be any function(item) => void.
 */
export class ParamGUI extends Container {
  /**
   * A Stack of Choosers to set various game parameters.
   * @param target change fields of this object (by default... ParamLine can override)
   * @param style changes from DropdownButton.defStyle
   */
  constructor(target: object, style: DropdownStyle = {}) {
    super()
    this.target = target
    this.defStyle = DropdownButton.mergeStyle(style)
  }
  target: object = undefined // normal target; a spec may override for a given fieldName
  defStyle: DropdownStyle    // tweaks to DropdownDefaultStyle
  specs: ParamSpec[] = []
  lines: ParamLine[] = []
  linew: number = 0 // max line.text.width
  lineh: number = 0 // max line.text.height
  lead: number = 10 // y-space between lines
  ymax: number = 0  // y at bottom of last line

  /** retrieve spec by fieldName */
  spec(fieldName: string) { return this.specs.find(s => s.fieldName == fieldName) }

  /** make a spec and push onto list of specs */
  makeParamSpec(fieldName: string, ary: any[], opts: ParamOpts = { fontSize: 32, fontColor: C.black }): ParamSpec {
    let { name, fontSize, fontColor, onChange, target } = opts
    let choices = this.makeChoiceItems(fieldName, ary) // [{text, fieldname, value}]
    let style = DropdownButton.mergeStyle(opts.style || {}, this.defStyle)
    let spec = { name, fieldName, choices, fontSize, fontColor, style, onChange, target }
    this.specs.push(spec)
    return spec
  }

  /**
   * Item displays 'item.text', invokes target[item.fieldName] = item.value
   * @param fieldName 
   * @param valueAry Array< TextIsValue | { text: text, value: value } >
   * @returns Array< { text, fieldName, value } >
   */
  makeChoiceItems(fieldName: string, valueAry: any[]): ParamItem[] {
    return valueAry.map(elt => {
      let value: any = elt 
      let text = (typeof elt ==='function') ? elt.name : elt.toString() // presentation string
      if (typeof elt === 'object') {
        text = elt.text
        value = elt.value
      }
      return { text, fieldName, value }
    })
  }
  /** for each ParamSpec add a Chooser and Text label. */
  makeLines(specs: ParamSpec[] = this.specs) {
    this.specs = specs
    specs.forEach(this.addLine, this)
    //this.lines.forEach((line, nth) => this.addChooser(line, specs[nth].choices, nth), this)
  }
  findLine(fieldName: string): ParamLine {
    return this.lines.find(pl => pl.spec.fieldName === fieldName)
  }
  /** set text for the label of the indicated line/Chooser */
  setNameText(fieldName: string, name: string = fieldName): Text {
    let line = this.findLine(fieldName)
    if (!!line.nameText) line.removeChild(line.nameText)
    let spec = line.spec
    let text = new Text(name, F.fontSpec(spec.fontSize || 32, spec.fontName), spec.fontColor)
    line.addChild(text)
    line.nameText = text
    return text
  }
  /** create DropdownChoice and Text label for the nth line of this ParamGUI */
  addLine(spec: ParamSpec, nth: number) {
    let line = new ParamLine()
    line.spec = spec
    line.y = 0
    this.lines.forEach(pl => line.y += (pl.height + this.lead)) // pre-existing lines
    this.lines.push(line) // so nameText can findLine()
    let text = this.setNameText(spec.fieldName, spec.name)
    this.addChild(line)
    let width = text.getMeasuredWidth()
    let height = text.getMeasuredLineHeight()
    this.linew = Math.max(this.linew, width)  // width of longest text
    this.lineh = Math.max(this.lineh, height) // height of tallest text in all lines... ?
    this.ymax = line.y + line.height          // bottom of last line

    let fs = spec.fontSize || 32
    let maxw = DropdownChoice.maxItemWidth(spec.choices, fs, spec.fontName)
    line.chooser_w = maxw + 1.5 * fs // text_width, some space, Arrow
    line.chooser_x = 0 - line.chooser_w - .5 * fs // .5 fs between chooser and name
    this.addChooser(line)
    return line
  }

  /** create and configure a DropdownChoice 'Chooser' for the given line. */
  addChooser(line: ParamLine) {
    let choices = line.spec.choices
    let boxh = line.height
    let ddc = new DropdownChoice(choices, line.chooser_w, boxh, line.spec.style)
    ddc.x = line.chooser_x // ddc.y = line.text.y = 0 relative to ParamLine, same as line.text
    line.chooser = ddc
    line.addChild(ddc)
    let fieldName = line.spec.fieldName, target = line.spec.target, value = this.getValue(fieldName, target)
    ddc.onItemChanged(!!line.spec.onChange ? line.spec.onChange : (item) => { this.setValue(item, target) })
    this.selectValue(fieldName, value, line)
    ddc.enable()
    return ddc
  }
  /** when a new value is selected, push it back into the target object.
   * auto-invoke onItemChanged() => (item)=>setValue(item) [or from spec.onChange(...) ]
   * suitable entry-point for eval_params: (fieldName, value) 
   */
  selectValue(fieldName: string, value: ParamType, line?: ParamLine): ParamItem | undefined {
    line = line || this.findLine(fieldName)
    if (!line) { return null }  // fieldName not available
    // invalid value leaves *current* value:
    let item = line.spec.choices.find(item => (item.value === value)) // {text, fieldName?, value?, bgColor?}
    if (!!item) {
      line.chooser.select(item) // will auto-invoke onItemChanged => setValue(item) OR onChange(...)
    }
    return item
  }

  /** return target[fieldName]; suitable for override */
  getValue(fieldName: string, target = this.target) {
    return target[fieldName]
  }
  /** update target[item.fieldname] = item.value; suitable for override */
  setValue(item: ParamItem, target = this.target): void {
    target[item.fieldName] = item.value
  }
}
