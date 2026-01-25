export default class Enemy extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, texture, hp) {
    super(scene.matter.world, x, y, texture);
    scene.add.existing(this);

    this.hp = hp;
    this.maxHp = hp;
    this.direction = 2;
    this.isDead = false;
    this.isHurt = false;
    this.scene = scene;
    this.lastAttackTime = 0;

    this.initHealthBar();
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateHealthBar();
  }

  takeDamage(amount, knockback = null) {
    if (this.isDead || this.isHurt) {
      return;
    }

    this.off('animationupdate');
    this.hp -= amount;
    this.isHurt = true;
    this.showHealthBar();
    this.updateHealthBar();

    if (knockback) {
      const angle = Phaser.Math.Angle.Between(knockback.x, knockback.y, this.x, this.y);
      const force = 3;
      this.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    }

    if (this.hp <= 0) {
      this.die();
    } else {
      this.hurt();
    }
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setSensor(true);
    this.anims.play(`${this.texture.key}-collapse`, true);

    if (this.healthBar) {
      this.healthBar.setVisible(true);
    }

    this.scene.tweens.add({
      targets: [this, this.healthBar],
      alpha: 0,
      duration: 1000,
      delay: 1000
    })

    this.scene.time.delayedCall(2000, () => {
      if (this.healthBar) {
        this.healthBar.destroy();
      }
      this.destroy();
    })
  }

  hurt() {
    this.isHurt = true;
    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const dir = dirNames[this.direction] || 'down';
    const animKey = `${this.texture.key}-hurt-${dir}`;

    if (this.scene.anims.exists(animKey)) {
      this.anims.play(animKey, true);
      this.once('animationcomplete', (anim) => {
        if (anim.key === animKey) {
          this.isHurt = false;
          this.setVelocity(0, 0);
          this.onHurtComplete();
        }
      })
    } else {
      this.setTint(0xff0000);
      this.scene.time.delayedCall(200, () => {
        this.isHurt = false;
        this.setVelocity(0, 0);
        this.clearTint();
      });
    }
  }

  onHurtComplete() {
  }

  initHealthBar() {
    this.healthBar = this.scene.add.sprite(this.x, this.y - 20, 'ui-health-bar');
    this.healthBar.setDepth(3000);
    this.healthBar.setVisible(false);
  }

  updateHealthBar() {
    if (!this.healthBar || this.isDead) {
      return;
    }

    this.healthBar.setPosition(this.x, this.y - 20);
    const percent = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    let frameIndex = Math.floor(10 * (1 - percent));
    this.healthBar.setFrame(frameIndex);
  }

  showHealthBar() {
    if (!this.healthBar) {
      return;
    }
    this.healthBar.setVisible(true);
    if (this.barTimer) {
      this.barTimer.remove();
    }
    this.barTimer = this.scene.time.delayedCall(3000, () => {
      if (this.healthBar && !this.isDead) {
        this.healthBar.setVisible(false);
      }
    })
  }

  updateDirection(target) {
    if (!target) {
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = 1;
      this.setFlipX(dx < 0);
    } else {
      this.direction = dy > 0 ? 2 : 0;
      this.setFlipX(false);
    }
  }
}