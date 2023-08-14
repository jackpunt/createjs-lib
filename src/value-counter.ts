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
/** Text in a colored circle, possibly with a label */

export class ValueCounter extends Container {

  readonly text = new Text(undefined);  // a vacuous Text Object.
  color: string;        // backgroud color
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

  constructor(name: string, initValue: number | string = 0, color = C.coinGold, fontSize = 16, fontName?: string, textColor?: string) {
    super();
    this.name = name;
    this.color = color;
    this.mouseEnabled = false;
    this.mouseChildren = false;
    this.initValueText(initValue, fontSize, fontName, textColor);
    this.setValue(initValue);
  }

  /**
   * repaint shape and text with new color/size/font.
   * Invoked by supplying extra args to setValue().
   */
  protected setFont(fontSize = this.fontSize, fontName = this.fontName, textColor = this.text.color ?? C.BLACK) {
    this.fontSize = fontSize;
    this.fontName = fontName;
    this.fontSpec = F.fontSpec(this.fontSize, this.fontName);
    this.text.font = this.fontSpec;
    this.text.color = textColor;
    this.wide = -1; // provoke newBox()
  }

  protected initValueText(initValue: number | string, fontSize: number, fontName?: string, textColor = C.BLACK) {
    this.text.text = `${initValue}`;
    this.setFont(fontSize, fontName, textColor); // save fontSpec
    this.text.textAlign = 'center';
    this.text.textBaseline = 'middle';
  }

  /** set Label (at bottom of box) */
  setLabel(label: string | Text, offset: XY = { x: this.label?.x ?? 0, y: this.label?.y ?? this.high }, fontSize = this.labelFontSize) {
    this.removeChild(this.label);
    this.labelFontSize = fontSize;
    let labelText = label as Text;
    if (!(label instanceof Text)) {
      labelText = new Text(`${label}`, F.fontSpec(fontSize, this.fontName));
      labelText.textAlign = 'center';
      labelText.textBaseline = 'middle';
      labelText.x = offset.x;
      labelText.y = offset.y;
    }
    this.label = this.addChild(labelText);
  }

  protected makeBox(color: string, high: number, wide: number): DisplayObject {
    const shape: Shape = new Shape();
    shape.graphics.f(color).de(-wide/2,  -high/2, wide, high); // drawEllipse()
    return shape;
  }

  protected newBox(wide: number, high: number) {
    // make new Shape and Size:
    this.removeAllChildren();
    // this.text = undefined;
    this.high = high;
    this.wide = wide;
    this.box = this.makeBox(this.color, high, wide);
    this.boxAlign();
    this.addChild(this.box);
    if (!!this.label)
      this.addChild(this.label);
  }

  /** return required size { width, height } of Box (ellispe or rect or whatever) */
  protected boxSize(text: Text): { width: number; height: number } {
    let texth = text.getMeasuredLineHeight();
    let textw = text.getMeasuredWidth();
    let height = texth * 1.2;
    let width = Math.max(textw * 1.3, height); // Ellipse
    return { width, height };
  }

  protected boxAlignment: 'center' | 'left' | 'right' = 'center';
  boxAlign(align = this.boxAlignment) {
    this.boxAlignment = align;
    const { width } = this.boxSize(this.text)
    const x = (align === 'right') ? -width/2 : (align === 'left') ? width/2 : 0; // default 'center'
    this.box.x = x;
    this.text.x = x;
    this.text.y = 0;  // textBaseline = 'middle'
  }

  protected setBoxWithValue(value: string | number): void {
    const text = this.text;
    text.text = `${value}`
    const { width, height } = this.boxSize(text);
    if ((width > this.wide) || (width < this.wide * .9)) {
      this.newBox(width, height);
    }
    // this.boxAlign();
    this.addChild(text); // at top of list
  }

  getValue(): number | string {
    return this.value;
  }

  /** display new value, possibly new color, fontSize, fontName, textColor */
  setValue(value: number | string, color = this.color, fontSize = this.fontSize, fontName = this.fontName, textColor = this.text?.color ?? C.BLACK) {
    this.value = value;
    // TODO: remove workaround for old constructor:
    if (!this.text) this.initValueText(undefined, fontSize, fontName, textColor);
    if (color !== this.color) {
      this.color = color;
      this.wide = -1; // force rebuild
    }
    if (fontSize !== this.fontSize || fontName !== this.fontName || textColor != this.text.color) {
      this.setFont(fontSize, fontName, textColor);
    }
    this.setBoxWithValue(value);
  }

  updateValue(value: number | string) {
    this.setValue(value);
    this.stage?.update();
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
