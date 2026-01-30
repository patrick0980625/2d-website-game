import Enemy from "./Enemy.js";
import Arrow from "./Arrow.js";

export default class GoblinArcher extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'goblin-archer', 5);

    this.speed = 0.9;
    this.attackRange = 200;
    this.safeDistance = 80;
    this.lastFired = 0;
    this.fireRate = 2500;
    this.retreatDelay = 500;
    this.retreatTimer = null;

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

      ["walk", "down", 3, 6],
      ["walk", "side", 4, 6],
      ["walk", "up", 5, 6],

      ["attack", "down", 6, 6],
      ["attack", "side", 7, 6],
      ["attack", "up", 8, 6],

      ["collapse", null, 9, 4],

      ["hurt", "down", 10, 2],
      ["hurt", "side", 11, 2],
      ["hurt", "up", 12, 2],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `goblin-archer-${action}-${direction}` : `goblin-archer-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('goblin-archer', {
            start: row * 6,
            end: row * 6 + frameCount - 1,
          }),
          frameRate: 10,
          repeat: 0,
        })
      }
    })
  }

  update() {
    if (this.isDead || this.isHurt) {
      return;
    }

    const player = this.scene.player;
    if (!player) {
      return;
    }

    this.setDepth(this.y + 5);

    const currentAnim = this.anims.currentAnim;
    if (currentAnim && currentAnim.key.includes('attack') && this.anims.isPlaying) {
      this.setVelocity(0, 0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.updateDirection(player);
    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const dir = dirNames[this.direction] || 'down';


    if (distance < this.safeDistance) {
      const now = this.scene.time.now;

      if (!this.retreatTimer) {
        this.retreatTimer = now;
      }

      if (now - this.retreatTimer > this.retreatDelay) {
        const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        this.anims.play(`goblin-archer-walk-${dir}`, true);
      } else {
        this.setVelocity(0, 0);
        this.anims.play(`goblin-archer-idle-${dir}`, true);
      }
    } else {
      this.retreatTimer = null;

      if (distance < this.attackRange) {
        this.setVelocity(0, 0);
        this.attemptFire(player, dir);
      } else {
        this.setVelocity(0, 0);
        this.anims.play(`goblin-archer-idle-${dir}`, true);
      }
    }
  }

  attemptFire(player, dir) {
    const now = this.scene.time.now;
    if (now > this.lastFired + this.fireRate) {
      this.lastFired = now;

      const animKey = `goblin-archer-attack-${dir}`;
      this.anims.play(animKey, true);

      this.off('animationupdate');
      this.on('animationupdate', (anim, frame) => {
        if (anim.key.includes('attack') && frame.index === 3) {
          this.fireArrow(player);
          this.off('animationupdate');
        }
      })
    } else {
      if (!this.anims.isPlaying || !this.anims.currentAnim.key.includes('attack')) {
        this.anims.play(`goblin-archer-idle-${dir}`, true);
      }
    }
  }

  fireArrow(player) {
    if (!player || !player.body) {
      return;
    }

    const offset = 15;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const spawnX = this.x + Math.cos(angle) * offset;
    const spawnY = this.y + Math.sin(angle) * offset;
    const arrow = new Arrow(this.scene, spawnX, spawnY, angle, 2.5);

    if (this.scene.projectiles) {
      this.scene.projectiles.push(arrow);
    }
  }
}