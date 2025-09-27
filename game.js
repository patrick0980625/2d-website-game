import { startHouse } from "./scene/startHouse";
import { normalHouse } from "./scene/normalHouse";
import { world } from "./scene/world";

const config = {
  type: Phaser.AUTO,

  scene: [startHouse, normalHouse, world],
};

const game = new Phaser.Game(config);
