import { C, F, Obj, S, XY } from "@thegraid/common-lib";
import { MouseEvent, Rectangle, Shape, Text } from "@thegraid/easeljs-module";
import { ChoiceItem, ChoiceStyle, Chooser, } from "./chooser.js";
import { NamedContainer } from "./named-container.js";

// https://jsfiddle.net/s1o1wswr/13/

/**
 * Items in a DropdownChoice.items array
 */
export interface DropdownItem extends ChoiceItem {
  /** text displayed when Item is expanded (& _rootButton.text when selected) */
  text: string;
  /** value associated, if different from text */
  value: any;
  /** DisplayObject-Container holding Text (and mouse actions, etc.) */
  button?: DropdownButton;
}

// DropdownButton.text field is createjs.Text, not string.
// Use DropdownButton.text.text field to change button caption. 
export interface DropdownStyle extends ChoiceStyle {
  fillColor?: string
  fillColorOver?: string
  textColor?: string
  textColorOver?: string
  fontSize?: number
  fontName?: string
  textAlign?: string

  rootColor?: string
  rootColorOver?: string
  rootTextColor?: string
  rootTextColorOver?: string

  /** for 2.5D push into screen: offset by a few pixels */
  pressdown?: XY
  arrowColor?: string
  spacing?: number
}

export class DropdownButton extends NamedContainer {
  static defaultStyle: DropdownStyle = {
    fontSize: 32,
    fontName: undefined,
    textAlign: 'left',
    arrowColor: "grey",
    rootColor: "rgba(160,160,160,.5)", // lightish grey alpha=.5
    rootColorOver: "lightgrey",
    rootTextColor: C.black,
    rootTextColorOver: C.black,

    fillColor: "darkgrey",
    fillColorOver: "lightgrey",
    textColor: "white",
    textColorOver: "white",

    spacing: 0,
    pressdown: { x: 2, y: 2 }
  }
  // Public Members
  style: DropdownStyle = Obj.fromEntriesOf(DropdownButton.defaultStyle);
  text: Text;
  fontSize: number;
  fontName: string;
  textAlign: string;
  override parent: DropdownChoice;

