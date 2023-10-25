import { F } from "@thegraid/common-lib";
import { Text } from '@thegraid/easeljs-module';

export class CenterText extends Text {
  static defaultSize = 30;
  constructor(text?: string, size = CenterText.defaultSize, color?: string) {
    super(text, F.fontSpec(size), color);
    this.textAlign = 'center';
    this.textBaseline = 'middle';
  }
}
