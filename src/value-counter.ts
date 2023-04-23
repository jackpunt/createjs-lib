import { Container, Event, Shape, Text, EventDispatcher, DisplayObject } from '@thegraid/easeljs-module';
import { XY, S, C, F } from './index.js';

/** send a simple value of type to target. */
export class ValueEvent extends Event {
  value: number | string ;
  constructor(type: string, value: number | string) {
    super(type, true, true);
    this.value = value;
  }
  /** dispatch ValueEvent via target */
  static dispatchValueEvent(target: EventDispatcher, type: string, value: number | string): boolean {
    return target.dispatchEvent(new ValueEvent(type, value));
  }
}
/** Text in a colored circle, possibly with a lable */

export class ValueCounter extends Container {

  color: string;
  text: Text;
  box: DisplayObject;
  value: number | string;
  /** width of curently displayed ellipse */
  wide: number = 0; // set -1 to provoke newBox

  /** height of curently displayed ellipse */
  high: number;
  /** font size in px */
  fontSize: number = 16;
  fontName: string = undefined; // use F.defaultFont
  fontSpec: string = F.fontSpec(this.fontSize, this.fontName);
  label: Text;
  labelFontSize: number = 16;


  constructor(name: string, initValue: number | string = 0, color: string = C.coinGold, fontSize: number = 16, fontName: string = undefined) {
    super();
    this.name = name;
    this.mouseEnabled = false;
    this.mouseChildren = false;
    this.setValue(initValue, color, fontSize, fontName);
  }

  /** 
   * repaint shape and text with new color/size/font.
   * Invoked by supplying extra args to setValue().
   */
  protected setFont(newColor: string, fontSize: number, fontName: string) {
    if (newColor)
      this.color = newColor;
    if (fontSize)
      this.fontSize = fontSize;
    if (fontName)
      this.fontName = fontName;
    this.fontSpec = F.fontSpec(this.fontSize, this.fontName);
    this.wide = -1; // provoke newBox()
  }

  /**
   *
   * @param value string to display near value
   * @param offset from center of text to origin of oval
   * @param fontSize
   */
  setLabel(value: string | Text, offset: XY = { x: 0, y: this.high / 2 }, fontSize = 8) {
    let label = (value instanceof Text) ? value : new Text(`${value}`, F.fontSpec(fontSize, this.fontName))
    this.label = label;
    let width = label.getMeasuredWidth();
    //let height = label.getMeasuredLineHeight()
    label.x = offset.x - (width / 2);
    label.y = offset.y + 1;
    this.addChild(label);
  }

  /** return width, height and text  */
  protected boxSize(text: Text): { width: number; height: number } {
    let texth = text.getMeasuredLineHeight();
    let textw = text.getMeasuredWidth();
    let height = texth * 1.2;
    let width = Math.max(textw * 1.3, height);
    text.x = 0 - (textw / 2);
    text.y = 1 - (texth / 2); // -1 fudge factor, roundoff?
    return { width, height };
  }
  /** 
   * makeBox: wide X high, centered at 0,0 (An Ellipse surrounding the value Text)
   * 
   * Override to draw alternative Shape/DisplayObject.
   */
  protected makeBox(color: string, high: number, wide: number): DisplayObject {
    let shape: Shape = new Shape();
    shape.graphics.f(color).de(0, 0, wide, high);
    shape.x = -wide/2; shape.y = -high/2
    return shape;
  }
  /** remove and nullify text, remove and replace Oval & label. */
  protected newBox(wide: number, high: number) {
    // make new Shape and Size:
    this.removeAllChildren();
    this.text = undefined;
    this.high = high;
    this.wide = wide;
    this.box = this.makeBox(this.color, high, wide);
    this.addChild(this.box);
    if (!!this.label)
      this.addChild(this.label);
  }
  getValue(): number | string {
    return this.value;
  }
  /** display new value, possibly new color, fontSize, fontName */
  setValue(value: number | string, color?: string, fontSize?: number, fontName?: string, textColor = C.black) {
    this.value = value;
    if (color || fontSize || fontName) this.setFont(color, fontSize, fontName);
    let text = new Text(`${value}`, this.fontSpec, textColor);
    let { width, height } = this.boxSize(text);
    if ((width > this.wide) || (width < this.wide * .9)) {
      this.newBox(width, height);
    }
    if (this.text) this.removeChild(this.text); // remove previous text entity
    this.text = text;
    this.addChild(text); // at top of list
  }

  updateValue(value: number | string) {
    this.setValue(value);
    //this.parent.setChildIndex(this, this.parent.numChildren -1)
    this.stage.update();
  }

  /**
   * add this ValueCounter to given Container with offsets, listening to target for [Value]Event of type.
   * @param cont likely an overCont
   * @param offest where on cont to place graphic
   * @param target EventDispatcher to listen for updates
   * @param type? type of Event to listen for valf (undefined -> no listener)
   * @param valf? function to extract value from ValueEvent
   */
  attachToContainer(cont: Container, offset: XY = { x: 0, y: 0 }, target?: EventDispatcher, type?: string, valf?: ((ve: Event) => number | string)) {
    cont.addChild(this);
    this.x = offset.x;
    this.y = offset.y;
    if (!!target && !!type) {
      let valff = valf || ((ve: ValueEvent) => ve.value as string | number);
      target.on(type, ((ve: Event) => this.updateValue(valff(ve))), this)[S.Aname] = "counterValf";
    }
  }
}
