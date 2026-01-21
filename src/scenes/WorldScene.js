let direction = 2;

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
        const barrier = this.matter.add.rectangle(x, y, obj.width, obj.height, {
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
                  frame: frame.tileid,
                  duration: frame.duration,
                }));

                this.anims.create({
                  key: animKey,
                  frames: frames,
                  repeat: -1,
                })
              }
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
    this.player.setOrigin(0, 0);
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

    // anim
    const animations = [
      ["idle", "down", 0, 6],
      ["idle", "side", 1, 6],
      ["idle", "up", 2, 6],

      ["walk", "down", 3, 6],
      ["walk", "side", 4, 6],
      ["walk", "up", 5, 6],

      ["collapse", null, 6, 4],

      ["climb_ladder", null, 7, 6],

      ["dodge", "down", 8, 8],
      ["dodge", "side", 9, 8],
      ["dodge", "up", 10, 8],

      ["jump", "down", 11, 6],
      ["jump", "side", 12, 6],
      ["jump", "up", 13, 6],

      ["tool_axe", "down", 14, 6],
      ["tool_axe", "side", 15, 6],
      ["tool_axe", "up", 16, 6],

      ["tool_pickaxe", "down", 17, 6],
      ["tool_pickaxe", "side", 18, 6],
      ["tool_pickaxe", "up", 19, 6],

      ["tool_hoe", "down", 20, 6],
      ["tool_hoe", "side", 21, 6],
      ["tool_hoe", "up", 22, 6],

      ["tool_watercan", "down", 23, 6],
      ["tool_watercan", "side", 24, 6],
      ["tool_watercan", "up", 25, 6],
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
          repeat: -1,
        })
      }
    })
    if (this.animatedTiles) {
      this.animatedTiles.init(map);
      this.animatedTiles.setRate(0.50);
    }

    // create ground
    const ground = map.createLayer('ground', tilesetObjects, 0, 0);
    if (ground) {
      ground.setDepth(0);
    }

    // create shadow
    const shadow = map.createLayer('shadow', tilesetObjects, 0, 0);
    if (shadow) {
      shadow.setDepth(1);
    }

    // cameras
    this.cameras.main.setZoom(5);
    this.cameras.main.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.roundPixels = true;
  }

  update(time, delta) {
    if (!this.player.body) {
      console.error('physics problem')
    }
    this.player.setDepth(this.player.y + 5);

    const speed = 1;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) {
      direction = 3;
      this.player.flipX = true;
      vx = -speed;
      if (this.player.body.velocity.y === 0) {
        this.player.anims.play('walk-side', true);
      }
    } else if (this.cursors.right.isDown) {
      direction = 1;
      this.player.flipX = false;
      vx = speed;
      if (this.player.body.velocity.y === 0) {
        this.player.anims.play('walk-side', true);
      }
    }

    if (this.cursors.up.isDown) {
      direction = 0;
      vy = -speed;
      this.player.anims.play('walk-up', true);
    } else if (this.cursors.down.isDown) {
      direction = 2;
      vy = speed;
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
      } else if (direction === 1) {
        this.player.setFrame(8);
      } else if (direction === 2) {
        this.player.setFrame(0);
      } else {
        this.player.setFrame(8);
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (this.activePortal) {
        const data = this.activePortal.portalData;
        if (data.is_door) {
          this.changeScene(data);
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