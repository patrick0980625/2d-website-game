import Phaser from 'phaser';
import AnimatedTiles from 'phaser-animated-tiles';
import PreloadScene from './scenes/PreloadScene.js';
import WorldScene from './scenes/WorldScene.js';

/** @type {Phaser.Types.Core.GameConfig} */
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: {y: 0},
      debug: true,
    },
  },
  plugins: {
    scene: [
      {
        key: 'animatedTiles',
        plugin: AnimatedTiles,
        mapping: 'animatedTiles'
      }
    ]
  },
  scene: [PreloadScene, WorldScene]
}

const game = new Phaser.Game(config);