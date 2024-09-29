import { Container, DisplayObject, MouseEvent, Matrix2D } from '@thegraid/easeljs-module';
import { XY, S, Obj, stime } from '@thegraid/common-lib';

export class Dragole {
  /** external injection point */
  static logCount: (count: number) => void;
  /** external injection point */
  static logMsg: (msg: any, ...args: any[]) => void;
  static count = 0
  static logRate = 50;  // can modify in debugger
  static reset(val: number = 0) { Dragole.count = val; }
  static inc() { Dragole.count++ }
  static logEvent(msg: string) {
    if (typeof (Dragole.logCount) == 'function')
      Dragole.logCount(Dragole.count)
  }
  /** console.log(stime(this), msg?, ...args) every n samples */
  static log(n: number, msg?: any, ...args: any[]) {
    Dragole.logEvent(msg);
    if (Dragole.count % n == 0) {
      console.log(stime(`Dragole.log`), msg, ...args);
      if (typeof (Dragole.logMsg) == 'function')
        Dragole.logMsg(msg, args)
    }
  }
}

/** Info about the current drag operation, shared between pressmove(s) and pressup. 
 * drag context and scale info for isScaleCont
 */
export interface DragInfo {
  first: boolean,      // true on the first drag event of this dragCtx, false thereafter
  dropCont?: Container,// if set, drop in that container, instead of srcCont
  srcCont: Container,  // original obj.parent
  dropNdx: number,      // original index of obj in parent.children
  event: MouseEvent,   // latest 'pressmove' or 'pressup' mouseevent
  stageX0: number,      // original mouse hit: e.stageX (global coords)
  stageY0: number,
  dxy: XY;             // original offset from mouse to regXY (local coords)
  objx: number,        // obj location on parent (drag cont or stage)
  objy: number,
  scalmat: Matrix2D,   // original/current scale/translate (to detect change of scale/offset)
  targetC: Container,     // set if dragging whole [Scaleable]Container
  targetD: DisplayObject, // set if dragging single DisplayObject
  rotation: number,      // obj.rotation before dragging
}
const S_stagemousemove = 'stagemousemove'
type OnHandler = Function
type DnDFunc = (c: DisplayObject | Container, ctx?: DragInfo) => void
type DragData = { 
  scope: Object,        // 'this' for dragFunc/dropFunc()
  dragfunc: DnDFunc, 
  dropfunc: DnDFunc, 
  dragCtx?: DragInfo, 
  pressmove?: OnHandler, 
  pressup?: OnHandler, 
  stagemousemove?: OnHandler, 
  clickToDrag?: boolean,
  isScaleCont?: boolean, 
  dragStopped?: boolean, // true if stopDragging(target) was called, else undefined
}

/**
 * expect a singleton instance to control drag/drop on a single ScalableContainer
 */
export class Dragger {
  /** @param  parent for this dragger.dragCont */
  constructor(parent: Container) {
    this.makeDragCont(parent)
  }
  /** Info about the current drag operation, shared between pressmove(s) and pressup. */
  dragCont: Container

