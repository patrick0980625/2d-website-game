import Enemy from "./Enemy.js";

export default class OrcChief extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'orc-chief', 30);

    this.speed = 0.5;
    this.detectRange = 100;
    this.attackRange = 40;
    this.attackCD = 4000;
    this.recoveryAmount = 2;
    this.lastRecoveryTime = 0;
    this.recoveryRate = 3000;
    this.isEncharge = false;
    this.lastAttackTime = 0;

    this.spawnX = x;
    this.spawnY = y;
    this.leashRange = 200;
    this.isReturning = false;

    this.setOrigin(0.5, 0.5);
    this.setRectangle(16, 8, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.15}},
      label: 'enemy',
    })
    this.setFixedRotation();
    this.setMass(20);
    this.setFrictionAir(0.05);
    this.setFriction(0);
  }

  static createAnimations(scene) {
    const animations = [
      ["idle", "down", 0, 6],
      ["idle", "side", 1, 6],
      ["idle", "up", 2, 6],

      ["move", "down", 3, 6],
      ["move", "side", 4, 6],
      ["move", "up", 5, 6],

      ["attack", "down", 6, 8],
      ["attack", "side", 7, 8],
      ["attack", "up", 8, 8],

      ["collapse", null, 9, 4],

      ["hurt", "down", 10, 4],
      ["hurt", "side", 11, 4],
      ["hurt", "up", 12, 4],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `orc-chief-${action}-${direction}` : `orc-chief-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('orc-chief', {
            start: row * 8,
            end: row * 8 + frameCount - 1,
          }),
          frameRate: action === 'collapse' ? 5 : 10,
          repeat: (action === 'idle' || action === 'move') ? -1 : 0,
        })
      }
    })
  }

  update(time, delta) {
    if (this.isDead || this.isHurt || this.isAttacking || this.isReturning) {
      return;
    }

    const player = this.scene.player;
    if (!player) {
      return;
    }

    this.setDepth(this.y + 10);
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const dFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);

    if (dFromSpawn > this.leashRange) {
      this.startReturning();
      return;
    }

    this.updateDirection(player);
    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const dir = dirNames[this.direction] || 'down';

    if (this.hp < 10 && !this.isEncharge) {
      this.isEncharge = true;
      this.setTint(0xff8888);
      this.speed = 1;
      this.attackCD = 3000;
    }

    if (distance < this.detectRange) {
      const canAttack = time > this.lastAttackTime + this.attackCD;
      if (distance < this.attackRange && canAttack) {
        this.attack(player, dir);
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
        this.anims.play(`orc-chief-move-${dir}`, true);
        this.setFlipX(this.body.velocity.x < 0);
      }
    } else {
      this.recovery(time);
      this.setVelocity(0, 0);
      this.anims.play(`orc-chief-idle-${dir}`, true);
    }
  }

  attack(player, dir) {
    this.isAttacking = true;
    this.setVelocity(0, 0);
    const animKey = `orc-chief-attack-${dir}`;
    this.anims.play(animKey, true);

    this.updateAttack = (anim, frame) => {
      if (anim.key === animKey && frame.index === 4) {
        this.scene.cameras.main.shake(150, 0.0005);

        const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        if (d < 40) {
          player.takeDamage(2.5);

          const pushAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
          player.setVelocity(Math.cos(pushAngle) * 5, Math.sin(pushAngle) * 5);
        }
      }
    }

    this.on('animationupdate', this.updateAttack);
    this.once('animationcomplete', (anim) => {
      if (anim.key === animKey) {
        this.off('animationupdate', this.updateAttack);
        this.isAttacking = false;
        this.lastAttackTime = this.scene.time.now;
      }
    })
  }

  takeDamage(amount, knockback = null) {
    if (this.isReturning) {
      return;
    }

    const defense = 0.8;
    if (this.isAttacking) {
      this.hp -= amount * defense;
      return;
    }

    this.setVelocity(0, 0);
    super.takeDamage(amount * defense, knockback = null);
  }

  recovery(time) {
    if (time > this.lastRecoveryTime + this.recoveryRate && this.hp < this.maxHp) {
      this.hp += this.recoveryAmount;
      if (this.hp > this.maxHp) {
        this.hp = this.maxHp;
      }
      this.lastRecoveryTime = this.scene.time.now;
    }
  }

  startReturning() {
    if (this.isReturning) {
      return;
    }

    this.isReturning = true;
    this.setVelocity(0, 0);
    this.setSensor(true);
    this.setTint(0xcccccc);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.spawnX, this.spawnY);
    const dir = (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? "side" : (Math.sin(angle) > 0 ? 'down' : 'up'));
    this.dFromSpawn = Phaser.Math.Distance.Between(this.x, this.y, this.spawnX, this.spawnY);
    this.pxPerSecond = this.speed * 60;
    this.anims.play(`orc-chief-move-${dir}`, true);
    this.setFlipX(Math.cos(angle) < 0);

    this.scene.tweens.add({
      targets: this,
      x: this.spawnX,
      y: this.spawnY,
      duration: this.dFromSpawn / this.pxPerSecond * 1000,
      ease: 'Linear',
      onComplete: () => {
        if (!this.active) {
          return;
        }
        this.isReturning = false;
        this.setSensor(false);
        this.clearTint();
        this.hp = Math.min(this.maxHp, this.hp + 10);
        this.isEncharge = false;
      }
    })
  }

  die() {
    window.gameState.isOrcDefeated = true;
    window.gameState.hasKey = true;
    super.die();
    this.scene.events.emit('spawn-loot', {
      x: this.x,
      y: this.y,
      type: 'key',
      id: 'castle_key',
    })
  }
}