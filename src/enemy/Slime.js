import Enemy from "./Enemy.js";

const COLOR = ['slime_blue', 'slime_green', 'slime_pink', 'slime_red', 'slime_yellow']

export default class Slime extends Enemy {
  constructor(scene, x, y) {
    const color = Phaser.Utils.Array.GetRandom(COLOR);
    super(scene, x, y, color, 5);
    this.speed = 1;
    this.detectRange = 200;
    this.wanderTimer = 0;
    this.currentAngle = 0;

    this.setBody({
      type: 'circle',
      radius: 6,
    })
    this.setFixedRotation();
    this.initCollision();
  }

  static createAnimations(scene) {
    const animations = [
      ["idle", null, 0, 4],

      ["jump", null, 1, 8],

      ["collapse", null, 2, 4],

      ["hurt", null, 3, 4],
    ];
    COLOR.forEach((color) => {
      animations.forEach(config => {
        const [action, direction, row, frameCount] = config;
        const animKey = direction ? `${color}-${action}-${direction}` : `${color}-${action}`;
        if (!scene.anims.exists(animKey)) {
          scene.anims.create({
            key: animKey,
            frames: scene.anims.generateFrameNumbers(color, {
              start: row * 8,
              end: row * 8 + frameCount - 1,
            }),
            frameRate: action === 'jump' ? 7 : 10,
            repeat: 0,
          })
        }
      })
    })
  }

  update(time, delta) {
    if (this.isDead || this.isHurt) {
      this.updateHealthBar();
      return;
    }

    const player = this.scene.player;
    if (!player) {
      return;
    }

    this.setDepth(this.y + 5);

    const color = this.texture.key;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    let targetAngle;
    if (distance < this.detectRange) {
      this.speed = 1;
      targetAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    } else {
      this.wanderTimer -= delta;
      if (this.wanderTimer <= 0) {
        this.currentAngle = Math.random() * Math.PI * 2;
        this.wanderTimer = Phaser.Math.Between(1500, 3000);
        this.isWaiting = Math.random() < 0.4;
      }
      targetAngle = this.currentAngle;
      this.speed = 0.5;
    }

    if (this.isWaiting && distance >= this.detectRange) {
      this.setVelocity(0, 0);
      this.anims.play(`${color}-idle`, true);
    } else {
      this.anims.play(`${color}-jump`, true);

      const currentFrame = this.anims.currentFrame.index;
      if (currentFrame >= 4 && currentFrame <= 6) {
        const vx = Math.cos(targetAngle) * this.speed;
        const vy = Math.sin(targetAngle) * this.speed;
        this.setVelocity(vx, vy);
      } else {
        this.setVelocity(this.body.velocity.x * 0.8, this.body.velocity.y * 0.8);
      }
    }
    this.updateHealthBar();
  }

  initCollision() {
    this.setOnCollide((data) => {
      if (!this.active || this.isDead) {
        return;
      }
      const {bodyA, bodyB} = data
      const otherBody = bodyA === this.body ? bodyB : bodyA;
      this.handleCollision(otherBody);
    })
  }

  handleCollision(otherBody) {
    if (!otherBody) {
      return;
    }

    const label = otherBody.label;
    const target = otherBody.gameObject;

    if (label === 'player' && target) {
      const currentFrame = this.anims.currentFrame.index;
      const isJumping = currentFrame >= 4 && currentFrame <= 6;

      if (isJumping) {
        target.takeDamage(1);
        const bounceAngle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
        this.setVelocity(Math.cos(bounceAngle) * 2, Math.sin(bounceAngle) * 2);
      }
    } else if (label === 'collision') {
      this.currentAngle += Math.PI;
      this.wanderTimer = 0;
    }
  }
}