  /**
   * Make the singleton dragCont for this Dragger
   * @param parent the createjs Stage, unless you know better
   */
  makeDragCont(parent: Container) {
    this.dragCont = new Container()
    this.dragCont.name = "dragCont"
    parent.addChild(this.dragCont) // may be re-parented to the ScaleableContainer!
  }
  // mouse drag events *only* available from stage/HTMLElement layer
  //console.log(stime(this, ".makeDragable dispObj=") ,dispObj, dragfunc, dropfunc)
  /**
   * @param event pressmove MouseEvent
   * @param obj e.currentTarget (the pressmove Listener object)
   * @returns 
   */
  startDrag(event: MouseEvent, obj: DisplayObject | Container, data: DragData) : DragInfo {
    // console.log(stime(this, ".pressmove: target.name="), e.target.name, "dragfunc?", dragfunc,
    // "\n   obj=", obj, "\n   event=", e)
    const srcCont: Container = obj.parent; // original parent
    const dropNdx = srcCont.children.indexOf(obj);
    let dragCont: Container = this.dragCont;

    let scalmat: Matrix2D
    let targetC: Container;
    let targetD: DisplayObject;
    let rotation: number = obj.rotation
    obj.rotation = 0    // else dragging goes backward due to obj.concatMatrix

    let dxy = { x: event.localX - obj.regX, y: event.localY - obj.regY } // delta from obj's origin to mouse

    // for Citymap, all CardContainers are mouse-transparent, so obj == ScaleableContainer, obj.parent == stage
    if ((obj instanceof Container) && data.isScaleCont) {
      // Drag the whole [Scaleable]Container 
      // (cannot DragCont.addChild(obj), because DragCont is child of ScaleableContainer!)
      // [obj == sc, THE instanceof ScaleableContainer], this.parent == stage
      // TODO: have DragCont NOT in ScaleableContainer: listen for scale events, localToLocal coords
      targetC = (obj as Container)
      srcCont.setChildIndex(obj, srcCont.numChildren - 1) // return to orig position; user can addChild...
    } else {
      // is a DispObj [Card as Container or PlayerMarker]
      targetD = (obj as DisplayObject)
      obj.parent.localToLocal(obj.x, obj.y, dragCont, obj)    // offset to dragCont
      dragCont.addChild(obj)                                  // assert: only 1 child in dragCont
      dragCont.parent.setChildIndex(dragCont, dragCont.parent.numChildren - 1) // dragCont to top of SC
    }
    scalmat = obj.getConcatenatedMatrix()   // record original scale and offsets
    // in all cases, set data.dragCtx
    return data.dragCtx = {
      dropCont: srcCont, srcCont, dropNdx, first: true,
      event, stageX0: event.stageX, stageY0: event.stageY, objx: obj.x, objy: obj.y, scalmat, dxy,
      targetC, targetD, rotation,
    };
    //console.log(stime(this, ".pressmove: dragCtx.lastCont.name="), dragCtx.lastCont.name, dragCtx)
    //console.log(stime(this, ".pressmove: dragCtx="), dragCtx, "\n   event=", e, dragfunc)
  }

  pressmove(event: MouseEvent, data: DragData) {
    let { dragfunc, dragCtx } = data
    // TODO: remove this, client to use stopDrag(), so mouse state is stable.
    if (event.target[S.doNotDrag]) return
    // not sure button check is working:
    if (event.nativeEvent?.button !== 0) return;
    // use currentTarget, so non-dragable Shapes pull whole ScaleableContainer
    let obj: DisplayObject | Container = event.currentTarget, stage = obj.stage;
    if (!dragCtx) {
      Dragole.reset(-1) // *first* (next) log will trigger
      dragCtx = this.startDrag(event, obj, data) // Also: data.dragCtx = dragCtx;
    } else {
      dragCtx.first = false
      dragCtx.event = event
    }
    event.stopPropagation()
    if (data.dragStopped) return; // waiting for *real* pressup event.

    /** move the whole scaleContainer, adjusting when it gets scaled. */
    let moveScaleCont = (sc: Container, event: MouseEvent) => {
      // dragCont is child of obj == ScaleableConter:
      let dx = event.stageX - dragCtx.stageX0 // (stageX - stageX0)
      let dy = event.stageY - dragCtx.stageY0
      let oscalmat = dragCtx.scalmat
      let nscalmat = sc.getConcatenatedMatrix()
      if (nscalmat.a != oscalmat.a) { // SC has been zoomed (and offset!)
        dragCtx.objx = sc.x - dx      // move sc back at current/original scale
        dragCtx.objy = sc.y - dy
        dragCtx.scalmat = nscalmat    // record new scale
      }
      sc.x = dragCtx.objx + dx        // move sc by dxy relative to original position?
      sc.y = dragCtx.objy + dy
      // obj.stage.update()
      //console.log(stime(this, ".moveCont:"), {orig, e, pt, sx: obj.scaleX, obj})
    }

    // move obj to follow mouse:
    if (obj == dragCtx.targetC) {
      moveScaleCont(obj as Container, event)   // typically: the whole ScaleableContainer
    } else if (obj == dragCtx.targetD) {
      obj.parent.globalToLocal(event.stageX, event.stageY, obj) // move obj to stageX, stageY
      obj.x -= dragCtx.dxy.x * obj.scaleX;       // offset by dxy
      obj.y -= dragCtx.dxy.y * obj.scaleY;
    } else {
      Dragole.logEvent("unexpected currentTarget: " + obj.name);
      console.warn(stime(this, ".pressmove: unexpected target:"), { obj, event: event, targetC: dragCtx.targetC, targetD: dragCtx.targetC, dragCtx: Obj.fromEntriesOf(dragCtx) })
      return
    }
    //console.log(stime(this, ".pressmove: obj.x="), obj.x, "obj.y=", obj.y, "evt_pt=", evt_pt, "\n   event=", e, "\n   obj=",obj, "\n    dragCtx=", dragCtx)
    if (dragfunc) {
      if (((typeof dragfunc) === "function")) {
        try {
          dragfunc.call(data.scope || obj.parent, obj, dragCtx)
        } catch (err) {
          Dragole.logEvent("dragfunc FAILED");
          console.warn(stime(this, ".pressmove: dragfunc FAILED: "), dragfunc, "dragCtx=", Obj.fromEntriesOf(dragCtx), "\n   err=", err)
        }
      } else {
        Dragole.logEvent("dragfunc UNKNOWN");
        console.warn(stime(this, ".pressmove: dragfunc UNKNOWN:"), dragfunc, "dragCtx=", Obj.fromEntriesOf(dragCtx))
      }
    }
    stage?.update();
  }

