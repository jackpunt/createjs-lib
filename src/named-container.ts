import { Container } from "@thegraid/easeljs-module";

export type NamedObject = { name?: string; Aname?: string; };

/**
 * Container with a name, you can set x,y in constructor.
 *
 * Includes setBoundsNull() -> setBounds(null, 0, 0, 0)
 */
export class NamedContainer extends Container implements NamedObject {

  constructor(public Aname = 'unknown', cx = 0, cy = 0) {
    super();
    this.name = this.Aname;
    this.x = cx; this.y = cy;
  }

  /** because @types/createjs.d.ts does not include the (null, 0 ,0, 0) signature */
  setBoundsNull(): void {
    super.setBounds(null as any as number, 0, 0, 0);
  }
}
