import { F } from "@thegraid/common-lib";
import { Text } from '@thegraid/easeljs-module';

/**
 * Text with textAlign = 'center'; textBaseline = 'middle'.
 */
export class CenterText extends Text {
  static defaultSize = 30;
  /**
   * Text with textAlign = 'center'; textBaseline = 'middle'.
   * @param text 
   * @param font simple size OR F.Fontspec(size, fam_wght, wght, style)
   * @param color 
   */
  constructor(text?: string, font: number | string = CenterText.defaultSize, color?: string) {
    super(text, (typeof font === 'number') ? F.fontSpec(font) : font, color);
    this.textAlign = 'center';
    this.textBaseline = 'middle';
  }
}
