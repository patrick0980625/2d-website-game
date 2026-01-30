export default class UIScene extends Phaser.Scene {
  constructor() {
    super({key: 'UIScene', active: false});
  }

  create() {
    const offsetX = -30;
    const offsetY = 60;
    const offsetBar = 130;
    const {width, height} = this.scale;
    this.scaleRate = (this.scale.width > 800 && this.scale.height > 600) ? 5 : 3;
    this.lastHp = this.hp;

    this.add.image(offsetX, offsetY, 'ui-player-health-bar', 0)
      .setOrigin(0, 0.5)
      .setScale(this.scaleRate)
      .setScrollFactor(0);

    this.add.image(offsetX, offsetY, 'ui-player-health-bar', 1)
      .setOrigin(0, 0.5)
      .setScale(this.scaleRate)
      .setScrollFactor(0);

    this.hpBarBack = this.add.image(offsetX + offsetBar, offsetY, 'ui-player-health-bar', 2)
      .setOrigin(0, 0.5)
      .setScale(this.scaleRate)
      .setScrollFactor(0);

    this.hpBarFront = this.add.image(offsetX + offsetBar, offsetY, 'ui-player-health-bar', 3)
      .setOrigin(0, 0.5)
      .setScale(this.scaleRate)
      .setScrollFactor(0);

    this.add.image(offsetX, offsetY, 'ui-player-health-bar', 4)
      .setOrigin(0, 0.5)
      .setScale(this.scaleRate)
      .setScrollFactor(0);

    const WorldScene = this.scene.get('WorldScene');
    this.textContainer = this.add.container(width / 2, height - 150).setVisible(false);
    const bg = this.add.image(0, 0, 'text_box');
    bg.setScale(this.scaleRate);
    bg.setOrigin(0.5);

    const bgWidth = bg.displayWidth;
    const bgHeight = bg.displayHeight;
    const padding = 200;
    const maxTextWidth = bgWidth - padding;

    this.nameText = this.add.text(-bgWidth / 2 + 150, -bgHeight / 2 + 40, '', {
      fontFamily: 'CuteFantasy',
      fontSize: '40px',
      color: '#000',
    }).setOrigin(0, 0.5);

    this.dialogText = this.add.text(-maxTextWidth / 2, -60, '', {
      fontFamily: 'CuteFantasy',
      fontSize: '40px',
      color: '#000',
      wordWrap: {width: maxTextWidth, useAdvancedWrap: true},
      lineSpacing: 10,
      align:'left',
    }).setOrigin(0);

    this.nextIndicator = this.add.text(bgWidth / 2 - 100, bgHeight / 2 - 80, '▼', {
      fontFamily: 'CuteFantasy',
      fontSize: '40px',
      fill: '#000',
    }).setOrigin(1, 1).setVisible(false);

    this.textContainer.add([bg, this.nameText, this.nextIndicator, this.dialogText]);
    this.textContainer.setDepth(1000);

    this.enter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.isTyping = false;

    WorldScene.events.on('show-dialog', (data) => {
      if (!this.isTyping) {
        this.startTyping(data);
      }
    })

    if (WorldScene) {
      WorldScene.events.off('player-hp-changed')
      WorldScene.events.on('player-hp-changed', (hp, maxHp) => {
        this.updateHP(hp, maxHp);
      })
    }
    if (WorldScene.player) {
      this.updateHP(WorldScene.player.hp, WorldScene.player.maxHp);
    }
  }

  update() {
    if (this.textContainer.visible && Phaser.Input.Keyboard.JustDown(this.enter)) {
      if (this.isTyping) {
        this.typeTimer.remove();
        this.dialogText.setText(this.currentFullText);
        this.isTyping = false;
        this.showNextIndicator();
      } else {
        this.textContainer.setVisible(false);
        this.tweens.killTweensOf(this.nextIndicator);
      }
    }
  }

  updateHP(hp, maxHp) {
    if (!maxHp || maxHp === 0) {
      return;
    }

    const ratio = Math.max(0, hp / maxHp);
    this.hpBarFront.setScale(ratio * this.scaleRate, this.scaleRate);
    this.tweens.add({
      targets: this.hpBarBack,
      scaleX: ratio * this.scaleRate,
      duration: 300,
      ease: 'Cubic.easeOut',
      overwrite: true
    })

    if (hp < this.lastHp) {
      this.tweens.add({
        targets: [this.hpBarFront, this.hpBarBack],
        x: '+=3',
        duration: 50,
        yoyo: true,
        repeat: 3
      })
    }
    this.lastHp = hp;
  }

  startTyping(data) {
    const name = typeof data === 'object' ? data.name : "";
    const text = typeof data === 'object' ? data.text : data;

    this.textContainer.setVisible(true);
    this.nextIndicator.setVisible(false);
    this.nameText.setText(name);
    this.dialogText.setText('');
    this.isTyping = true;
    this.currentFullText = text;

    let index = 0;
    if (this.typeTimer) {
      this.typeTimer.remove();
    }

    this.typeTimer = this.time.addEvent({
      delay: 60,
      repeat: text.length - 1,
      callback: () => {
        this.dialogText.text += text[index];
        index++;

        if (index === text.length) {
          this.isTyping = false;
          this.showNextIndicator();
        }
      }
    })
  }

  showNextIndicator() {
    this.nextIndicator.setVisible(true);
    this.tweens.add({
      targets: this.nextIndicator,
      y: "+=5",
      duration: 400,
      yoyo: true,
      repeat: -1,
    })
  }
}