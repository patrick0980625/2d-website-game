import { startScene } from "./startScene.js";
import { gameScene } from "./gameScene.js";

const config = {
  type: Phaser.AUTO,
  width: '100%',
  height: '100%',
  backgroundColor: "#77EE00",
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scene: [startScene, gameScene],
};

const game = new Phaser.Game(config);
