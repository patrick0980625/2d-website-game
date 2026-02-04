const STATE = {
  IDLE: 'idle',
  MOVE: 'move',
  ATTACK: 'attack',
  DODGE: 'dodge',
  JUMP: 'jump',
}

export default class Player extends Phaser.Physics.Matter.Sprite {
  constructor(data) {
    let {scene, x, y, texture, frame} = data;
    super(scene.matter.world, x, y, texture, frame);
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setRectangle(10, 4, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.1}},
      label: 'player',
    });

    this.setFixedRotation();
    this.setVisible(true);
    this.setFriction(0);
    this.setFrictionAir(0.05);
    this.direction = 2;
    this.currentState = STATE.IDLE;

    this.hp = window.gameState.playerHp || 20;
    this.maxHp = 20;
    this.isDead = false;
    this.combo = 1;
    this.lastAttack = 0
    this.comboTimeout = 1000;
    this.isInvulnerable = false;
    this.lastDamageTime = 0;
    this.recoveryRate = 2000;
    this.lastRecoveryTime = 0;
    this.recoveryDelay = 7000;
    this.recoveryAmount = 2;

    this.cursors = scene.input.keyboard.createCursorKeys();
    this.keyWASD = scene.input.keyboard.addKeys('W,A,S,D');
    this.keyE = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.scene.input.on('pointerdown', (p) => {
      if (!this.isDead) {
        if (p.leftButtonDown()) {
          this.comboAttack();
        } else if (p.rightButtonDown()) {
          this.startAction(STATE.DODGE);
        }
      }
    })
  }

  static createAnimations(scene) {
    const animations = [
      ["idle", "down", 0, 6],
      ["idle", "side", 1, 6],
      ["idle", "up", 2, 6],

      ["walk", "down", 3, 6],
      ["walk", "side", 4, 6],
      ["walk", "up", 5, 6],

      ["attack_1", "down", 6, 4],
      ["attack_2", "down", 7, 4],
      ["attack_3", "down", 8, 4],
      ["attack_1", "side", 9, 4],
      ["attack_2", "side", 10, 4],
      ["attack_3", "side", 11, 4],
      ["attack_1", "up", 12, 4],
      ["attack_2", "up", 13, 4],
      ["attack_3", "up", 14, 4],

      ["collapse", null, 15, 4],

      ["climb_ladder", null, 16, 6],

      ["dodge", "down", 17, 8],
      ["dodge", "side", 18, 8],
      ["dodge", "up", 19, 8],

      ["jump", "down", 20, 6],
      ["jump", "side", 21, 6],
      ["jump", "up", 22, 6],

      ["weapon_bow", "down", 23, 6],
      ["weapon_bow", "side", 24, 6],
      ["weapon_bow", "up", 25, 6],

      ["tool_axe", "down", 26, 6],
      ["tool_axe", "side", 27, 6],
      ["tool_axe", "up", 28, 6],

      ["tool_pickaxe", "down", 29, 6],
      ["tool_pickaxe", "side", 30, 6],
      ["tool_pickaxe", "up", 31, 6],

      ["tool_hoe", "down", 32, 6],
      ["tool_hoe", "side", 33, 6],
      ["tool_hoe", "up", 34, 6],

      ["tool_watercan", "down", 35, 6],
      ["tool_watercan", "side", 36, 6],
      ["tool_watercan", "up", 37, 6],
    ];
    animations.forEach(config => {
      const [action, direction, row, frameCount] = config;
      const animKey = direction ? `${action}-${direction}` : action;

      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers('player', {
            start: row * 8,
            end: row * 8 + frameCount - 1,
          }),
          frameRate: animKey === 'collapse' ? 5 : 10,
          repeat: 0,
        })
      }
    })
  }

  update() {
    if (!this.body || this.isDead) {
      if (this.isDead) {
        this.setVelocity(0, 0);
      }
      return;
    }

    this.setDepth(this.y + 5);

    switch (this.currentState) {
      case STATE.IDLE:
      case STATE.MOVE:
        if (this.handleActionInput()) {
          break;
        }
        this.movement();
        break;
      case STATE.ATTACK:
      case STATE.JUMP:
      case STATE.DODGE:
        break;
    }
    this.recovery();
  }

  handleActionInput() {
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      this.startAction(STATE.JUMP);
      return true;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.attemptInteraction();
      return false;
    }

    return false;
  }

  startAction(state, num = 1) {
    if (this.currentState !== STATE.IDLE && this.currentState !== STATE.MOVE) {
      return;
    }

    this.currentState = state;
    let animKey = '';

    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const dir = dirNames[this.direction];

    if (state === STATE.ATTACK) {
      animKey = `attack_${num}-${dir}`;

      this.off('animationupdate');
      this.on('animationupdate', (anim, frame) => {
        if (anim.key.includes('attack') && frame.index === 2) {
          this.checkAttack(num);
        }
      })
    } else if (state === STATE.DODGE) {
      this.dodge();
      animKey = `dodge-${dir}`;
    } else if (state === STATE.JUMP) {
      animKey = `jump-${dir}`;
    }
    this.anims.play(animKey, true);

    this.once('animationcomplete', () => {
      this.currentState = STATE.IDLE;
      this.isInvulnerable = false;
      this.setFrictionAir(0.01);
      this.setVelocity(0, 0);
    })
  }

  comboAttack() {
    const now = this.scene.time.now;

    if (now - this.lastAttack > this.comboTimeout) {
      this.combo = 1;
    }
    this.startAction(STATE.ATTACK, this.combo);
    this.lastAttack = now;
    this.combo++;
    if (this.combo > 3) {
      this.combo = 1;
    }
  }

  checkAttack(num) {
    const attackRange = 25;

    if (this.scene.enemies) {
      this.scene.enemies.forEach(e => {
        if (e.isDead) {
          return;
        }

        const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
        if (d < attackRange) {
          const angleToEnemy = Phaser.Math.Angle.Between(this.x, this.y, e.x, e.y);
          const dirAngle = {0: -Math.PI / 2, 1: 0, 2: Math.PI / 2, 3: Math.PI};
          const playerAngle = dirAngle[this.direction];

          let diff = Phaser.Math.Angle.Wrap(angleToEnemy - playerAngle);
          if (Math.abs(diff) <= Math.PI / 1.5) {
            let damage = num === 3 ? 3 : 2;
            damage += window.gameState.playerDeathCount / 8;
            e.takeDamage(damage, this);
          }
        }
      })
    }
  }

  movement() {
    let speed = this.cursors.shift.isDown ? 1.35 : 1;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.keyWASD.A.isDown;
    const right = this.cursors.right.isDown || this.keyWASD.D.isDown;
    const up = this.cursors.up.isDown || this.keyWASD.W.isDown;
    const down = this.cursors.down.isDown || this.keyWASD.S.isDown;

    if (left) {
      vx = -speed;
      this.flipX = true;
      this.direction = 3;
    } else if (right) {
      vx = speed;
      this.flipX = false;
      this.direction = 1;
    }

    if (up) {
      vy = -speed;
      if (vx === 0) {
        this.direction = 0;
      }
    } else if (down) {
      vy = speed;
      if (vx === 0) {
        this.direction = 2;
      }
    }

    if (vx !== 0 && vy !== 0) {
      vx /= Math.sqrt(2);
      vy /= Math.sqrt(2);
    }
    this.setVelocity(vx, vy);

    if (vx === 0 && vy === 0) {
      this.currentState = STATE.IDLE;
      this.playIdleAnimation();
    } else {
      this.currentState = STATE.MOVE;
      if (vx !== 0) {
        this.anims.play('walk-side', true);
      } else if (vy < 0) {
        this.anims.play('walk-up', true);
      } else if (vy > 0) {
        this.anims.play('walk-down', true);
      }
    }
  }

  dodge() {
    const dodge = 2;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.keyWASD.A.isDown;
    const right = this.cursors.right.isDown || this.keyWASD.D.isDown;
    const up = this.cursors.up.isDown || this.keyWASD.W.isDown;
    const down = this.cursors.down.isDown || this.keyWASD.S.isDown;

    if (left) {
      vx = -1;
    } else if (right) {
      vx = 1;
    }

    if (up) {
      vy = -1;
    } else if (down) {
      vy = 1;
    }
    if (vx === 0 && vy === 0) {
      const move = {0: {x: 0, y: -1}, 1: {x: 1, y: 0}, 2: {x: 0, y: 1}, 3: {x: -1, y: 0}};
      vx = move[this.direction].x;
      vy = move[this.direction].y;
    }

    const vector = new Phaser.Math.Vector2(vx, vy).normalize().scale(dodge);
    this.setVelocity(vector.x, vector.y);
    this.setFrictionAir(0.03);
    this.isInvulnerable = true;
  }

  playIdleAnimation() {
    const dirNames = {0: 'up', 1: 'side', 2: 'down', 3: 'side'};
    const animKey = `idle-${dirNames[this.direction]}`;

    if (this.direction === 0 || this.direction === 2) {
      this.flipX = false;
    }
    this.anims.play(animKey, true);
  }

  attemptInteraction() {
    this.scene.events.emit('player-interact', this);
  }

  takeDamage(amount) {
    if (this.isDead) {
      return;
    }

    if (this.currentState === STATE.DODGE) {
      const finalDamage = Math.ceil(amount * 0.2);
      this.hp -= finalDamage;
      this.triggerHurtEffect();
      return;
    }

    if (this.isInvulnerable) {
      return;
    }

    this.hp -= amount;
    this.triggerHurtEffect();
  }

  triggerHurtEffect() {
    this.isInvulnerable = true;
    window.gameState.playerHp = this.hp;
    this.lastDamageTime = this.scene.time.now;
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
      if (this.currentState !== STATE.DODGE) {
        this.isInvulnerable = false;
      }
    });
    this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.setVelocity(0, 0);
    this.setSensor(true);
    this.anims.play('collapse', true);
    this.setTint(0xff0000);
    this.scene.events.emit('player-die');
  }

  recovery() {
    const now = this.scene.time.now;

    if (!this.isDead && this.hp < this.maxHp && now - this.lastDamageTime > this.recoveryDelay) {
      if (now - this.lastRecoveryTime > this.recoveryRate) {
        this.hp = Math.min(this.maxHp, this.hp + this.recoveryAmount);
        this.lastRecoveryTime = now;
        this.scene.events.emit('player-hp-changed', this.hp, this.maxHp);
        this.setTint(0x00ff00);
        this.scene.time.delayedCall(200, () => this.clearTint());
        window.gameState.playerHp = this.hp;
      }
    }
  }
}