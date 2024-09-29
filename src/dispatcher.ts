
import { EventDispatcher } from "@thegraid/easeljs-module";
import type { NamedObject } from "./named-container";

/** for those cases where you need an EventDispatcher, but don't need to be an EventDispatcher */
export class Dispatcher extends EventDispatcher {
  static dispatcher = new Dispatcher();

  /** makes it easier to identify each 'on' listener when debugging. */
  namedOn(Aname: string, type: string, listener: (eventObj: any) => boolean, scope?: Object, once?: boolean, data?: any, useCapture = false) {
    const list2 = this.on(type, listener, scope, once, data, useCapture) as NamedObject;
    list2.Aname = Aname;
  }
}
