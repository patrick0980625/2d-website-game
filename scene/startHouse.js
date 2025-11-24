export class startHouse extends Phaser.Scene {
  constructor() {
    super({ key: "startHouse" });
  }
  preload() {}
  create() {
    const mapx = (this.cameras.main.width - map.witchInPixels) / 2;
  }
  update() {}
}
