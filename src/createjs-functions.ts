import { F } from '@thegraid/common-lib';
import { Stage, Text } from '@thegraid/easeljs-module';

/** if no canvas, then disable MouseOver, DOMEvents, tick & tickChildren 
 * @param canvasId the DOM ID of a \<canvas> Element (or undefined for no canvas)
 */
export function makeStage(canvasId: string, tick = true) {
  let stage = new Stage(canvasId)
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