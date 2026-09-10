import { S, stime, XY } from '@thegraid/common-lib';
import { Container, DisplayObject, Matrix2D, MouseEvent } from '@thegraid/easeljs-module';
import { NamedContainer } from './named-container';

// typescript happy if we extend DisplayObject with DragData
// doNotDrag is deprecated, should be removed
declare module '@thegraid/easeljs-module' {
  interface DisplayObject {
    _DragData?: DragData;
    doNotDrag: boolean;
  }
}

/** Info about the current drag operation, shared between pressmove and dropTarget. 
 * 
 * drag context and scale info for isScaleCont
 */
export interface DragInfo {
  first: boolean,      // true on the first drag event of this dragInfo, false thereafter
  dropCont?: Container,// if set, drop in that container, instead of srcCont
  srcCont: Container,  // original obj.parent
  dropNdx: number,     // original index of obj in parent.children
  event: MouseEvent,   // latest 'pressmove' or 'click' mouseevent
  stageX0: number,     // original mouse hit: e.stageX (global coords)
  stageY0: number,
  dxy: XY;             // original offset from mouse to regXY (local coords)
  objx: number,        // obj location on parent (drag cont or stage)
  objy: number,
  scalmat: Matrix2D,   // original/current scale/translate (to detect change of scale/offset)
  targetC?: Container,     // set if dragging whole [Scaleable]Container
  targetD?: DisplayObject, // set if dragging single DisplayObject
  rotation: number,      // obj.rotation before dragging
}
const S_stagemousemove = 'stagemousemove'
// Note: @types SHOULD say: 
// on(type: string, listener: (eventObj: Object, data?: any) => boolean, scope?: Object, once?: boolean, data?: any, useCapture?: boolean): Function;
// but it elides the ", data?: any", so we use "as listener" to make typescript happy
type listener = (e: Object, data?: any) => void;
type OnHandler = Function
type DnDFunc = (c: DisplayObject | Container, ctx?: DragInfo) => void
/** attached to each dragable DisplayObject. scope.dragfunc()/dropfunc()
 * 
 * while target is being dragged: 
 * [dragInfo is set] & [dragCont.children[0] === target]
 * 
 * 3 states:
 * - !dragInfo: drag done, not dragging
 * - dragInfo.first = true  initial drag
 * - dragInfo.first = false following drags
 */
type DragData = { 
  target: DisplayObject, // object to be dragged
  scope: Object,        // 'this' for dragFunc/dropFunc()
  dragfunc: DnDFunc, 
  dropfunc: DnDFunc, 
  dragInfo?: DragInfo,    // Info about the current drag operation; shared btw pressmove & dropTarget.
  pressmove?: OnHandler,  // move target to mouseXY; call dragfunc()
  clickr?: OnHandler,     // for ctd: stagemouse drag/drop
  stagemousemove?: OnHandler, // move target for ctd
  clickToDrag?: boolean,  // true to enable ctd
  isScaleCont?: boolean,  // scaleCont needs special handling
  dragStopped?: boolean,  // true: ignore stagemouse move until "click-to-drop"
}

/** nativeEvent.buttons:
 0: No buttons pressed
 1: Primary button (usually Left click)
 2: Secondary button (usually Right click)
 4: Auxiliary button (usually Middle click / wheel)
 8: 4th button (typically Browser Back)
16: 5th button (typically Browser Forward)
*/

/**
 * expect a singleton instance to control drag/drop on a single ScalableContainer
 */
export class Dragger {
  /** should be highest Container on stage */
  dragCont: Container

  /** Utilities to handle Drag & Drop.
   *  @param  parent for this Dragger.dragCont (typically is a ScalableContainer or Stage) 
   */
  constructor(parent: Container) {
    this.dragCont = new NamedContainer('dragCont');
    parent.addChild(this.dragCont) // parented may be the ScaleableContainer
  }
  // attach DragData to the DisplayObject that is marked as Dragable:
  /** makeDragable will initialize DragData */
  getDragData(dispObj: DisplayObject): DragData { return dispObj._DragData! }
  setDragData(dispObj: DisplayObject, data?: DragData) { return dispObj._DragData = data; }

