import { Container } from "@thegraid/easeljs-module";

export type NamedObject = { name?: string; Aname?: string; };

/**
 * Container with a name, you can set x,y in constructor.
 *
 * Includes setBoundsNull() -> setBounds(null, 0, 0, 0) to remove previously set bounds.
 * 
 * Includes reCache() : computes new bounds and new cache.
 */
export class NamedContainer extends Container implements NamedObject {

  constructor(public Aname = 'unknown', cx = 0, cy = 0) {
    super();
    this.name = this.Aname;
    this.x = cx; this.y = cy;
  }

  /** 
   * Set bounds(null, 0, 0, 0) to remove saved bounds.
   * 
   * @types/createjs.d.ts does not include the (null, 0, 0, 0) signature 
   * 
   * Note: use setBounds(undefined, 0, 0, 0) for RectShape to calcBounds() with borders.
   */
  setBoundsNull(): void {
    super.setBounds(null as any as number, 0, 0, 0);
  }

  /** re-cache Container when children have changed size or visibility.
   *
   * uncache(), setBoundsNull(), setBounds(getBounds), maybe cache(scale)
   * 
   * @param scale for the cached image (1); if 0 then uncache & setBounds, but do not cache.
   */
  reCache(scale = 1) {
    if (this.cacheID) this.uncache();
    this.setBoundsNull(); // remove bounds
    const b = this.getBounds();    // of tileShape & InfoBox (vis or !vis, new Info)
    this.setBounds(b.x, b.y, b.width, b.height); // record for debugger
    if (scale > 0) this.cache(b.x, b.y, b.width, b.height, scale);
  }
}