  // Private Members
  pressed: boolean;
  hover: boolean;
  shape: Shape;
  w: number; h: number; r: number;
  _arrowShape: Shape;
  _arrowWidth: number = 0;
  /** handle click of selected Item. _itemClick(item) OR rootButton._dropdown() */
  click(handler: (item: DropdownItem) => void) {
    this.shape.addEventListener(S.click, handler);
  }
  /**
   * @param style selected overrides
   * @param defStyle all the default style values
   * @returns copy of defStyle with overrides from style
   */
  static mergeStyle(style: DropdownStyle, defStyle = DropdownButton.defaultStyle) {
    return Obj.mergeDefaults(style, defStyle)
  }
  get arrow_c() { return this.style.arrowColor || this.style.rootTextColor || this.style.textColor }
  get arrow_r() { return this.fontSize / 2 }
  get arrow_w() { return this.arrow_c === '0' ? 0 : 2 * (this.arrow_r + 2)}
  /**
   * Contains a rectangular Shape, a Text|TextBox and maybe an Arrow.
   * @param text supply "" to designate the _rootButton to make an Arrow
   * @param w for RoundedRectangle
   * @param h for RoundedRectangle
   * @param r for RoundedRectangle
   * @param click handler for click(item)=>void
   * @param style all the param for DropdownStyle
   * @param style.fontSize default 16
   * @param style.fontName default F.defaultFont
   * @param style.textAlign default 'left'
   */
  constructor(text: string, w: number, h: number, r: number, click?:(e)=>any, style?: DropdownStyle) {
    super('DropdownButton')
    this.style = DropdownButton.mergeStyle(style)
    // Public Methods
    this.pressed = false;
    this.hover = false;
    this.shape = new Shape();
    this.text = new Text();
    this.fontSize = this.style.fontSize
    this.fontName = this.style.fontName
    this.textAlign = this.style.textAlign
    this.w = w
    this.h = h
    this.r = r
    let _self = this // OR: could use .on(,,,this)
 
    let addArrow = (item_h: number): Shape => {
      let arrow = new Shape()
      let arrow_r = this.arrow_r;     // AKA: "radius"
      let arrow_y = item_h / 2 - arrow_r * .2
      let arrow_x = (this.w - arrow_r - 2); // 5% "margin/border" on end?
      arrow.graphics.beginFill(this.arrow_c).drawPolyStar(arrow_x, arrow_y, arrow_r, 3, 0, 90)
      arrow.mouseEnabled = false
      this.addChild(arrow)      
      return arrow
    }

    this.addChild(this.shape);
    this.addChild(this.text);
    this.initText(text);
    this._arrowWidth = this.arrow_w  // 0 or ~fontSize
    if (text == "") { // indicates making the rootButton
      this.style = Obj.fromEntriesOf(this.style) // copy & paste:
      this.style.fillColor = this.style.rootColor || this.style.fillColor
      this.style.fillColorOver = this.style.rootColorOver || this.style.fillColorOver
      this.style.textColor = this.style.rootTextColor || this.style.textColor
      this.style.textColorOver = this.style.rootTextColorOver || this.style.textColorOver

      if (this.style.arrowColor != '0') addArrow(this.h)
    }

    // Shape Events
    this.shape.addEventListener("pressmove", (e: MouseEvent) => {
      e.stopPropagation()  // do not 'drag' when pressing on menu item
      _self.pressed = true; this.render();
    });
    this.shape.addEventListener("pressup", (e: MouseEvent) => {
      _self.pressed = false; this.render();
    });
    this.shape.addEventListener("mouseover", (e: MouseEvent) => {
      //e.stopPropagation()
      _self.hover = true; this.render();
    });
    this.shape.addEventListener("mouseout", (e: MouseEvent) => {
      this.parent.isMouseOver(e)
      _self.hover = false; this.render();
    });
    // Initialization For Stage
    this.render();
    if (click) this.click(click);
  }
  /** update shape.graphics to show background/rectangle */
  render() {
    this.shape.x = 0;
    this.shape.y = 0;
    let left = this.h * .2, c = (this.w - this._arrowWidth + 4)/2 // h ~ fontSize
    this.text.x = (this.text.textAlign === 'center' ? c
      : (this.text.textAlign === 'left') ? left
      : (this.w - this._arrowWidth) ); // (this.w - this.h - mar) ); 
    this.text.y = this.h / 2;
    if (this.pressed) {
      this.shape.x += this.style.pressdown.x;
      this.shape.y += this.style.pressdown.y;
      this.text.x += this.style.pressdown.x;
      this.text.y += this.style.pressdown.y;
    }

    let g = this.shape.graphics, over = this.hover || this.pressed
    g.clear()
    g.f(over ? this.style.fillColorOver : this.style.fillColor)
    g.drawRoundRect(0, 0, this.w, this.h, this.r);
    this.text.color = over ? this.style.textColorOver : this.style.textColor;
    this.stage?.update()
  }
  initText(text: string) {
    const t = this.text;
    t.mouseEnabled = false
    t.text = text;
    t.font = F.fontSpec(this.fontSize, this.fontName) //this.fontsize + "px 'Meiryo UI'"
    t.textAlign = this.textAlign
    t.textBaseline = "middle";
    t.lineHeight = this.h;
  }
  onClick(handler: (eventObj: Object) => boolean) {
    this.shape.addEventListener(S.click, handler);
  }
} // EaselButton

/**
 * A DropdownMenu, with DropdownItem[], one of which may be 'selected'.
 * When the selected Item changes, the onItemChanged method/function is invoked.
 * 
 * a "DropdownChooser"
 */
export class DropdownChoice extends Chooser {
  override items: DropdownItem[];
  _boundsCollapsed: Rectangle
  _boundsExpand: Rectangle
  _expand = false;
  _selected: DropdownItem; // selected item
  _index: number; // index of selected item
  _rootButton: DropdownButton
  