  // mouse drag events *only* available from stage/HTMLElement layer
  /**
   * Move obj to dragCont and
   * compose initial DragInfo for pressmove: { first: true, srcCont, dxy, targetD, ... }
   * 
   * dragCont.addChild(obj); dragCont.parent.setChildIndex(dragCont, numChildren-1)
   * @param event pressmove MouseEvent (for stageXY & localXY)
   * @param obj the pressmove Listener object (e.currentTarget)
   * @param data for data.isScaleCont
   * @returns DragInfo with srcCont, dxy, etc 
   */
  newDragInfo(event: MouseEvent, obj: DisplayObject, data: DragData) : DragInfo {
    const srcCont = obj.parent; // original parent
    const dropNdx = srcCont.children.indexOf(obj);
    let dragCont = this.dragCont;

    let scalmat: Matrix2D
    let targetC: Container | undefined;
    let targetD: DisplayObject | undefined;
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
    const dragInfo: DragInfo = {
      dropCont: srcCont, srcCont, dropNdx, first: true,
      event, stageX0: event.stageX, stageY0: event.stageY, objx: obj.x, objy: obj.y, scalmat, dxy,
      targetC, targetD, rotation,
    };
    return dragInfo;
  }

  /** handle 'pressmove' event on a 'dragable' DisplayObject target */
  pressmove(event: MouseEvent, data: DragData) {
    // D&D only with Left button:
    let warn = false;    // override with conditional-breakpoint
    const nevt = event.nativeEvent;
    if (nevt?.buttons === 0 && warn) debugger; // WTF? why pressmove with buttons is up?
    // if (nevt?.buttons !== 1) return;   // let someone else have it
    event.stopPropagation()
    if (data.dragStopped) return; // waiting for *real* click/pressup event. when buttons is up!

    // Event: event.target = tile.baseShape; event.currentTarget == Tile; 
    // expect data.target == event.currentTarget
    const { target: obj, scope, dragfunc } = data, stage = obj.stage;
    let dragInfo = data.dragInfo;

    // use currentTarget, so non-dragable Shapes pull whole ScaleableContainer
    if (!dragInfo) {
      // set initial DragInfo into DragData:
      dragInfo = data.dragInfo = this.newDragInfo(event, obj, data); 
      // dragInfo.first = true;
    } else {
      dragInfo.first = false;   // no longer the first
      dragInfo.event = event;   // update to current event
    }

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
      console.warn(stime(this, ".pressmove: unexpected target:"), { obj, event: event, targetC: dragInfo.targetC, targetD: dragInfo.targetC, dragInfo: { ...dragInfo } })
      return
    }
    // invoke designated dragfunc [typically table.dragFunc]
    if (dragfunc) {
      if (((typeof dragfunc) === "function")) {
        try {
          dragfunc.call(scope, obj, dragInfo); // obj.parent === dragCont
        } catch (err) {
          console.warn(stime(this, ".pressmove: dragfunc FAILED: "), dragfunc, "dragInfo=", { ...dragInfo }, "\n   err=", err)
        }
      } else {
        console.warn(stime(this, ".pressmove: dragfunc UNKNOWN:"), dragfunc, "dragInfo=", { ...dragInfo })
      }
    }
    stage?.update();
  }

  /** currently only for closing stopDrag() on a non-clickToDrag */
  pressup(event: MouseEvent, data: DragData) {
    if (event.nativeEvent.buttons !== 0) debugger;   // Assert: all buttons UP
    delete data.dragStopped;  // reset to null state
    event.stopPropagation();  //
    this.dropTarget(event, data);
  }

  // THREE callers: 
  // 1: Easeljs (event = DOM -> MouseEvent(click, ...)) could be start or stop of stagemousemove
  // 2: dragTarget (event = new MouseEvent(click, ...)) start stagemousemove
  // 3: stopDrag   (event = new MouseEvent(click, ...)) stop stagemousemove
  // ASSERT: data.clickToDrag == true
  //
  // is (!dragging) { clickToDrag -> stagemousemove -> pressmove }
  // else { (maybe remove stagemousemove) & dropTarget }
  clickr(event: MouseEvent, data: DragData) {
    if (event.nativeEvent.buttons !== 0) debugger;   // Assert: all buttons UP
    // D&D only with Left button: (note: Mac trackpad cannot switch buttons while pressed!)
    // if (event.nativeEvent?.button !== 1) return;     // was left-button UP
    // if (!data.clickToDrag) return;  // Not our problem. (let click bubble to someone who cares)

    // expect obj == e.currentTarget; the SC in phase-3
    const obj = data.target, stage = obj.stage;
    delete data.dragStopped;    // reset to original state
    event.stopImmediatePropagation();

    if (data.dragInfo) {                 // <-- isDragging
      // click to release:
      if (data.stagemousemove) {         // <-- isDragging (stageDrag)
        // Note: dragStop() may have set stopDragging, here we remove stageDrag()
        stage.removeEventListener(S_stagemousemove, data.stagemousemove)
        data.stagemousemove = undefined;
      } else {  }                        // <-- isDragging (pressmove)
      this.dropTarget(event, data);      // --> data.dropfunc.call(scope, target, info)
    } else if (data.clickToDrag) {       // <-- not dragging && (clickToDrat == true)
      // click to drag:
      // use stagemousemove to provoke pressmove()
      // mouse is NOT down; to get 'drag' events we listen for stagemousemove:
      const stageDrag = (e: MouseEvent, data: DragData) => {
        e.currentTarget = obj; // DragData.event is visible to dragFunc/dropFun/etc
        this.pressmove(e, data);
      }
      data.stagemousemove = stage.on(S_stagemousemove, stageDrag as listener, this, false, data)
      // trigger an initial event: (?)  sending 'click' to the 'pressmove' method
      this.pressmove(event, data)  // --> data.dragInfo = this.newDragInfo(event, obj, data)
    }
  }

  /** mark DragData done; dropCont.addChild(target); then invoke dropFunc(obj, info)) */
  dropTarget(event: MouseEvent, data: DragData) {
    const { target: obj, scope, dropfunc } = data;
    const dragInfo = data.dragInfo; // presumably something is dragging and dragInfo is set.
    if (!dragInfo) {
      console.warn(stime(this, `.dropTarget: no dragInfo, no target`), data);
      return;        // cannot proceed without dragInfo
    } else {
      dragInfo.event = event;  // e.nativeEvent holds button, ctrl/shift keys
    }
    data.dragInfo = undefined; // drag is done... mousebutton is up; next move requires data.first=true
    event.stopPropagation()
    obj.rotation = dragInfo.rotation
    const dropCont = dragInfo.dropCont ?? dragInfo.srcCont; // user can set alt dropCont (CardContainer!)
    const ndx = (dropCont === dragInfo.srcCont) ? dragInfo.dropNdx : dropCont.numChildren;
    if (dropCont) {
      // Drop obj onto Parent=srcCont in apparent position:
      const inx = obj.x, iny = obj.y                    // record for debugger
      obj.parent.localToLocal(obj.x, obj.y, dropCont, obj); // dragCont -> dropCont
      dropCont.addChildAt(obj, ndx); // transfer parentage from dragCont to dropCont
    } else {
      console.warn(stime(this, `.dropTarget: no dropCont for`), obj);
      obj.parent.removeChild(obj);
    }
    if (typeof dropfunc === "function") {
      try {
        dropfunc.call(scope ?? dropCont, obj, dragInfo); // dropCont b/c citymap...
      } catch (err) {
        console.warn(stime(this, ".dropTarget: dropfunc FAILED: "), dropfunc, "dragInfo=", { ...dragInfo }, "\n   err=", err)
      }
    }
    obj.stage?.update();
  }

  /** 
   * addEventListeners for pressmove/click (stagemousedown/up and stagemousemove)
   * Drag dispObj on stage.dragCont; and drop (addChild) on the orig OR new parent.
   * @param target the object to become dragable
   * @param scope object to use a 'this' when calling dragfunc, dropfunc (else dispObj.parent)
   * @param dragfunc? f(dispObj|Container, dragInfo) Default: lastCont.addChild(obj)
   * @param dropfunc? f(dispObj|Container, dragInfo)
   * @param isScaleCont? set true if dispObj is the ScaleableContainer (a parent of this Dragger)
   */
  makeDragable(target: DisplayObject,
    scope?: Object,
    dragfunc?: DnDFunc,
    dropfunc?: DnDFunc,
    isScaleCont: boolean = (target === this.dragCont.parent)): this {

    // on ( type, listener, [scope], [once=false], [data], [useCapture=false] )
    // https://www.createjs.com/docs/easeljs/classes/DisplayObject.html#method_on
    // we pass DragData (containing data.dragInfo) 
    // Q: should we include { target: dispObj } in DragData? (vs using event.currentTarget)
    this.stopDragable(target) // remove prior Drag listeners
    let data: DragData = { target, scope, dragfunc, dropfunc, isScaleCont } as DragData;
    this.setDragData(target, data)
    data.pressmove = target.on(S.pressmove, this.pressmove as listener, this, false, data);
    data.clickr = target.on(S.click, this.clickr as listener, this, false, data);
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
   * queue a click event with nativeEvent = { button: 1, buttons: 0} (Left-button-UP)
   *
   * @param target 
   * @param ctd [true] initiate dragging of target
   * @returns target.DragData
   */
  dispatchClick(target: DisplayObject) {
    let dragData = this.getDragData(target)
    let stage = target.stage, stageX = stage.mouseX, stageY = stage.mouseY
    let mouseE = { button: 1, buttons: 0 } as NativeMouseEvent;
    // MouseEvent with faux .nativeEvent:
    let event = new MouseEvent(S.click, false, true, stageX, stageY, mouseE, -1, true, stageX, stageY);
    target.dispatchEvent(event, target) // set dragData.dragInfo = newDragInfo()
    return dragData
  }

  /**
   * like dispatchClick(), but invokes this.start_stop_stagemousemove() directly
   * @param target 
   * @returns target.DragData
   */
  invokeClickr(target: DisplayObject) {
    let dragData = this.getDragData(target)
    let stage = target.stage, stageX = stage.mouseX, stageY = stage.mouseY
    let mouseE = { button: 1, buttons: 0 } as NativeMouseEvent;
    // MouseEvent with faux .nativeEvent:
    let event = new MouseEvent(S.click, false, true, stageX, stageY, mouseE, -1, true, stageX, stageY);
    event.currentTarget = target;
    this.clickr(event, dragData) // set dragData.dragCtx = startDrag()
    return dragData;
  }

  /** Move [dragable] target to mouse at {x,y}, and enable stagemousemove.
   * 
   * only works for ctd objects. mouse is up and we pretend to click on it to start dragging
   * 
   * TODO: require the latest 'event', and use pressmove or stagemousemove depending on event.buttons
   * or hack into Dispatcher._pointerData resetting o.target while mouse down and dragging!?
   * 
   */
  dragTarget(target: DisplayObject, dxy: XY = { x: 0, y: 0 }) {
    const dragData = this.getDragData(target);
    // invoke clickr to start drag --> pressmove --> dragStart() [maybe: stopDrag() --> dropTarget() ]
    this.invokeClickr(target);  // toggle dragging (expect --> startDrag)
    // if clickr -> dragStart -> stopDrag[stopDragging=true] -> dropTarget[dragInfo = undefined]
    if (!dragData.dragInfo) return;  // dragStop: target does not want to be dragged
    dragData.dragInfo.dxy = dxy;
    target.parent.globalToLocal(target.stage.mouseX, target.stage.mouseY, target); // move target to mouseXY
    target.x -= dxy.x * target.scaleX; // offset by dxy
    target.y -= dxy.y * target.scaleY; // assert: target is under mouse (so can click to drop)
    target.stage.update();            // move and show new position
  }

  // Set dragData.dragStopped = true; to ignore pressmove events UNTIL dropTarget().
  // When clickToDrag is dragging, there will be no "click" to indicate end_of_drag, so emit here.
  /** 
   * Preemptively release drag target from mouse. 
   * 
   * ignore pressmove events on target until ctd ? click : pressup
   * 
   * If clickToDrag(target) is dragging, invoke click->dropFunc; else wait for actual click.
   * 
   * @param warn [false] set true for console.warn if target is not dragCont.children[0]
   */
  stopDrag(warn = false) {
    const target = this.dragCont.getChildAt(0); // ASSERT dragCont has *one* child.
    if (!target && warn) {
      console.warn(stime(this, `.stopDrag: target not on dragCont; target =`), target);
      return;
    }
    const dragData = this.getDragData(target);
    if (!dragData) {
      console.warn(stime(this, `.stopDrag: no target.dragData; target =`), target);
      return;
    }
    // arrange for Release: 
    if (!!dragData.clickToDrag && !!dragData.stagemousemove) {
        // ctd w/stagemousemove needs 'click' to drop [provide it now]
        this.invokeClickr(target); // releas stageDrag
    } else {
      // pressmove needs 'presup' [listen for it]
      dragData.dragStopped = true; // true: pressmove->return; undefined: pressmove->dragFunc
      // watch for mouseup, and cancel the drag status:
      target.on(S.pressup, this.pressup as any, this, true, dragData);
    }
  }

  /** prevent DisplayObject from being dragged.
   * @deprecated use stopDragable() or stopDrag(); override Tile.makeDragable(table)
   */
  notDragable(dispObj: DisplayObject) { dispObj.doNotDrag = true }

  /** remove on('pressmove'), on('click'), on('stagemousemove') listeners from dispObj 
   * 
   * Note: if dispObj is being dragged, use stopDrag() before stopDragable().
   */
  stopDragable(dispObj: DisplayObject) {
    let data = this.getDragData(dispObj)
    if (!!data) {
      //console.log(stime(this, ".stopDragable: dispObj="), dispObj, data.pressmove, data.clickr)
      dispObj.removeEventListener(S.pressmove, data.pressmove!)
      dispObj.removeEventListener(S.click, data.clickr!)
      dispObj.removeEventListener(S_stagemousemove, data.stagemousemove!)
      delete data.pressmove
      delete data.clickr
      delete data.isScaleCont
      delete data.clickToDrag
      this.setDragData(dispObj, undefined)
    }
    return data
  }
}
