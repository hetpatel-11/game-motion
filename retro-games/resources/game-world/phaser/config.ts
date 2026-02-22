import Phaser from "phaser";
import { GameScene } from "./GameScene";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,
    width: 160,
    height: 160,
    parent,
    pixelArt: true,
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: false,
    },
    audio: {
      noAudio: true,
    },
    banner: false,
  };
}
