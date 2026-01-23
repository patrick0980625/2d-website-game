let direction = 2;
let isAttack = false;
let isJump = false;

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

  init(data) {
    this.currentMapKey = data.targetMap || 'initial_room_data';
    this.spawnPointName = data.targetPoint || 'spawn_point';
  }

  create() {
    // load json
    const data = this.cache.json.get('manifest');
    if (!data) {
      return;
    }

    // initial setting
    this.teleportPoints = new Map();
    this.activePortal = null;

    // load map
    const map = this.make.tilemap({key: this.currentMapKey});
    this.cameras.main.fadeIn(300);

    // load tiles
    const tilesetObjects = [];
    map.tilesets.forEach(data => {
      const t = map.addTilesetImage(data.name, data.name);
      if (t) {
        tilesetObjects.push(t);
      }
    });

    // create teleport object
    const teleport = map.getObjectLayer('teleport');
    if (teleport) {
      teleport.objects.forEach(obj => {
        if (obj.type === 'teleport_point') {
          this.teleportPoints.set(obj.name, {x: obj.x, y: obj.y});
        } else if (obj.type === 'portal') {
          const centerX = obj.x + obj.width / 2;
          const centerY = obj.y + obj.height / 2;
          const portal = this.matter.add.rectangle(centerX, centerY, obj.width, obj.height, {
            isStatic: true,
            isSensor: true,
            label: 'portal',
          });
          portal.portalData = {};
          if (obj.properties) {
            obj.properties.forEach(p => {
              portal.portalData[p.name] = p.value;
            })
          }
        }
      })
    }

    // create collision object
    const collision = map.getObjectLayer('collision');
    if (collision) {
      collision.objects.forEach(obj => {
        const x = obj.x + obj.width / 2;
        const y = obj.y + obj.height / 2;
        this.matter.add.rectangle(x, y, obj.width, obj.height, {
          isStatic: true,
          label: 'collision',
        })
      })
    }

    // crate deco object
    const deco = map.getObjectLayer('deco');
    if (deco) {
      const groups = {};
      deco.objects.forEach(obj => {
        const gName = obj.name || `item-${obj.id}`;
        if (!groups[gName]) {
          groups[gName] = [];
        }
        groups[gName].push(obj);
      })

      Object.keys(groups).forEach(n => {
        const part = groups[n];
        const baseY = Math.max(...part.map(p => p.y));
        part.forEach(p => {
          if (p.gid === 0 || !p.gid) {
            return;
          }

          const pureGid = p.gid & 0x0FFFFFFF;
          const tileset = map.tilesets.find(t => pureGid >= t.firstgid && pureGid < t.firstgid + t.total);

          if (tileset) {
            const textureKey = tileset.name;
            const frameIndex = pureGid - tileset.firstgid;
            const sprite = this.add.sprite(p.x, p.y, textureKey, frameIndex);
            sprite.setOrigin(0, 1);
            sprite.setDepth(baseY);

            const tileData = tileset.tileData && tileset.tileData[frameIndex];
            if (tileData && tileData.animation) {
              const animKey = `anim-${textureKey}-${frameIndex}`;

              if (!this.anims.exists(animKey)) {
                const frames = tileData.animation.map(f => ({
                  key: textureKey,
                  frame: f.tileid,
                  duration: f.duration,
                }));

                this.anims.create({
                  key: animKey,
                  frames: frames,
                  repeat: -1,
                })
              }
              sprite.play(animKey);
            }

            if (p.properties) {
              const prop = p.properties.find(p => p.name === 'alwaysUnder');
              if (prop && prop.value) {
                sprite.setDepth(1);
              }
            }
          }
        })
      })
    }

    // create player
    const spawn = this.teleportPoints.get(this.spawnPointName) || {x: 100, y: 100};
    this.player = this.matter.add.sprite(spawn.x, spawn.y, 'player');
    this.player.setOrigin(0.5, 0.5);
    this.player.setRectangle(10, 4, {
      render: {sprite: {xOffset: -0.005, yOffset: 0.1}},
      label: 'player',
    });
    this.player.setFixedRotation();
    this.player.setFriction(0);
    this.player.setFrictionAir(0.1);
    this.player.setDepth(100);
    this.player.setVisible(true);

    // teleport listener
    this.matter.world.on('collisionstart', event => {
      event.pairs.forEach(p => {
        const {bodyA, bodyB} = p;
        const portalBody = bodyA.label === 'portal' ? bodyA : (bodyB.label === 'portal' ? bodyB : null);
        const playerBody = bodyA.label === 'player' ? bodyA : (bodyB.label === 'player' ? bodyB : null);
        if (portalBody && playerBody) {
          const data = portalBody.portalData;
          if (data.is_door) {
            this.activePortal = portalBody;
          } else {
            this.changeScene(data);
          }
        }
      })
    })

    this.matter.world.on('collisionend', event => {
      event.pairs.forEach(p => {
        const {bodyA, bodyB} = p;
        if (bodyA.label === 'portal' || bodyB.label === 'portal') {
          this.activePortal = null;
        }
      })
    })

    // control
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // anim
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
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers('player', {
            start: row * 8,
            end: row * 8 + frameCount - 1,
          }),
          frameRate: 10,
          repeat: 0,
        })
      }
    })

    // create ground
    const ground = map.createLayer('ground', tilesetObjects, 0, 0);
    if (ground) {
      ground.setDepth(-1);
    }

    // create aboveGround
    const aboveGround = map.createLayer('aboveGround', tilesetObjects, 0);
    if (aboveGround) {
      aboveGround.setDepth(0);
    }

    // create shadow
    const shadow = map.createLayer('shadow', tilesetObjects, 0, 0);
    if (shadow) {
      shadow.setDepth(1);
    }

    // cameras
    const setupCamera = () => {
      const {width, height} = this.scale;
      const mapWidth = map.widthInPixels;
      const mapHeight = map.heightInPixels;
      let zoom = (this.scale.width > 800 && this.scale.height > 600) ? 5 : 3;
      const displayWidth = mapWidth * zoom;
      const displayHeight = mapHeight * zoom;
      const boundsW = Math.max(mapWidth, width / zoom);
      const boundsH = Math.max(mapHeight, height / zoom);
      const offsetX = displayWidth < width ? (width / zoom - mapWidth) / 2 : 0;
      const offsetY = displayHeight < height ? (height / zoom - mapHeight) / 2 : 0;

      this.cameras.main.setBounds(-offsetX, -offsetY, boundsW, boundsH);
      this.cameras.main.startFollow(this.player, true);

      if (displayWidth < width && displayHeight < height) {
        this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
      }

      this.cameras.main.setZoom(zoom);
      this.cameras.main.roundPixels = true;
    }
    setupCamera();
    this.scale.on('resize', setupCamera);
  }

  update(time, delta) {
    if (!this.player.body) {
      console.error('physics problem')
    }
    this.player.setDepth(this.player.y + 5);


    let speed = 1;
    let vx = 0;
    let vy = 0;

    if (this.cursors.shift.isDown) {
      speed = 1.75;
    }

    // keyE: door
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (this.activePortal) {
        const data = this.activePortal.portalData;
        if (data.is_door) {
          this.changeScene(data);
        }
      }
    }

    // key Attack
    if (!isJump) {
      // key1: attack_1
      if (Phaser.Input.Keyboard.JustDown(this.key1)) {
        isAttack = true;
        this.player.setVelocity(0, 0);
        if (direction === 0) {
          this.player.flipX = false;
          this.player.anims.play('attack_1-up', true);
        } else if (direction === 1 || direction === 3) {
          this.player.anims.play('attack_1-side', true);
        } else {
          this.player.flipX = false;
          this.player.anims.play('attack_1-down', true);
        }

        this.player.once('animationcomplete', () => {
          isAttack = false;
        })
      }

      // key2: attack_2
      if (Phaser.Input.Keyboard.JustDown(this.key2)) {
        isAttack = true;
        this.player.setVelocity(0, 0);
        if (direction === 0) {
          this.player.flipX = false;
          this.player.anims.play('attack_2-up', true);
        } else if (direction === 1 || direction === 3) {
          this.player.anims.play('attack_2-side', true);
        } else {
          this.player.flipX = false;
          this.player.anims.play('attack_2-down', true);
        }

        this.player.once('animationcomplete', () => {
          isAttack = false;
        })
      }

      // key3: attack_3
      if (Phaser.Input.Keyboard.JustDown(this.key3)) {
        isAttack = true;
        this.player.setVelocity(0, 0);
        if (direction === 0) {
          this.player.flipX = false;
          this.player.anims.play('attack_3-up', true);
        } else if (direction === 1 || direction === 3) {
          this.player.anims.play('attack_3-side', true);
        } else {
          this.player.flipX = false;
          this.player.anims.play('attack_3-down', true);
        }

        this.player.once('animationcomplete', () => {
          isAttack = false;
        })
      }
    }

    // keySPACE: jump
    if (!isAttack) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
        isJump = true;
        if (direction === 0) {
          this.player.flipX = false;
          this.player.anims.play('jump-up', true);
        } else if (direction === 1 || direction === 3) {
          this.player.anims.play('jump-side', true);
        } else {
          this.player.flipX = false;
          this.player.anims.play('jump-down', true);
        }

        this.player.once('animationcomplete', () => {
          isJump = false;
        })
      }
    }

    // move
    if (!isAttack && !isJump) {
      if (this.cursors.left.isDown || this.keyA.isDown) {
        direction = 3;
        this.player.flipX = true;
        vx = -speed;
        if (this.player.body.velocity.y === 0) {
          this.player.anims.play('walk-side', true);
        }
      } else if (this.cursors.right.isDown || this.keyD.isDown) {
        direction = 1;
        this.player.flipX = false;
        vx = speed;
        if (this.player.body.velocity.y === 0) {
          this.player.anims.play('walk-side', true);
        }
      }

      if (this.cursors.up.isDown || this.keyW.isDown) {
        direction = 0;
        vy = -speed;
        this.player.flipX = false;
        this.player.anims.play('walk-up', true);
      } else if (this.cursors.down.isDown || this.keyS.isDown) {
        direction = 2;
        vy = speed;
        this.player.flipX = false;
        this.player.anims.play('walk-down', true);
      }
      if (vx !== 0 && vy !== 0) {
        vx /= Math.sqrt(2);
        vy /= Math.sqrt(2);
      }
      this.player.setVelocity(vx, vy);

      if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
        this.player.anims.stop();
        if (direction === 0) {
          this.player.setFrame(16);
        } else if (direction === 1 || direction === 3) {
          this.player.setFrame(8);
        } else {
          this.player.setFrame(0);
        }
      }
    }
  }

  changeScene(data) {
    if (data.target_map) {
      this.activePortal = null;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('WorldScene', {
          targetMap: data.target_map,
          targetPoint: data.target_point,
        });
      })
    }
  }
}