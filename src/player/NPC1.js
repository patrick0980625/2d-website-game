import NPC from './NPC.js';

export default class NPC1 extends NPC {
  constructor(scene, x, y) {
    super(scene, x, y, 'npc_1', 'We are controlled by the broccoli chicken!\nDefeated it to free us from farming!', "Thank you!\nBut I think I don't hate farming now.", 'James');

    this.direction = 'side';
    this.flipX = true;
    this.play('npc_1-hoe-side', true);
  }

  static createAnimations(scene) {
    const animations = [
      ["hoe", 'down', 0, 6],
      ["hoe", 'side', 1, 6],
      ["hoe", 'up', 2, 6],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `npc_1-${action}-${direction}` : `npc_1-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('npc_1', {
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