import CannonScene from './CannonScene';
import ThreeScene from './ThreeScene';

export default class Game {
  constructor({ sceneWidth, sceneHeight }) {
    // const player = new Player();
    this.cannonScene = new CannonScene();
    this.threeScene = new ThreeScene({
      sceneWidth,
      sceneHeight,
      voxels: this.cannonScene.voxels,
      world: this.cannonScene.world,
    });
  }

  renderToDomElement(domElement) {
    this.threeScene.renderToDomElement(domElement);
  }
}