  // a click, or end-of-drag or synthetic, from stopDrag()
  pressup(e: MouseEvent, data: DragData) {
    let { dropfunc, dragCtx } = data
    let obj: DisplayObject = e.currentTarget // the SC in phase-3
    data.dragCtx = undefined; // drag is done... mousebutton is up
    data.dragStopped = false; // indicates that it *was* stopped vs undefined (never stopped)
    let stage = obj.stage
    if (data.clickToDrag && data.stagemousemove) {
      stage.removeEventListener(S_stagemousemove, data.stagemousemove)
      data.stagemousemove = undefined;
    }
    if (!dragCtx) {
      // pressup without a dragCtx: a click; if clickToDrag convert stagemousemove to pressmove:
      if (!!data.clickToDrag && e.nativeEvent.button === 0) {
        // mouse is NOT down; to get 'drag' events we listen for stagemousemove:
        let stageDrag = (e: MouseEvent, data?: DragData) => {
          e.currentTarget = obj
          this.pressmove(e, data)
        }
        data.stagemousemove = stage.on(S_stagemousemove, stageDrag, this, false, data)
        this.pressmove(e, data)  // --> data.dragCtx = this.startDrag(event, obj, data)
      }
      return     // a click, not a Drag+Drop
    }
    dragCtx.event = e
    e.stopPropagation()
    obj.rotation = dragCtx.rotation
    const par = dragCtx.dropCont ?? dragCtx.srcCont, ndx = (par === dragCtx.srcCont) ? dragCtx.dropNdx : par.numChildren;
    // last dropTarget CardContainer under the dragged Card  (or orig parent)
    //    console.log(stime(this, ".pressup: target.name="), e.target.name, "dropfunc?", dropfunc, " dragCtx?", dragCtx, 
    //     "\n   obj.parent=", obj.parent.name,"obj=", obj, "\n   par.name=",par.name, "(dragCtx.lastCont) par=", par,"\n   event=", e)
    if (par) {
      // Drop obj onto Parent=srcCont in apparent position:
      let inx = obj.x, iny = obj.y                    // record for debugger
      obj.parent.localToLocal(obj.x, obj.y, par, obj)
      // console.log(stime(this, ".pressup: obj="), obj.name, obj, "x=", obj.x, obj.parent.x, 
      // "\n   ", par.x, "dropParent=", par.name, par, " obj_pt=", obj_pt)
      par.addChildAt(obj, ndx); // transfer parentage from DragLayerContainer to dropTarget
    }
    if (typeof dropfunc === "function") {
      try {
        dropfunc.call(data.scope || obj.parent, obj, dragCtx);
      } catch (err) {
        let msg = "Dragger.pressup: dragfunc FAILED="
        console.error(msg, err)
        alert(msg)
      }
    }
    stage?.update();
  }
  // attach DragData to the DisplayObject that is marked as Dragable:
  getDragData(dispObj: DisplayObject): DragData { return dispObj['DragData'] }
  setDragData(dispObj: DisplayObject, data: DragData) { return dispObj['DragData'] = data; }

