import NPC from './NPC.js';

export default class NPC3 extends NPC {
  constructor(scene, x, y) {
    super(scene, x, y, 'npc_3', 'Do you know why I look just like the person above me?\nBecause we are twins :)', "I just want to ...\n\nI don't know what to do.", "Kiki");

    this.direction = 'side';
    this.flipX = false;
    this.play('npc_3-hoe-down', true);
  }

  static createAnimations(scene) {
    const animations = [
      ["hoe", 'down', 0, 6],
      ["hoe", 'side', 1, 6],
      ["hoe", 'up', 2, 6],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `npc_3-${action}-${direction}` : `npc_3-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('npc_3', {
            start: row * 6,
            end: row * 6 + frameCount - 1,
          }),
          frameRate: 10,
          repeat: -1,
        })
      }
    })
  }

  update() {
    this.setDepth(this.y + 5);
  }
}