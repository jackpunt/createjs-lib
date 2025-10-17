import { Constructor, stime } from "@thegraid/common-lib";
import { Container, DisplayObject } from "@thegraid/easeljs-module";
import { ImageGrid, PageSpec, type GridSpec } from "./image-grid";
import { NamedContainer } from "./named-container";
import { RectShape, type Paintable } from "./paintable";
// end imports


/** An exportable "Tile"; implemented by CardObject. */
export interface Tile extends DisplayObject {
  makeShape(size?: number): Paintable;
  makeBleed(bleed?: number): DisplayObject;
}

/**
 * Basic implementation, with RectShape. Example of use for TileExporter.
 */
export class TileImpl extends NamedContainer implements Tile  {

  /** RectShape; override to make any Paintable */
  makeShape(size = 100): Paintable {
    return new RectShape({ x: 0, y: 0, w: size, h: size });
  }

  /** For TileExporter. base implementation: scale up from this.makeShape() 
   * 
   * Override to suit
   * @param bleed size of bleed to add, typically from GridSpec.bleed (0)
   */
  makeBleed(bleed = 0, bleedColor = 'white'): Paintable {
    const bleedShape = this.makeShape(); // expect a RoundedRect/CardShape or TileShape/HexShape 
    bleedShape.rotation = this.rotation;
    const { x, y, width, height } = bleedShape.getBounds()
    bleedShape.scaleX = (width + 2 * bleed) / width;
    bleedShape.scaleY = (height + 2 * bleed) / height;
    // bleedShape.x -= bleed; // override if makeShape() is not centered
    // bleedShape.y -= bleed; // to align bleedShape with baseShape
    // with bounds: { x - bleed, y - bleed, width+2*bleed, height+2*bleed }
    bleedShape.paint(bleedColor, true);
    return bleedShape;
  }
}

/**
 * Claz has static if defined,
 * then rotateBack: number <of degrees of rotation> of backTile.
 */
interface Claz extends Constructor<Tile> {
  /** 0 => flip-on-horiz-axiz, 180 => flip-on-vert-axis, undefined => blank */
  rotateBack?: number | undefined; // static: indicates of a special Back tile is used
}

/** [number of copies, Constructor, ... constructor args] */
export type CountClaz = [count: number, claz: Claz, ...args: any];
export class TileExporter {

  imageGrid = new ImageGrid(() => { return this.makeImagePages() });

  /** override using clazToTemplate() to fill PageSpecs[] */
  makeImagePages() {
    const pageSpecs: PageSpec[] = [];
    return pageSpecs;
  }

  /** rotate card to align with template orientation */
  setOrientation(card: Tile, gridSpec: GridSpec, rot = 90) {
    const { width, height } = card.getBounds(), c_land = width > height;
    // determine if gridSpec area is treated as landscape:
    const t_land = gridSpec.land ?? (gridSpec.delx > gridSpec.dely);
    if (c_land !== t_land) {
      card.rotation += rot;
      if (card.cacheID) card.updateCache()
    }
  }

  /** Compose tile = new claz(...args) with bleedShape = makeBleed(tile)
   * @returns Container[bleedShape, tile]
   */
  composeTile(claz: Claz, args: any[], gridSpec: GridSpec, back = false, edge: 'L' | 'R' | 'C' = 'C') {
    const cont = new Container();

    const tile = new claz(...args);
    this.setOrientation(tile, gridSpec);
    const bleedShape = this.makeBleed(tile, gridSpec, back, edge)
    cont.addChild(bleedShape, tile);

    return cont;
  }

  /**
   * Make outer bleed for the given tile. Trim bounds if on L or R edge
   */
  makeBleed(tile: Tile, gridSpec: GridSpec, back: boolean, edge: 'L' | 'R' | 'C' = 'C') {
    const bleed = gridSpec.bleed ?? 0;
    const bleedShape = tile.makeBleed(bleed) // 0 or -10 to hide bleed

    if (gridSpec.trimLCR) { // for close-packed shapes, exclude bleed on C edges
      // trim bleedShape to base.bounds; allow extra on first/last column of row:
      const dx0 = (edge === 'L') ? bleed : 0, dw = (edge === 'R') ? bleed : 0;
      const { x, y, width, height } = tile.getBounds(), dy = -3;
      bleedShape.setBounds(x, y, width, height);
      bleedShape.cache(x - dx0, y - dy, width + dx0 + dw, height + 2 * dy);
    }
    return bleedShape;
  }

  /**
   * Append to pageSpecs; 
   * each PageSpec will contain the CanvasElement filled with Tile-Images (frontObjs & backObjs)
   * 
   * @return the given PageSpec[] extendd to hold the new pages
   */
  clazToTemplate(countClaz: CountClaz[], gridSpec = ImageGrid.hexDouble_1_19, pageSpecs: PageSpec[] = []) {
    const frontAry = [] as DisplayObject[][];
    const backAry = [] as (DisplayObject[] | undefined)[];
    const { nrow, ncol } = gridSpec, perPage = nrow * ncol;
    const double = gridSpec.double ?? true, split = gridSpec.split;
    const splitn = Math.ceil(perPage / 2); 
    const page = pageSpecs.length;
    let nt = page * perPage;
    // composeTile for each frontObj (and matching backObj) in proper orientation.
    countClaz.forEach(([count, claz, ...args]) => {
      const nreps = Math.abs(count);
      for (let i = 0; i < nreps; i++) {
        const n = nt % perPage, pagen = Math.floor(nt++ / perPage);
        const col = n % ncol, lcr = (col === 0) ? 'L' : (col === ncol - 1) ? 'R' : 'C';
        const frontTile = this.composeTile(claz, args, gridSpec, false, lcr);
        const frontAryPagen = frontAry[pagen] ?? (frontAry[pagen] = []);
        frontAryPagen.push(frontTile);
        if (double) {
          let backTile = undefined;
          if (claz.rotateBack !== undefined) {
            backTile = this.composeTile(claz, args, gridSpec, true, lcr);
            const tile = backTile.getChildAt(1); // [bleed, tile]
            tile.rotation = claz.rotateBack;
          }
          const backAryPagen = backAry[pagen] ?? (backAry[pagen] = []);
          backAryPagen.push(backTile);
        }
      }
    });
    // loop to generate series of pageSpec(canvas) to hold the given frontObjs (& backObjs if double)
    frontAry.forEach((aryFront, pagen) => {
      const aryBack = backAry[pagen];
      const frontObjs = split ? aryFront.slice(0, splitn) : aryFront; 
      const backObjs = double ? aryBack : split ? aryFront.slice(splitn) : undefined;
      const canvasId = `canvas_P${pagen}`;
      const pageSpec = { gridSpec, frontObjs, backObjs };
      pageSpecs[pagen] = pageSpec; // append new pageSpec to pageSpecs[]
      console.log(stime(this, `.makePage: canvasId=${canvasId}, pageSpec=`), pageSpec);
      this.imageGrid.makePage(pageSpec, canvasId);  // make canvas with images, but do not download [yet]
    })
    return pageSpecs;
  }

}
