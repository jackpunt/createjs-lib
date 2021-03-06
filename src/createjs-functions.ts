import { EventDispatcher, Stage } from '@thegraid/createjs-module';

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

/**
 * Hack to createjs: remove listener from target before invoking listener.
 * @param target the EventDispatcher emitting Event(type)
 * @param type the Event to listener for
 * @param listener the function to run
 * @param scope a thisArg for invoking the listener
 * @param wait if supplied: setTimeout() for wait msecs before calling listener
 */
export function dispatchOnce(target: EventDispatcher, type: string, listener: (evt?: Object, ...args: any[]) => void, scope: Object = target, wait?: number) {
  let removeMe = (evt?: Object, ...args: any) => {
    target.off(type, listnr);
    if (!wait) {
      listener.call(scope, evt, ...args)
    } else {
      setTimeout(() => listener.call(scope, evt, ...args), wait)
    }
  }
  let listnr = target.on(type, removeMe, scope, true) // on Event(type), remove, wait, then run *once*
}