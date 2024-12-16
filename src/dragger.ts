import { Container, DisplayObject, MouseEvent, Matrix2D } from '@thegraid/easeljs-module';
import { XY, S, Obj, stime } from '@thegraid/common-lib';

/** Info about the current drag operation, shared between pressmove(s) and pressup. 
 * 
 * drag context and scale info for isScaleCont
 */
export interface DragInfo {
  first: boolean,      // true on the first drag event of this dragInfo, false thereafter
  dropCont?: Container,// if set, drop in that container, instead of srcCont
  srcCont: Container,  // original obj.parent
  dropNdx: number,     // original index of obj in parent.children
  event: MouseEvent,   // latest 'pressmove' or 'pressup' mouseevent
  stageX0: number,     // original mouse hit: e.stageX (global coords)
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
// Note: @types SHOULD say: 
// on(type: string, listener: (eventObj: Object, data?: any) => boolean, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
// but it elides the ", data?: any", so we use "as listener" to make typescript happy
type listener = (e: MouseEvent) => void;
type OnHandler = Function
type DnDFunc = (c: DisplayObject | Container, ctx?: DragInfo) => void
/** attached to each dragable DisplayObject. scope.dragfunc()/dropfunc()
 * 
 * [dragInfo is set while dispObj is being dragged]
 * [also: dragCont.getChild(1) === dispObj]
 */
type DragData = { 
  target: DisplayObject, // object to be dragged
  scope: Object,        // 'this' for dragFunc/dropFunc()
  dragfunc: DnDFunc, 
  dropfunc: DnDFunc, 
  dragInfo?: DragInfo, 
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
  /**
   * Move obj to dragCont and
   * compose initial DragInfo for pressmove: { first: true, srcCont, dxy, targetD, ... }
   * 
   * dragCont.addChild(obj); dragCont.parent.setChildIndex(dragCont, numChildren-1)
   * @param event pressmove MouseEvent (for stageXY & localXY)
   * @param obj e.currentTarget (the pressmove Listener object)
   * @returns DragInfo with srcCont, dxy, etc 
   */
  newDragInfo(event: MouseEvent, obj: DisplayObject, data: DragData) : DragInfo {
    const srcCont = obj.parent; // original parent
    const dropNdx = srcCont.children.indexOf(obj);
    let dragCont = this.dragCont;

    let scalmat: Matrix2D
    let targetC: Container;
    let targetD: DisplayObject;
    let rotation: number = obj.rotation
    obj.rotation = 0    // else dragging goes backward due to obj.concatMatrix

    const dxy = { x: event.localX - obj.regX, y: event.localY - obj.regY } // delta from obj's origin to mouse

    // for Citymap, all CardContainers are mouse-transparent, so obj == ScaleableContainer, obj.parent == stage
    if ((obj instanceof Container) && data.isScaleCont) {
      // Drag the whole [Scaleable]Container 
      // (cannot dragCont.addChild(obj), because dragCont is child of obj==ScaleableContainer!)
      // [obj == SC, THE instanceof ScaleableContainer], obj.parent == stage
      // TODO: have dragCont NOT in ScaleableContainer: listen for scale events, localToLocal coords
      targetC = (obj as Container)
      srcCont.setChildIndex(obj, srcCont.numChildren - 1) // return to orig position; user can addChild...
    } else {
      // obj is any DispObj [Card as Container or PlayerMarker]
      targetD = obj;
      obj.parent.localToLocal(obj.x, obj.y, dragCont, obj)    // offset to dragCont
      dragCont.addChild(obj)                                  // assert: only 1 child in dragCont
      dragCont.parent.setChildIndex(dragCont, dragCont.parent.numChildren - 1) // dragCont to top of SC
    }
    scalmat = obj.getConcatenatedMatrix()   // record original scale and offsets
    // in all cases, set data.dragInfo
    const dragInfo = {
      dropCont: srcCont, srcCont, dropNdx, first: true,
      event, stageX0: event.stageX, stageY0: event.stageY, objx: obj.x, objy: obj.y, scalmat, dxy,
      targetC, targetD, rotation,
    } as DragInfo;
    return dragInfo;
  }

  /** handle 'pressmove' event on a 'dragable' DisplayObject target */
  pressmove(event: MouseEvent, data: DragData) {
    // expect data.target == event.currentTarget
    const { target: obj, scope, dragfunc } = data, stage = obj.stage;
    let dragInfo = data.dragInfo;
    // TODO: remove this, client to use stopDrag(), so mouse state is stable.
    // if (event.target[S.doNotDrag]) return
    // not sure button check is working:
    if (event.nativeEvent?.button !== 0) return;
    // use currentTarget, so non-dragable Shapes pull whole ScaleableContainer
    if (!dragInfo) {
      // set initial DragInfo into DragData:
      dragInfo = data.dragInfo = this.newDragInfo(event, obj, data); // dragInfo.first = true;
    } else {
      dragInfo.first = false
      dragInfo.event = event
    }
    event.stopPropagation()
    if (data.dragStopped) return; // waiting for *real* pressup event.

    // move obj to follow mouse:
    if (obj == dragInfo.targetC) {
      // moveScaleContainer: adjusting if scale changes
      const sc = obj;     // dragCont is child of obj == ScaleableConter:
      let dx = event.stageX - dragInfo.stageX0 // (stageX - stageX0)
      let dy = event.stageY - dragInfo.stageY0
      let oscalmat = dragInfo.scalmat
      let nscalmat = sc.getConcatenatedMatrix()
      if (nscalmat.a != oscalmat.a) { // SC has been zoomed (and offset!)
        dragInfo.objx = sc.x - dx      // move sc back at current/original scale
        dragInfo.objy = sc.y - dy
        dragInfo.scalmat = nscalmat    // record new scale
      }
      sc.x = dragInfo.objx + dx        // move sc by dxy relative to original position?
      sc.y = dragInfo.objy + dy
    } else if (obj == dragInfo.targetD) {
      obj.parent.globalToLocal(event.stageX, event.stageY, obj) // move obj to stageX, stageY
      obj.x -= dragInfo.dxy.x * obj.scaleX;       // offset by dxy
      obj.y -= dragInfo.dxy.y * obj.scaleY;
    } else {
      console.warn(stime(this, ".pressmove: unexpected target:"), { obj, event: event, targetC: dragInfo.targetC, targetD: dragInfo.targetC, dragInfo: Obj.fromEntriesOf(dragInfo) })
      return
    }
    // invoke designated dragfunc [typically table.dragFunc]
    if (dragfunc) {
      if (((typeof dragfunc) === "function")) {
        try {
          dragfunc.call(scope, obj, dragInfo); // obj.parent === dragCont
        } catch (err) {
          console.warn(stime(this, ".pressmove: dragfunc FAILED: "), dragfunc, "dragInfo=", Obj.fromEntriesOf(dragInfo), "\n   err=", err)
        }
      } else {
        console.warn(stime(this, ".pressmove: dragfunc UNKNOWN:"), dragfunc, "dragInfo=", Obj.fromEntriesOf(dragInfo))
      }
    }
    stage?.update();
  }

  // is (!dragging) { clickToDrag -> stagemousemove -> pressmove }
  // else { drop (& maybe remove stagemousemove) }
  pressup(event: MouseEvent, data: DragData) {
    // expect obj == e.currentTarget; the SC in phase-3
    const { target: obj, scope, dropfunc } = data, stage = obj.stage;
    let dragInfo = data.dragInfo;
    data.dragInfo = undefined; // drag is done... mousebutton is up
    data.dragStopped = false; // indicates that it *was* stopped by pressup vs undefined (never stopped)
    if (data.clickToDrag && data.stagemousemove) {
      // click to release:
      stage.removeEventListener(S_stagemousemove, data.stagemousemove)
      data.stagemousemove = undefined;
    }
    if (!dragInfo) {
      // pressup without a dragInfo: a click; 
      // if data.clickToDrag use stagemousemove to provoke pressmove()
      if (data.clickToDrag && event.nativeEvent.button === 0) {
        // mouse is NOT down; to get 'drag' events we listen for stagemousemove:
        let stageDrag = (e: MouseEvent, data?: DragData) => {
          e.currentTarget = obj
          this.pressmove(e, data)
        }
        data.stagemousemove = stage.on(S_stagemousemove, stageDrag, this, false, data)
        this.pressmove(event, data)  // --> data.dragInfo = this.newDragInfo(event, obj, data)
      }
      return     // a click, not a Drag+Drop
    }
    dragInfo.event = event;  // e.nativeEvent holds button, ctrl/shift keys
    event.stopPropagation()
    obj.rotation = dragInfo.rotation
    const dropCont = dragInfo.dropCont ?? dragInfo.srcCont; // user can set alt dropCont (CardContainer!)
    const ndx = (dropCont === dragInfo.srcCont) ? dragInfo.dropNdx : dropCont.numChildren;
    if (dropCont) {
      // Drop obj onto Parent=srcCont in apparent position:
      let inx = obj.x, iny = obj.y                    // record for debugger
      obj.parent.localToLocal(obj.x, obj.y, dropCont, obj); // dragCont -> dropCont
      dropCont.addChildAt(obj, ndx); // transfer parentage from dragCont to dropCont
    } else {
      console.warn(stime(this, `.pressup: no dropCont for`), obj);
      obj.parent.removeChild(obj);
    }
    if (typeof dropfunc === "function") {
      try {
        dropfunc.call(scope ?? dropCont, obj, dragInfo); // dropCont b/c citymap...
      } catch (err) {
        console.warn(stime(this, ".pressup: dropfunc FAILED: "), dropfunc, "dragInfo=", Obj.fromEntriesOf(dragInfo), "\n   err=", err)
      }
    }
    stage?.update();
  }
  // attach DragData to the DisplayObject that is marked as Dragable:
  getDragData(dispObj: DisplayObject): DragData { return dispObj['DragData'] }
  setDragData(dispObj: DisplayObject, data: DragData) { return dispObj['DragData'] = data; }

  /** 
   * addEventListeners for pressmove/pressup (stagemousedown/up and stagemousemove)
   * Drag dispObj on stage.dragCont; and drop (addChild) on the orig OR new parent.
   * @param target the object to become dragable
   * @param scope object to use a 'this' when calling dragfunc, dropfunc (else dispObj.parent)
   * @param dragfunc? f(dispObj|Container, dragInfo) Default: lastCont.addChild(obj)
   * @param dropfunc? f(dispObj|Container, dragInfo)
   * @param isScaleCont? set true if dispObj is the ScaleableContainer (a parent of this Dragger)
   */
  makeDragable(target: DisplayObject,
    scope?: Object,
    dragfunc?: ((c: DisplayObject, ctx?: DragInfo) => void),
    dropfunc?: ((c: DisplayObject, ctx?: DragInfo) => void),
    isScaleCont: boolean = (target === this.dragCont.parent)): this {

    // on ( type, listener, [scope], [once=false], [data], [useCapture=false] )
    // https://www.createjs.com/docs/easeljs/classes/DisplayObject.html#method_on
    // we pass DragData (containing data.dragInfo) 
    // Q: should we include { target: dispObj } in DragData? (vs using event.currentTarget)
    this.stopDragable(target) // remove prior Drag listeners
    let data: DragData = { target, scope, dragfunc, dropfunc, isScaleCont }
    this.setDragData(target, data)
    data.pressmove = target.on(S.pressmove, this.pressmove as listener, this, false, data);
    data.pressup = target.on(S.pressup, this.pressup as listener, this, false, data);
    return this;
  }
  /**
   * Clicking on object will initiate dragging; click again to drop.
   * @param dispObj the dragable object
   * @param value [true] to enable clickToDrag, false to disable;
   */
  clickToDrag(dispObj: DisplayObject, value = true) {
    this.getDragData(dispObj).clickToDrag = value;
  }
  /**
   * queue a pressup event with nativeEvent = { button: 0}
   *
   * @param target 
   * @param ctd [true] initiate dragging of target
   * @returns target.DragData
   */
  dispatchPressup(target: DisplayObject, ctd = true) {
    let dragData = this.getDragData(target)
    dragData.clickToDrag = ctd
    let stage = target.stage, stageX = stage.mouseX, stageY = stage.mouseY
    let mouseE = { button: 0 } as NativeMouseEvent;
    // MouseEvent with faux .nativeEvent:
    let event = new MouseEvent(S.pressup, false, true, stageX, stageY, mouseE, -1, true, stageX, stageY);
    target.dispatchEvent(event, target) // set dragData.dragInfo = newDragInfo()
    return dragData
  }

  // TODO: see if invokePressup works better than dispatchPressup
  /**
   * like dispatchPressup(), but invokes this.pressup() as method
   * @param target 
   * @param ctd [true] initiate clickToDrag
   * @returns target.DragData
   */
  invokePressup(target: DisplayObject, ctd = true) {
    let dragData = this.getDragData(target)
    dragData.clickToDrag = ctd;
    let stage = target.stage, stageX = stage.mouseX, stageY = stage.mouseY
    let mouseE = { button: 0 } as NativeMouseEvent;
    // MouseEvent with faux .nativeEvent:
    let event = new MouseEvent(S.pressup, false, true, stageX, stageY, mouseE, -1, true, stageX, stageY);
    event.currentTarget = target;
    this.pressup(event, dragData) // set dragData.dragCtx = startDrag()
    return dragData;
  }

  /** Move [dragable] target to mouse as if clickToDrag at {x,y}. */
  dragTarget(target: DisplayObject, dxy: XY = { x: 0, y: 0 }) {
    // invoke 'click' to start drag; 
    const dragData = this.dispatchPressup(target);
    // if pressup -> dragStart -> dragStop then dragInfo = undefined!
    if (!dragData.dragInfo) return;  // dragStop: target does not want to be dragged
    dragData.dragInfo.dxy = dxy;
    target.parent.globalToLocal(target.stage.mouseX, target.stage.mouseY, target); // move target to mouseXY
    target.x -= dxy.x;                // offset by dxy
    target.y -= dxy.y;                // assert: target is under mouse (so can click to drop)
    target.stage.update();            // move and show new position
  }
  // Set .dragStopped to ignore pressmove events UNTIL there is a pressup event.
  // When clickToDrag is dragging, there will be no "pressup" to indicate end_of_drag, so emit here.
  /** 
   * Release drag target from mouse, ignore pressmove events on target until pressup. 
   * If clickToDrag(target) is dragging, invoke pressup->dropFunc; else wait for actual pressup.
   */
  stopDrag() {
    const target = this.dragCont.getChildAt(0); // ASSERT dragCont has *one* child.
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
