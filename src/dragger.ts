import { Container, DisplayObject, MouseEvent, Matrix2D } from 'createjs-module';
import { XY, S, Obj, stime } from '.';

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
      console.log(stime(this), msg, ...args);
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
  nameD: string,       // name from DispObj (Card)
  srcCont: Container,  // original obj.parent (expect CardContainer)
  lastCont: Container, // latest 'dropTarget' updated when over legal dropTarget
  event: MouseEvent,   // latest 'pressmove' or 'pressup' mouseevent
  eventX: number,      // original mouse hit: e.stageX (global coords)
  eventY: number,
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
}
function getDragData(dispObj: DisplayObject): DragData { return dispObj['DragData'] }
function setDragData(dispObj: DisplayObject, data: DragData) { return dispObj['DragData'] = data; }

/**
 * expect a singleton instance to control drag/drop on a single ScalableContainer
 * 
 * TODO: make instance rather than everthing static.
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
   * @param e pressmove MouseEvent
   * @param obj e.currentTarget (the pressmove Listener object)
   * @returns 
   */
  startDrag(e: MouseEvent, obj: DisplayObject | Container, data: DragData) : DragInfo {
    // console.log(stime(this, ".pressmove: target.name="), e.target.name, "dragfunc?", dragfunc,
    // "\n   obj=", obj, "\n   event=", e)
    let par: Container = obj.parent; // original parent
    let dragCont: Container = this.dragCont;

    let scalmat: Matrix2D
    let targetC: Container;
    let targetD: DisplayObject;
    let rotation: number = obj.rotation
    obj.rotation = 0    // else dragging goes backward due to obj.concatMatrix

    let dxy = { x: e.localX - obj.regX, y: e.localY - obj.regY }  // offset from mouse to regXY(0,0)

    // for Citymap, all CardContainers are mouse-transparent, so obj == ScaleableContainer, obj.parent == stage
    if ((obj instanceof Container) && data.isScaleCont) {
      // Drag the whole [Scaleable]Container 
      // (cannot add to DragCont, because DragCont is child of ScaleableContainer!)
      // [obj == sc, THE instanceof ScaleableContainer], this.parent == stage
      // TODO: have DragCont NOT in ScaleableContainer: listen for scale events, localToLocal coords
      targetC = (obj as Container)
      par.setChildIndex(obj, par.numChildren - 1) // bring to top
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
      nameD: obj.name, lastCont: par, srcCont: par, first: true,
      event: e, eventX: e.stageX, eventY: e.stageY, objx: obj.x, objy: obj.y, scalmat: scalmat, dxy: dxy,
      targetC: targetC, targetD: targetD, rotation: rotation
    } as DragInfo
    //console.log(stime(this, ".pressmove: dragCtx.lastCont.name="), dragCtx.lastCont.name, dragCtx)
    //console.log(stime(this, ".pressmove: dragCtx="), dragCtx, "\n   event=", e, dragfunc)
  }

  pressmove(e: MouseEvent, data: DragData) {
    let { dragfunc, dragCtx } = data
    if (e.target[S.doNotDrag]) return
    // use currentTarget, so non-dragable Shapes pull whole ScaleableContainer
    let obj: DisplayObject | Container = e.currentTarget;
    if (!dragCtx) {
      Dragole.reset(-1) // *first* (next) log will trigger
      dragCtx = this.startDrag(e, obj, data)
    } else {
      dragCtx.first = false
      dragCtx.event = e
    }
    /** move the whole scaleContainer, adjusting when it gets scaled. */
    let moveScaleCont = (sc: Container, e: MouseEvent) => {
      // dragCont is child of obj == ScaleableConter:
      let dx = e.stageX - dragCtx.eventX
      let dy = e.stageY - dragCtx.eventY
      let oscalmat = dragCtx.scalmat
      let nscalmat = sc.getConcatenatedMatrix()
      if (nscalmat.a != oscalmat.a) { // SC has been zoomed (and offset!)
        dragCtx.objx = sc.x - dx
        dragCtx.objy = sc.y - dy
        dragCtx.scalmat = nscalmat
      }

      sc.x = dragCtx.objx + dx
      sc.y = dragCtx.objy + dy
      // obj.stage.update()
      //console.log(stime(this, ".moveCont:"), {orig, e, pt, sx: obj.scaleX, obj})
    }

    e.stopPropagation()
    // move obj to follow mouse:
    if (obj == dragCtx.targetC) {
      moveScaleCont(obj as Container, e)   // typically: the whole ScaleableContainer
    } else if (obj == dragCtx.targetD) {
      obj.parent.globalToLocal(e.stageX, e.stageY, obj)
      obj.x -= dragCtx.dxy.x;
      obj.y -= dragCtx.dxy.y
    } else {
      Dragole.logEvent("unexpected currentTarget: " + obj.name);
      console.log(stime(this, ".pressmove: unexpected target:"), { obj, event: e, targetC: dragCtx.targetC, targetD: dragCtx.targetC, dragCtx: Obj.fromEntriesOf(dragCtx) })
      return
    }
    //console.log(stime(this, ".pressmove: obj.x="), obj.x, "obj.y=", obj.y, "evt_pt=", evt_pt, "\n   event=", e, "\n   obj=",obj, "\n    dragCtx=", dragCtx)
    if (dragfunc) {
      if (((typeof dragfunc) === "function")) {
        try {
          dragfunc.call(data.scope || obj.parent, obj, dragCtx)
        } catch (err) {
          Dragole.logEvent("dragfunc FAILED");
          console.log(stime(this, ".pressmove: dragfunc FAILED: "), dragfunc, "dragCtx=", Obj.fromEntriesOf(dragCtx), "\n   err=", err)
        }
      } else {
        Dragole.logEvent("dragfunc UNKNOWN");
        console.log(stime(this, ".pressmove: dragfunc UNKNOWN:"), dragfunc, "dragCtx=", Obj.fromEntriesOf(dragCtx))
      }
    }
    obj.stage.update();
  }

  pressup(e: MouseEvent, data: DragData) {
    let { dropfunc, dragCtx } = data
    let obj: DisplayObject | Container = e.currentTarget // the SC in phase-3
    data.dragCtx = undefined; // drag is done...
    let stage = obj.stage
    if (data.clickToDrag && data.stagemousemove) {
      stage.removeEventListener(S_stagemousemove, data.stagemousemove)
    }
    if (!dragCtx) {
      //console.log(stime(this, ".pressup: (no dragCtx) click event="), { e, clickToDrag })
      if (!!data.clickToDrag) {
        let stageDrag = (e: MouseEvent, data: DragData) => {
          e.currentTarget = obj
          this.pressmove(e, data)
        }
        this.pressmove(e, data)  // data.dragCtx = startDrag()
        data.stagemousemove = stage.on(S_stagemousemove, stageDrag, this, false, data)
      }
      return     // a click, not a Drag+Drop
    }
    dragCtx.event = e
    e.stopPropagation()
    obj.rotation = dragCtx.rotation
    let par = dragCtx.lastCont || dragCtx.srcCont
    // last dropTarget CardContainer under the dragged Card  (or orig parent)
    //    console.log(stime(this, ".pressup: target.name="), e.target.name, "dropfunc?", dropfunc, " dragCtx?", dragCtx, 
    //     "\n   obj.parent=", obj.parent.name,"obj=", obj, "\n   par.name=",par.name, "(dragCtx.lastCont) par=", par,"\n   event=", e)
    if (par) {
      // Drop obj onto Parent=lastCont in apparent position:
      let inx = obj.x, iny = obj.y                    // record for debugger
      obj.parent.localToLocal(obj.x, obj.y, par, obj)
      // console.log(stime(this, ".pressup: obj="), obj.name, obj, "x=", obj.x, obj.parent.x, 
      // "\n   ", par.x, "dropParent=", par.name, par, " obj_pt=", obj_pt)
      par.addChild(obj); // transfer parentage from DragLayerContainer to dropTarget
    }
    if (typeof (dropfunc) === "function") {
      try {
        dropfunc.call(data.scope || obj.parent, obj, dragCtx);
      } catch (err) {
        let msg = "Dragger.pressup: dragfunc FAILED="
        console.error(msg, err)
        alert(msg)
      }
    }
    obj.stage.update();
  }
  /** 
 * addEventListeners for pressmove/pressup (stagemousedown/up and stagemousemove)
 * Drag this DispObj on stage.dragCont; and drop (addChild) on the orig OR new parent.
 * @param dispObj the object to become dragable
 * @param scope object to use a 'this' when calling dragfunc, dropfunc (else dispObj.parent)
 * @param dragfunc? f(dispObj|Container, dragCtx) Default: lastCont.addChild(obj)
 * @param dropfunc? f(dispObj|Container, dragCtx)
 * @param isScaleCont? set true if Container is the ScaleableContainer (a parent of this Dragger)
 */
  makeDragable(dispObj: DisplayObject | Container,
    scope?: Object,
    dragfunc?: ((c: DisplayObject | Container, ctx?: DragInfo) => void),
    dropfunc?: ((c: DisplayObject | Container, ctx?: DragInfo) => void),
    isScaleCont: boolean = (dispObj === this.dragCont.parent)): this {

    // on ( type  listener  [scope]  [once=false]  [data]  [useCapture=false] )
    // https://www.createjs.com/docs/easeljs/classes/DisplayObject.html#method_on
    // we *could* pass dragCtx or cont as [data] ??
    // but closure binding works just fine.

    this.stopDragable(dispObj) // remove prior Drag listeners
    let data: DragData = { scope, dragfunc, dropfunc, isScaleCont }
    setDragData(dispObj, data)
    data.pressmove = dispObj.on(S.pressmove, this.pressmove, this, false, data);
    data.pressup = dispObj.on(S.pressup, this.pressup, this, false, data);
    //console.log(stime(this, ".makeDragable: name="), dispObj.name, "dispObj=", dispObj, "\n   cont=", cont)
    return this
  }
  clickToDrag(dispObj: DisplayObject, value = true) {
    getDragData(dispObj).clickToDrag = value;
  }

  /** prevent DisplayObject from being dragable */
  notDragable(dispObj: DisplayObject) { dispObj[S.doNotDrag] = true }
  /** remove pressmove and pressup listenerf from dispObj. */
  stopDragable(dispObj: DisplayObject) {
    let data = getDragData(dispObj)
    if (!!data) {
      //console.log(stime(this, ".stopDragable: dispObj="), dispObj, data.pressmove, data.pressup)
      dispObj.removeEventListener(S.pressmove, data.pressmove)
      dispObj.removeEventListener(S.pressup, data.pressup)
      dispObj.removeEventListener(S_stagemousemove, data.stagemousemove)
      delete data.pressmove
      delete data.pressup
      delete data.isScaleCont
      delete data.clickToDrag
      setDragData(dispObj, undefined)
    }
    return data
  }
}
