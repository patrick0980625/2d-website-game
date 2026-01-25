import Player from '../player/Player.js';
import GoblinArcher from "../enemy/GoblinArcher.js";
import GoblinThief from "../enemy/GoblinThief.js";
import Slime from "../enemy/Slime.js";

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
        const isThroughable = obj.properties?.find(p => p.name === 'throughable')?.value || false;
        const label = isThroughable ? 'throughable' : 'collision';

        const x = obj.x + obj.width / 2;
        const y = obj.y + obj.height / 2;
        this.matter.add.rectangle(x, y, obj.width, obj.height, {
          isStatic: true,
          label: label,
          friction : isThroughable ? 0 : 0.1,
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
          }
        } else if (obj.name === 'slime') {
          const slime = new Slime(this, obj.x, obj.y);
          this.enemies.push(slime);
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

    // teleport
    this.events.on('player-interact', () => {
      if (this.activePortal) {
        const data = this.activePortal.portalData;
        if (data.is_door) {
          this.changeScene(data);
        }
      }
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
    this.projectiles.forEach(p=> p.update(time, delta));
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