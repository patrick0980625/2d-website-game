import Enemy from "./Enemy.js";

export default class GoblinMaceman extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'goblin-maceman', 10);

    this.speed = 0.6;
    this.detectRange = 200;
    this.attackRange = 20;
    this.attackCD = 3000;

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
      const animKey = direction ? `goblin-maceman-${action}-${direction}` : `goblin-maceman-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('goblin-maceman', {
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

    if (distance < this.detectRange) {
      const canAttack = time > this.lastAttackTime + this.attackCD;

      if (distance < this.attackRange && canAttack) {
        this.attack(player, dir);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        this.anims.play(`goblin-maceman-move-${dir}`, true);
      }
    } else {
      this.setVelocity(0, 0);
      this.anims.play(`goblin-maceman-idle-${dir}`, true);
    }
  }

  attack(player, dir) {
    this.isAttacking = true;
    this.setVelocity(0, 0);
    const animKey = `goblin-maceman-attack-${dir}`
    this.anims.play(animKey, true);

    this.updateAttack = (anim, frame) => {
      if (anim.key === animKey && frame.index === 3) {
        this.scene.cameras.main.shake(100, 0.0001);
        if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 30) {
          player.takeDamage(4);
        }
      }
    }

    this.on('animationupdate', this.updateAttack);

    this.once('animationcomplete', (anim) => {
      if (anim.key === animKey) {
        this.cleanupAttack();
      }
    })
  }

  cleanupAttack() {
    this.off('animationupdate', this.updateAttack);
    this.lastAttackTime = this.scene.time.now;
    this.isAttacking = false;
  }

  takeDamage(amount, knockback = null) {
    const defense = 0.9;
    if (this.isAttacking) {
      this.cleanupAttack();
      this.anims.stop();
    }
    super.takeDamage(amount * defense, {x: 0, y: 0});
    this.setVelocity(0, 0);
  }
}