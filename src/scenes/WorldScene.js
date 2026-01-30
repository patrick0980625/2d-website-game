import Player from '../player/Player.js';
import GoblinArcher from "../enemy/GoblinArcher.js";
import GoblinThief from "../enemy/GoblinThief.js";
import GoblinMaceman from "../enemy/GoblinMaceman.js";
import OrcChief from "../enemy/OrcChief.js";
import Slime from "../enemy/Slime.js";

if (!window.gameState) {
  window.gameState = {
    isOrcDefeated: false,
    isGateOpen: false,
    hasKey: false,
  };
}

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super("WorldScene");
  }

  init(data) {
    this.currentMapKey = data.targetMap || 'initial_room_data';
    this.spawnPointName = data.targetPoint || 'spawn_point';
    window.gameState.lastMap = this.currentMapKey;
  }

  create() {
    // load json
    const data = this.cache.json.get('manifest');
    if (!data) {
      return;
    }

    // initial setting
    this.teleportPoints = new Map();
    this.gateGroups = new Map();
    this.activePortal = null;
    this.scene.launch('UIScene');

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
        const isThroughable = obj.properties?.find(p => p.name === 'throughable')?.value || false;
        const label = isThroughable ? 'throughable' : 'collision';

        const x = obj.x + obj.width / 2;
        const y = obj.y + obj.height / 2;
        this.matter.add.rectangle(x, y, obj.width, obj.height, {
          isStatic: true,
          label: label,
          friction: isThroughable ? 0 : 0.1,
        })
      })
    }

    // create deco object
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

            const properties = p.properties ? p.properties.reduce((acc, prop) => {
              acc[prop.name] = prop.value;
              return acc;
            }, {}) : {};

            const animKey = `anim-${textureKey}-${frameIndex}`;
            const tileData = tileset.tileData && tileset.tileData[frameIndex];

            if (tileData && tileData.animation && !this.anims.exists(animKey)) {
              this.anims.create({
                key: animKey,
                frames: tileData.animation.map(f => ({
                  key: textureKey,
                  frame: f.tileid,
                  duration: f.duration,
                })),
                repeat: properties.gateID ? 0 : -1,
              })
            }

            if (properties.gateID) {
              const gID = properties.gateID;
              if (!this.gateGroups.has(gID)) {
                this.gateGroups.set(gID, {sprites: [], isOpen: window.gameState.isGateOpen});
              }

              const group = this.gateGroups.get(gID);
              group.sprites.push(sprite);
              sprite.setData('gateAnim', animKey);

              if (window.gameState.isGateOpen) {
                sprite.play(animKey);
                sprite.anims.setProgress(1);
              }
            } else {
              if (tileData && tileData.animation) {
                sprite.play(animKey);
              }
            }

            if (properties.alwaysUnder) {
              sprite.setDepth(1);
            }
          }
        })
      })
    }

    // create player
    Player.createAnimations(this);
    const spawn = this.teleportPoints.get(this.spawnPointName) || {x: 100, y: 100};
    this.player = new Player({
      scene: this,
      x: spawn.x,
      y: spawn.y,
      texture: 'player',
    })

    // create enemy
    GoblinArcher.createAnimations(this);
    GoblinThief.createAnimations(this);
    GoblinMaceman.createAnimations(this);
    OrcChief.createAnimations(this);
    Slime.createAnimations(this);
    this.enemies = [];
    this.projectiles = [];

    const enemy = map.getObjectLayer('enemy');
    if (enemy) {
      enemy.objects.forEach(obj => {
        if (obj.name === 'goblin') {
          if (obj.type === 'archer') {
            const goblin = new GoblinArcher(this, obj.x, obj.y);
            this.enemies.push(goblin);
          } else if (obj.type === 'thief') {
            const goblin = new GoblinThief(this, obj.x, obj.y);
            this.enemies.push(goblin);
          } else if (obj.type === 'maceman') {
            const goblin = new GoblinMaceman(this, obj.x, obj.y);
            this.enemies.push(goblin);
          }
        } else if (obj.name === 'slime') {
          const slime = new Slime(this, obj.x, obj.y);
          this.enemies.push(slime);
        } else if (obj.name === 'orc') {
          if (obj.type === 'chief') {
            if (!window.gameState.isOrcDefeated) {
              const orc = new OrcChief(this, obj.x, obj.y);
              this.enemies.push(orc);
            }
          }
        }
      })
    }


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

    // anim
    if (this.animatedTiles) {
      this.animatedTiles.init(map);
      this.animatedTiles.setRate(0.50);
    }

    // create ground
    const ground = map.createLayer('ground', tilesetObjects, 0, 0);
    if (ground) {
      ground.setDepth(-2);
    }

    // create aboveGround
    const aboveGround = map.createLayer('aboveGround', tilesetObjects, 0);
    if (aboveGround) {
      aboveGround.setDepth(-1);
    }

    // create shadow
    const shadow = map.createLayer('shadow', tilesetObjects, 0, 0);
    if (shadow) {
      shadow.setDepth(0);
    }

    // player interact
    this.events.on('player-interact', (player) => {
      if (this.activePortal) {
        const data = this.activePortal.portalData;

        if (data.is_locked) {
          const gate = this.gateGroups.get(data.requireGate);
          if (gate && gate.isOpen) {
            this.changeScene(data);
            return;
          } else {
            if (window.gameState.hasKey) {
              this.unlockGate(data.requireGate);
              this.events.emit('show-dialog', "The gate is slowly opening...");
              return;
            } else {
              this.events.emit('show-dialog', "The gate is locked.\nYou need a key to open the gate.\nGo back to the forest and defeat the Orc!");
              return;
            }
          }
        }

        if (data.is_door) {
          this.changeScene(data);
        }
      }

      this.loots.getChildren().forEach(loot => {
        const d = Phaser.Math.Distance.Between(player.x, player.y, loot.x, loot.y);
        if (d < 30) {
          this.collectLoot(loot);
        }
      })
    })

    this.events.once('shutdown', () => {
      this.events.off('player-interact');
    })


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

    // keyboard prevent conflict
    this.input.mouse.disableContextMenu();

    this.input.keyboard.on('keydown', (e) => {
      const conflictKeys = ['Tab', 'Alt', 'Control', 'w', 'a', 's', 'd', 'e'];
      if (conflictKeys.includes(e.key) || e.ctrlKey) {
        e.preventDefault();
      }
    });

    // loot
    this.loots = this.add.group();

    this.events.on('spawn-loot', (data) => {
      const loot = this.matter.add.sprite(data.x, data.y, data.type);
      loot.setSensor(true);
      loot.id = data.id;
      loot.setDepth(loot.y);

      this.tweens.add({
        targets: loot,
        y: '-=10',
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      this.loots.add(loot);
    })

    // player death
    this.events.on('player-die', () => {
      this.handlePlayerDeath();
    })

    this.events.on('shutdown', () => {
      this.events.off('player-die');
      this.events.off('player-interact');
    })

    this.input.keyboard.on('keydown-F', () => {
      this.events.emit('show-dialog', {text: "Press F to pay respects.", name: "Jack"});
    });
  }

  update(time, delta) {
    // player
    if (!this.player || !this.player.body) {
      return;
    }
    this.player.update();

    // enemy
    this.enemies.forEach(e => {
      if (e.active) {
        e.update(time, delta);
      }
    })
    this.enemies = this.enemies.filter(e => e.active);

    // arrow
    this.projectiles = this.projectiles.filter(p => p.active);
    this.projectiles.forEach(p => p.update(time, delta));
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

  collectLoot(loot) {
    if (loot.id === "castle_key") {
      window.gameState.hasKey = true;
      console.log('get key');
    }

    this.tweens.killTweensOf(loot);
    this.player.inventory = this.player.inventory || [];
    this.player.inventory.push(loot.id);

    this.tweens.add({
      targets: loot,
      alpha: 0,
      scale: 2,
      y: loot.y - 20,
      duration: 200,
      onComplete: () => {
        loot.destroy()
      },
    })
  }

  unlockGate(gID) {
    const group = this.gateGroups.get(gID);
    if (!group) {
      return;
    }

    group.isOpen = true;
    window.gameState.isGateOpen = true;

    group.sprites.forEach(s => {
      const key = s.getData('gateAnim');
      if (key) {
        s.play(key);
      }
    })
    this.cameras.main.shake(200, 0.005);
  }

  handlePlayerDeath() {
    this.enemies.forEach(e => {
      if (e.active) {
        e.stopMovement();
      }
    })

    this.cameras.main.flash(500, 255, 0, 0);
    this.time.delayedCall(1000, () => {
      this.cameras.main.fadeOut(1000, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.restart({
          targetMap: window.gameState.currentMapKey,
          targetPoint: 'spawn_point' || {x: 100, y: 100},
        })
      })
    })
  }
}