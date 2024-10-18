import { Constructor, F } from '@thegraid/common-lib';
import { Container, DisplayObject, Event, MouseEvent, Stage, Text } from '@thegraid/easeljs-module';

declare module "@thegraid/easeljs-module" {
  interface Container {
    removeChildType<T extends DisplayObject>(type: Constructor<T>, pred?: (dobj: T) => boolean): T[];
  }

  // @types/createjs has the wrong (obsolete?) signature(s)
  interface EventDispatcher {
    dispatchEvent(type: string | Event | Object): boolean;
    dispatchEvent(type: string | Event | Object, bubbles?: boolean, cancelable?: boolean): boolean;
  }
}

Container.prototype.removeChildType = function removeChildType<T extends DisplayObject>(type: Constructor<T>, pred = (dobj: T) => true ): T[] {
  const cont = this as Container;
  const rems = cont.children.filter((c: DisplayObject) => (c instanceof type) && pred(c)) as T[];
  cont.removeChild(...rems);
  return rems;
};

/** if no canvas, then disable MouseOver, DOMEvents, tick & tickChildren 
 * @param canvasId a \<canvas> Element OR the DOM ID of a \<canvas> Element (or undefined for no canvas)
 */
export function makeStage(canvasId: string | HTMLCanvasElement, tick = true) {
  const stage = new Stage(canvasId);
  stage.tickOnUpdate = stage.tickChildren = tick
  if (!stage.canvas) {
    stage.enableMouseOver(0)
    stage.enableDOMEvents(false)
    stage.tickEnabled = stage.tickChildren = false
  }
  return stage
}

export function textWidth(text: string, font_h: number, fontName?: string) {
  return new Text(text, F.fontSpec(font_h, fontName)).getMeasuredWidth()
}
/**
 * return length of longest Text(string, fontSpec)
 * @param items each item is string OR { text: string }
 * @param font_h 
 * @param fontName 
 * @returns length of longest Text(string, fontSpec(font_h, fontName))
 */
export function maxTextWidth(items: (string | { text: string })[], font_h: number, fontName?: string) {
  return items.reduce((w, item) => Math.max(w, textWidth((typeof item == 'string') ? item : item.text, font_h, fontName)), 0)
}

/**
 * stage.update() then after 'drawend' on stage run afterFunc()
 * @param dispObj any DisplayObject to find the stage.
 * @param afterFunc if supplied, invoke after stage updates.
 * @param scope thisArg for afterFunc
 */
export function afterUpdate(dispObj: DisplayObject, afterFunc?: () => void, scope?: any) {
  afterFunc && dispObj.stage.on('drawend', afterFunc, scope, true);
  dispObj.stage.update();
}

/** async wrapper for afterUpdate */
export async function awaitUpdate(cont: DisplayObject) {
  return new Promise<void>((res, rej) => {
    afterUpdate(cont, res);
  })
}

/** dispObj.visible = false; awaitUpdate().then(setTimeout(dispObj.visible = true; after(), dwell)) */
export async function blinkAndThen(dispObj: DisplayObject, after: () => void, dwell = 0) {
  dispObj.visible = false;
  awaitUpdate(dispObj).then(() => {
    setTimeout(() => {
      dispObj.visible = true;
      after();
    }, dwell)
  });
}

/** stopPropagation and stopImmediatePropagation */
export function stopPropagation(ev: any) {
  const evt: MouseEvent = ev
  const nevt = evt.nativeEvent;
  evt.stopPropagation()
  evt.stopImmediatePropagation();
  nevt.preventDefault(); // ev is non-cancelable, but stop the native event...
  nevt.stopImmediatePropagation();
}
