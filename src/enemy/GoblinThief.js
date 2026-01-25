import Enemy from "./Enemy.js";

export default class GoblinThief extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'goblin-thief', 4);

    this.speed = 1.25;
    this.detectRange = 250;
    this.attackRange = 30;
    this.dash = 2;
    this.attackCD = 1500;
    this.isRetreating = false;

    this.setOrigin(0.5, 0.5);
    this.setRectangle(10, 4, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.28}},
      label: 'enemy',
    })
    this.setFixedRotation();
    this.setFrictionAir(0.05);
    this.setFriction(0);
  }

  static createAnimations(scene) {
    const animations = [
      ["idle", "down", 0, 4],
      ["idle", "side", 1, 4],
      ["idle", "up", 2, 4],

      ["move", "down", 3, 6],
      ["move", "side", 4, 6],
      ["move", "up", 5, 6],

      ["attack", "down", 6, 6],
      ["attack", "side", 7, 6],
      ["attack", "up", 8, 6],

      ["collapse", null, 9, 4],

      ["hurt", "down", 10, 4],
      ["hurt", "side", 11, 4],
      ["hurt", "up", 12, 4],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `goblin-thief-${action}-${direction}` : `goblin-thief-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('goblin-thief', {
            start: row * 6,
            end: row * 6 + frameCount - 1,
          }),
          frameRate: 10,
          repeat: 0,
        })
      }
    })
  }

  update(time, delta) {
    if (this.isDead || this.isHurt || this.isAttacking) {
      return;
    }

    const player = this.scene.player;
    if (!player) {
      return;
    }

    this.setDepth(this.y + 5);

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.updateDirection(player);
    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const dir = dirNames[this.direction] || 'down';

    const canAttack = time > this.lastAttackTime + this.attackCD;

    if (this.isRetreating) {
      if (distance < this.attackRange + 25) {
        const escapeAngle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);

        const side = 0.2;
        this.setVelocity(Math.cos(escapeAngle + side) * this.speed, Math.sin(escapeAngle + side) * this.speed);
        this.anims.play(`goblin-thief-move-${dir}`, true);
        return;
      } else {
        this.isRetreating = false;
        this.setVelocity(0, 0);
      }
    }

    if (distance < this.detectRange) {
      if (distance < this.attackRange && canAttack) {
        this.attack(player, dir);
      } else if (distance > this.attackRange + 30 || canAttack) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        this.anims.play(`goblin-thief-move-${dir}`, true);
      } else {
        this.setVelocity(0, 0);
        this.anims.play(`goblin-thief-idle-${dir}`, true);
      }
    } else {
      this.setVelocity(0, 0);
      this.anims.play(`goblin-thief-idle-${dir}`, true);
    }
  }

  attack(player, dir) {
    this.isAttacking = true;
    this.anims.play(`goblin-thief-attack-${dir}`, true);

    this.once('animationupdate', (anim, frame) => {
      if (frame.index === 2) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(Math.cos(angle) * this.dash, Math.sin(angle) * this.dash);

        if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 25) {
          player.takeDamage(2);
        }
      }
    })

    this.once('animationcomplete', () => {
      this.isAttacking = false;
      this.isRetreating = true;
      this.lastAttackTime = this.scene.time.now;
      const escapeAngle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      this.setVelocity(Math.cos(escapeAngle) * 5, Math.sin(escapeAngle) * 5);
    })
  }
}