export default class NPC extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, texture, idleDialog, bossDefeatedDialog, npcName) {
    super(scene.matter.world, x, y, texture);
    scene.add.existing(this);

    this.setOrigin(0.5, 0.5);
    this.setRectangle(10, 4, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.1}},
    });

    this.setStatic(true);
    this.setFixedRotation();

    this.npcName = npcName;
    this.idleDialog = idleDialog;
    this.bossDefeatedDialog = bossDefeatedDialog;
    this.isNPC = true;

    this.direction = this.direction || 'down';
  }

  getDialog() {
    return window.gameState.isBossDefeated ? this.bossDefeatedDialog : this.idleDialog;
  }
}