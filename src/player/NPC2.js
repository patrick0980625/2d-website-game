import NPC from './NPC.js';

export default class NPC2 extends NPC {
  constructor(scene, x, y) {
    super(scene, x, y, 'npc_2', 'The broccoli chicken cursed us, so we cannot stop hoeing...', "I just can't stop farming now!", "Titi");

    this.direction = 'down';
    this.flipX = false;
    this.play('npc_2-hoe-down', true);
  }

  static createAnimations(scene) {
    const animations = [
      ["hoe", 'down', 0, 6],
      ["hoe", 'side', 1, 6],
      ["hoe", 'up', 2, 6],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `npc_2-${action}-${direction}` : `npc_2-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('npc_2', {
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