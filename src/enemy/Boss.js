import Enemy from "./Enemy.js";
import Broccoli from "./Broccoli.js";

const STATE = {
  IDLE: 'idle',
  RETURNING: 'returning',
  DASH: 'dash',
  STOMP: 'stomp',
  CAST: 'cast',
}

export default class Boss extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss', 100);

    this.setRectangle(16, 10, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.15}},
      label: 'enemy'
    })

    this.spawnX = this.x;
    this.spawnY = this.y;

    this.currentState = STATE.IDLE;
    this.nextActionTime = 0;
    this.setScale(1.7);
    this.setFixedRotation();

    this.setOnCollide(data => {
      this.handleCollision(data);
    })
  }

  static createAnimations(scene) {
    const animations = [
      ["idle", null, 0, 4],

      ["walk", null, 1, 6],

      ["jump", null, 2, 10],

      ["cast", null, 3, 5],

      ["collapse", null, 4, 7],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `boss-${action}-${direction}` : `boss-${action}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('boss', {
            start: row * 10,
            end: row * 10 + frameCount - 1,
          }),
          frameRate: 5,
          repeat: (action === 'walk' || action === 'idle') ? -1 : 0,
        })
      }
    })
  }

  update(time, delta) {
    if (this.isDead) {
      if (this.body) {
        this.setStatic(true);
        this.setVelocity(0, 0);
      }
      return;
    }
    if (this.isHurt) {
      return;
    }

    this.setDepth(this.y + 10);

    if (this.currentState === STATE.DASH || this.currentState === STATE.RETURNING) {
      this.setStatic(false);
    } else {
      this.setStatic(true);
      this.setVelocity(0, 0);
    }

    if (this.currentState === STATE.IDLE) {
      if (this.y > this.spawnY + 100) {
        this.returnToTop();
        return;
      }

      if (time > this.nextActionTime) {
        this.decideNextMove();
      }
    }
    this.updateHealthBar();
  }

  returnToTop() {
    if (this.isDead) {
      return;
    }

    this.currentState = STATE.RETURNING;
    this.anims.play('boss-jump', true);
    this.setSensor(true);

    this.scene.tweens.add({
      targets: this,
      x: this.spawnX,
      y: this.spawnY,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setSensor(false);
        this.currentState = STATE.IDLE;
        this.nextActionTime = this.scene.time.now + 1000;
        this.anims.play('boss-idle', true);
      }
    })
  }

  decideNextMove() {
    if (this.isDead) {
      return;
    }

    const player = this.scene.player;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const isPlayerAbove = (player.y < this.y - 10) && (dist < 50);

    if (isPlayerAbove) {
      this.executeStomp();
      return;
    }

    if (player.y < this.y - 100) {
      this.returnToTop();
      return;
    }

    const move = ['DASH', 'STOMP', 'CAST'];
    const selected = move[Phaser.Math.Between(0, move.length - 1)];

    if (selected === 'DASH') {
      this.executeDash();
    } else if (selected === 'STOMP') {
      this.executeStomp();
    } else {
      this.executeCast();
    }
  }

  executeDash() {
    this.currentState = STATE.DASH;
    this.hasHitPlayer = false;
    this.anims.play('boss-jump', true);
    this.setVelocity(0, 0);

    const angle = this.getConstrainedAngle();
    const speed = 3;
    this.showDashWarning(angle, 500);

    this.scene.time.delayedCall(500, () => {
      if (this.isDead) {
        return;
      }
      this.anims.play({
        key: 'boss-walk',
        frameRate: 7,
      }, true);
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.setFrictionAir(0.02);
      this.scene.time.delayedCall(1500, () => {
        this.setFrictionAir(0.01);
        this.stopAction();
      })
    })
  }

  executeCast() {
    this.currentState = STATE.CAST;
    this.setVelocity(0, 0);
    const angle = this.getConstrainedAngle();
    this.showFireWarning(angle, 500);

    this.scene.time.delayedCall(500, () => {
      if (this.isDead) {
        return;
      }
      this.anims.play({key: 'boss-cast', frameRate: 7}, true);

      this.off('animationupdate');
      this.on('animationupdate', (anim, frame) => {
        if (anim.key.includes('cast') && frame.index === 3) {
          this.fire(this.scene.player, angle);
          this.off('animationupdate');
        }
      })
    })
    this.once('animationcomplete', (anim) => {
      if (anim.key.includes('cast')) {
        this.stopAction();
      }
    })
  }

  executeStomp() {
    this.currentState = STATE.STOMP;
    this.setVelocity(0, 0);
    this.anims.play({key: 'boss-jump', frameRate: 5}, true);

    const stompRadius = 90;
    if (this.stompGraphics) {
      this.stompGraphics.destroy();
    }
    this.stompGraphics = this.scene.add.graphics();

    this.stompGraphics.lineStyle(2, 0xff3333, 0.3);
    this.stompGraphics.fillStyle(0xff3333, 0.3);
    const circle = new Phaser.Geom.Circle(this.x, this.y, stompRadius);
    this.stompGraphics.strokeCircleShape(circle);
    this.stompGraphics.fillCircleShape(circle);

    this.once('animationcomplete', () => {
      if (this.stompGraphics) {
        this.stompGraphics.destroy();
        this.stompGraphics = null;
      }

      if (this.isDead) {
        return;
      }

      this.scene.cameras.main.shake(300, 0.003);
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
      if (dist < stompRadius) {
        this.scene.player.takeDamage(3);
      }
      this.stopAction();
    })
  }

  stopAction() {
    if (this.isDead) {
      return;
    }

    this.setVelocity(0, 0);
    this.currentState = STATE.IDLE;
    this.anims.play({
      key: 'boss-idle',
      frameRate: 3,
    }, true);
    this.nextActionTime = this.scene.time.now + 1500;
  }

  getConstrainedAngle() {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
    return Phaser.Math.Clamp(angle, 0.8, 2.3);
  }

  fire(player, angle) {
    if (!player || !player.body) {
      return;
    }

    const offset = 20;
    const spawnX = this.x + Math.cos(angle) * offset;
    const spawnY = this.y + Math.sin(angle) * offset;
    const arrow = new Broccoli(this.scene, spawnX, spawnY, angle, 2.5);

    if (this.scene.projectiles) {
      this.scene.projectiles.push(arrow);
    }
  }

  handleCollision(data) {
    if (this.isDead) {
      return;
    }

    const otherBody = data.bodyA === this.body ? data.bodyB : data.bodyA;

    if (otherBody.label === 'player' && this.currentState === STATE.DASH) {
      if (this.hasHitPlayer) {
        return;
      }

      this.hasHitPlayer = true;
      this.scene.player.takeDamage(4);
      this.scene.cameras.main.shake(200, 0.002);

      const pushAngle = Phaser.Math.Angle.Between(this.x, this.y, this.scene.player.x, this.scene.player.y);
      this.scene.player.setVelocity(Math.cos(pushAngle) * 4, Math.sin(pushAngle) * 4);
      this.setVelocity(0, 0);

      if (this.dashTimeOut) {
        this.dashTimeOut.remove();
        this.stopAction();
      } else if (this.currentState === STATE.DASH) {
        if (this.dashTimeOut) {
          this.dashTimeOut.remove();
          this.stopAction();
        }
      }
    }
  }

  takeDamage(amount, knockback = null) {
    if (this.isDead) {
      return;
    }
    super.takeDamage(amount, null);
  }

  die() {
    if (this.stompGraphics) {
      this.stompGraphics.destroy();
      this.stompGraphics = null;
    }

    if (this.isDead) {
      return;
    }

    this.isDead = true;
    this.currentState = STATE.IDLE;
    this.setVelocity(0, 0);
    this.setSensor(true);
    this.setStatic(true);
    this.scene.tweens.killTweensOf(this);

    this.off('animationupdate');
    this.off('animationcomplete');

    this.anims.play({key: 'boss-collapse', frameRate: 2}, true);
    this.scene.cameras.main.shake(500, 0.003);
    window.gameState.isBossFighting = false;
    window.gameState.isBossDefeated = true;
    this.scene.events.emit('boss-defeated');

    if (this.healthBar) {
      this.healthBar.setVisible(true);
      this.healthBar.setAlpha(1);
    }

    this.scene.time.delayedCall(5000, () => {
      this.scene.tweens.add({
        targets: [this, this.healthBar],
        alpha: 0,
        duration: 4000,
        ease: 'Linear',
        onComplete: () => {
          if (this.healthBar) {
            this.healthBar.destroy();
            this.destroy();
          }
        }
      })
    })
  }

  showDashWarning(angle, duration) {
    const distance = 100;
    const width = 40;
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0xff3333, 0.2);
    graphics.fillStyle(0xff3333, 0.2);

    const rect = new Phaser.Geom.Rectangle(-width / 2, 0, width, distance);

    graphics.save();
    graphics.translateCanvas(this.x, this.y);
    graphics.rotateCanvas(angle - Math.PI / 2);
    graphics.fillRectShape(rect);
    graphics.strokeRectShape(rect);
    graphics.restore();

    this.scene.time.delayedCall(duration, () => {
      graphics.destroy();
    })
  }

  showFireWarning(angle, duration) {
    const lineLength = 200;
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0xff3333, 0.5);
    graphics.fillStyle(0xff3333, 0.5);

    const destX = this.x + Math.cos(angle) * lineLength;
    const destY = this.y + Math.sin(angle) * lineLength;

    graphics.lineBetween(this.x, this.y, destX, destY);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 100,
      yoyo: true,
      repeat: -1,
    })

    this.scene.time.delayedCall(duration, () => {
      graphics.destroy();
    })
  }
}