export default class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    const {width, height} = this.scale;
    this.input.setDefaultCursor('none');

    const bg = this.add.image(width / 2, height / 2, 'title');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.postFX.addBlur(1, 2, 2, 1);

    this.add.text(this.scale.width / 2, this.scale.height / 4, 'PHASER.JS\n2D WEBSITE GAME', {
      fontSize: '150px',
      fill: '#ffffff',
      fontFamily: 'CuteFantasy',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, this.scale.height / 2, '2 WU 54 YING-HAO LIN', {
      fontSize: '50px',
      fill: '#ffffff',
      fontFamily: 'CuteFantasy',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    this.anims.create({
      key: 'button_press',
      frames: [
        {key: 'startButton', frame: 0},
        {key: 'startButton', frame: 1},
        {key: 'startButton', frame: 2},
        {key: 'startButton', frame: 1},
        {key: 'startButton', frame: 0},
      ],
      frameRate: 15,
      repeat: 0,
    })

    const startButton = this.add.sprite(width / 2, height / 1.5, 'startButton')
      .setInteractive()
      .setScale(10);

    this.customCursor = this.add.sprite(0, 0, 'cursor_normal')
      .setOrigin(0, 0)
      .setScale(4)
      .setDepth(10000);

    startButton.on('pointerover', () => {
      this.customCursor.setTexture('cursor_pointer');
    })

    startButton.on('pointerout', () => {
      this.customCursor.setTexture('cursor_normal');
    })

    startButton.on('pointerdown', () => {
      startButton.play('button_press');
      startButton.once('animationcomplete', () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
      })

      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.customCursor.setTexture('cursor_normal');
        this.scene.start('WorldScene', {
          mapKey: 'initial_room_data',
          targetPoint: 'spawn_point',
        });
      })
    })
  }

  update() {
    if (this.customCursor) {
      this.customCursor.x = this.input.x;
      this.customCursor.y = this.input.y;
    }
  }
}