import { Container } from "@thegraid/easeljs-module"

export type ChoiceType = any;  // string | number | boolean
export type ChoiceItem = { text: string, value: ChoiceType, fieldName?: string } // DropdownItem
export interface ChoiceStyle {
  fillColor?: string
  textColor?: string
  fontSize?: number
  fontName?: string
  textAlign?: string

  rootColor?: string
  rootTextColor?: string

  arrowColor?: string
  spacing?: number
}
export type ChooserConst = new (items: ChoiceItem[], item_w: number, item_h: number, style?: ChoiceStyle) => Chooser

/** abstract base class for other Chooser implementations */
export abstract class Chooser extends Container {
  constructor(public items: ChoiceItem[], item_w: number, item_h: number, style?: ChoiceStyle) {
    super()
  }
  _itemChanged: (item: ChoiceItem) => void;
  /** application sets a callback, to react when ChoiceItem is selected. */
  onItemChanged(f: (item: ChoiceItem) => void) { this._itemChanged = f }
  /** selected item has changed: invoke onChange(item) */
  changed(item: ChoiceItem) {
    if (typeof this._itemChanged == 'function') this._itemChanged(item)
  }
  /** call when Chooser is ready for use; after setting onItemChange() etc. */
  enable() { }

  /** choose the given Item. */
  select(item: ChoiceItem): ChoiceItem {
    this.changed(item)
    return item
  }
  /**
   * Specialized per-Chooser setValue() [for ParamGUI?]
   * @param value the new value to be set
   * @param item included for those that need item.fieldName or such
   * @param target the associated object to which fieldName applies
   * @return false if value has not been set; call select(item) instead.
   */
  setValue(value: any, item: ChoiceItem, target: object): boolean { return false }
}