  /** show or hide all the item.button(s) 
   * @param expand true to toggle state, false to collapse
   */
  protected dropdown(expand?: boolean) {
    if (expand) expand = !this._expand;
    // bring to top of parent (Note: onChange() may have deconstructed the Containers)
    this.parent?.parent?.setChildIndex(this.parent, this.parent.parent.numChildren -1)
    this.items.forEach(item => item.button.visible = expand)
    this._expand = expand;
    //console.log(stime(this, ".dropdown: expand="), expand)
  };
  override enable() {
    this.stage.enableMouseOver() // Stage Event
  }
  /** @return true if mouseEvent is over this Dropdown */
  isMouseOver(e: MouseEvent): boolean {
    let b = this._expand ? this._boundsExpand : this._boundsCollapsed
    let pt = this.globalToLocal(e.stageX, e.stageY)
    let c = b.contains(pt.x, pt.y)
    if (!c && this._expand) 
      this.dropdown(false)
    return c
  }
  /**
   * Show rootButton (value & triangle) or expand to show DropdownItem[] of values.
   * @param items {text: "show this"}
   * @param item_w width of item box (include: text width + space for arrow)
   * @param item_h height of each DropdownButton
   * @param style size and colors applied to each DropdownButton
   */
  constructor( items: DropdownItem[], item_w: number, item_h: number, style?: DropdownStyle) {
    super(items, item_w, item_h, style)

    // Private Members
    // bounds in parent Container coordinates:
    this._boundsCollapsed = new Rectangle(this.x, this.y, item_w, item_h);
    this._boundsExpand = this._boundsCollapsed.clone();
    this._expand = false;
    let spacing = style?.spacing || 0; // item spacing OR 'lead'

    this._rootButton = new DropdownButton("", item_w, item_h, 0, () => this.rootclick(), style);
    this.addChild(this._rootButton)

    // Initialize each DropdownItem -> DropdownButton
    items.forEach((item, c) => {
      let btn = new DropdownButton(item.text, item_w, item_h, 0, () => this.itemclick(item), style);
      btn.y += (item_h + spacing) * (c + 1) // "+ 1" to account for _rootButton
      this._boundsExpand.height += item_h + spacing;
      item.button = btn;
      btn.visible = false
      this.addChild(btn)
    })
  }
  rootclick() { this.dropdown(true) }
  itemclick(item: DropdownItem) { this.dropdown(false); this.select(item) }

  // Public Members
  /**
   * get or change the selected item.
   * @param item item to select; or null to return currently selected item
   * @returns selected item 
   */
  override select(item: DropdownItem): DropdownItem {
    if (item == undefined) item = this._selected // "reselect" same item [no-op]
    let index = this.items.indexOf(item); // -1 -> retain current selection
    if (index == this._index) return item // no change, nothing to do
    // maintain this._selectedItem AND this._index for detecting change
    this._selected = item;
    this._index = index
    this.changed(item);  // possible to override and change item.text
    this._rootButton.text.text = item.text;
    this.stage?.update() // in case changed(item) removes Dropdown from stage...
    return item;
  }
  /** alternate to select(item); selectItem by index */
  selectAt(index: number): DropdownItem {
    return this.select(this.items[index])
  }
}

/** auto-select next item in cycle. */
export class CycleChoice extends DropdownChoice {
  override rootclick() {
    let ndx = (this.items.indexOf(this._selected) + 1) % this.items.length
    let item = this.items[ndx];
    this.select(item);
    this.dropdown(false) // super.rootclick()
  }
}

/** present [false, true, ...] with any pair of string: ['false', 'true', ...] */
export class BoolChoice extends CycleChoice {
  /** typically: items.length == 2 */
  constructor(items: DropdownItem[], item_w: number, item_h: number, style?: DropdownStyle) {
    let boolValues = (items: DropdownItem[]) => { 
      items.forEach((item, ndx) => {
        if (item.text == item.value) item.value = (ndx != 0)
      })
      return items
    }
    super(boolValues(items), item_w, item_h, style)
  }
}