  /** 
   * addEventListeners for pressmove/pressup (stagemousedown/up and stagemousemove)
   * Drag this DispObj on stage.dragCont; and drop (addChild) on the orig OR new parent.
   * @param dispObj the object to become dragable
   * @param scope object to use a 'this' when calling dragfunc, dropfunc (else dispObj.parent)
   * @param dragfunc? f(dispObj|Container, dragCtx) Default: lastCont.addChild(obj)
   * @param dropfunc? f(dispObj|Container, dragCtx)
   * @param isScaleCont? set true if Container is the ScaleableContainer (a parent of this Dragger)
   */
  makeDragable(dispObj: DisplayObject,
    scope?: Object,
    dragfunc?: ((c: DisplayObject, ctx?: DragInfo) => void),
    dropfunc?: ((c: DisplayObject, ctx?: DragInfo) => void),
    isScaleCont: boolean = (dispObj === this.dragCont.parent)): this {

    // on ( type  listener  [scope]  [once=false]  [data]  [useCapture=false] )
    // https://www.createjs.com/docs/easeljs/classes/DisplayObject.html#method_on
    // we pass DragData (containing data.dragCtx) 
    // Q: should we include { target: dispObj } in DragData? (vs using event.currentTarget)

    // Note: @types SHOULD say: 
    // on(type: string, listener: (eventObj: Object, data?: any) => boolean, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;

    this.stopDragable(dispObj) // remove prior Drag listeners
    let data: DragData = { scope, dragfunc, dropfunc, isScaleCont }
    this.setDragData(dispObj, data)
    data.pressmove = dispObj.on(S.pressmove, this.pressmove as (e: MouseEvent) => void, this, false, data);
    data.pressup = dispObj.on(S.pressup, this.pressup as (e: MouseEvent) => void, this, false, data);
    //console.log(stime(this, ".makeDragable: name="), dispObj.name, "dispObj=", dispObj, "\n   cont=", cont)
    return this
  }
  /**
   * Clicking on object will initiate dragging; click again to drop.
   * @param dispObj the dragable object
   * @param value true to enable clickToDrag, false to disable;
   */
  clickToDrag(dispObj: DisplayObject, value = true) {
    this.getDragData(dispObj).clickToDrag = value;
  }
  dispatchPressup(target: DisplayObject, ctd = true) {
    let dragData = this.getDragData(target)
    dragData.clickToDrag = ctd
    let stage = target.stage, stageX = stage.mouseX, stageY = stage.mouseY
    let mouseE = { button: 0 } as NativeMouseEvent;
    // MouseEvent with faux .nativeEvent:
    let event = new MouseEvent(S.pressup, false, true, stageX, stageY, mouseE, -1, true, stageX, stageY);
    target.dispatchEvent(event, target) // set dragData.dragCtx = startDrag()
    return dragData
  }
  /** Move [dragable] target to mouse as if clickToDrag at {x,y}. */
  dragTarget(target: DisplayObject, dxy: XY = { x: 0, y: 0 }) {
    // invoke 'click' to start drag; 
    const dragData = this.dispatchPressup(target);
    // if pressup -> dragStart -> dragStop then dragCtx = undefined!
    if (!dragData.dragCtx) return;
    dragData.dragCtx.dxy = dxy;
    target.parent.globalToLocal(target.stage.mouseX, target.stage.mouseY, target); // move target to mouseXY
    target.x -= dxy.x;                // offset by dxy
    target.y -= dxy.y;
    target.stage.update();            // move and show new position
  }
  // Set .dragStopped to ignore pressmove events UNTIL there is a pressup event.
  // When clickToDrag is dragging, there will be no "pressup" to indicate end_of_drag, so emit here.
  /** 
   * Release drag target from mouse, ignore pressmove events on target until pressup. 
   * If clickToDrag(target) is dragging, invoke pressup->dropFunc; else wait for actual pressup.
   */
  stopDrag() {
    let target: DisplayObject = this.dragCont.getChildAt(0); // ASSERT dragCont has *one* child.
    if (target) {
      let dragData = this.getDragData(target)
      if (!dragData) {
        console.warn(stime(this, `.stopDrag: no target.dragData; target =`), target);
        return;
      }
      dragData.dragStopped = true; // true: pressmove->return; undefined: pressmove->dragFunc
      let ctd_is_dragging = !!dragData.clickToDrag && !!dragData.stagemousemove;
      if (ctd_is_dragging) {
        this.dispatchPressup(target); // dragData.dragStopped = undefined
      }
    }
  }

  /** prevent DisplayObject from being dragable 
   * @deprecated use stopDragable() or stopDrag()
   */
  notDragable(dispObj: DisplayObject) { dispObj[S.doNotDrag] = true }
  /** remove pressmove and pressup listenerf from dispObj. */
  stopDragable(dispObj: DisplayObject) {
    let data = this.getDragData(dispObj)
    if (!!data) {
      //console.log(stime(this, ".stopDragable: dispObj="), dispObj, data.pressmove, data.pressup)
      dispObj.removeEventListener(S.pressmove, data.pressmove)
      dispObj.removeEventListener(S.pressup, data.pressup)
      dispObj.removeEventListener(S_stagemousemove, data.stagemousemove)
      delete data.pressmove
      delete data.pressup
      delete data.isScaleCont
      delete data.clickToDrag
      this.setDragData(dispObj, undefined)
    }
    return data
  }
}
