/* eslint no-param-reassign: ["error", { "props": false }] */

import React from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import GLTFLoader from 'three-gltf-loader';

export default class ThreeScene extends React.Component {
  propTypes = {
    sceneWidth: PropTypes.number.isRequired,
    sceneHeight: PropTypes.number.isRequired,
    voxels: PropTypes.shape({}).isRequired,
  }

  constructor(props) {
    super(props);
    const {
      sceneWidth,
      sceneHeight,
      voxels,
      world,
    } = props;
    this.width = sceneWidth;
    this.height = sceneHeight;
    this.voxels = voxels;
    this.world = world;
    this.balls = [];
    this.cursor = 0;
    this.cycleAnimations = this.cycleAnimations.bind(this);
    this.idleWeight = 0.0;
    this.walkWeight = 0.0;
    this.runWeight = 1.0;
    this.dt = 1 / 60;

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
    this.camera.position.set(1, 2, -3);
    this.camera.lookAt(0, 1, 0);

    // this.controls = new OrbitControls(this.camera);
    // this.controls.target.set(0, 1, 0);
    // this.controls.update();

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa0a0a0);
    this.scene.fog = new THREE.Fog(0xa0a0a0, 10, 50);

    this.addLights();

    this.addGround();

    const loader = new GLTFLoader();
    loader.load('/models/gltf/Soldier.glb', (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });

      this.scene.add(gltf.scene);

      this.mixer = new THREE.AnimationMixer(gltf.scene);
      this.idleAction = this.mixer.clipAction(gltf.animations[0]);
      this.walkAction = this.mixer.clipAction(gltf.animations[3]);
      this.runAction = this.mixer.clipAction(gltf.animations[1]);
      this.actions = [this.idleAction, this.walkAction, this.runAction];
      this.crossfades = [
        this.fromWalkToIdle,
        this.fromIdleToWalk,
        this.fromWalkToRun,
        this.fromRunToWalk,
      ];
      this.activateAllActions();
      this.start();
    }, undefined, error => console.error('An error happened', error));

    // voxels
    this.boxMeshes = [];
    for (let i = 0; i < this.voxels.boxes.length; i += 1) {
      const b = this.voxels.boxes[i];
      const voxelGeometry = new THREE.CubeGeometry(
        this.voxels.sx * b.nx,
        this.voxels.sy * b.ny,
        this.voxels.sz * b.nz,
      );
      const voxelMesh = new THREE.Mesh(voxelGeometry, this.material);
      voxelMesh.castShadow = true;
      voxelMesh.receiveShadow = true;
      this.scene.add(voxelMesh);
      this.boxMeshes.push(voxelMesh);
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;
    this.renderer.shadowMap.enabled = true;
  }

  componentDidMount() {
    window.addEventListener('resize', this.updateDimensions);
    document.addEventListener('keydown', this.cycleAnimations, true);
  }

  // Stops animation, and removes scene
  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
    document.removeEventListener('keydown', this.cycleAnimations);
    cancelAnimationFrame(this.frameId);
    this.domElement.removeChild(this.renderer.domElement);
  }

  fromWalkToIdle = () => {
    this.prepareCrossFade(this.walkAction, this.idleAction, 1.0);
  }

  fromIdleToWalk = () => {
    this.prepareCrossFade(this.idleAction, this.walkAction, 0.5);
  }

  fromWalkToRun = () => {
    this.prepareCrossFade(this.walkAction, this.runAction, 2.5);
  }

  fromRunToWalk = () => {
    this.prepareCrossFade(this.runAction, this.walkAction, 5.0);
  }

  // This function is needed, since animationAction.crossFadeTo() disables its start action and sets
  // the start action's timeScale to ((start animation's duration) / (end animation's duration))
  setWeight = (action, weight) => {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
  }

  // Called on each frame
  animate = () => {
    // Render loop
    this.frameId = requestAnimationFrame(this.animate);

    // Get the time elapsed since the last frame, used for mixer update (if not in single step mode)
    const mixerUpdateDelta = this.clock.getDelta();

    // if (this.controls.enabled) {
    this.world.step(this.dt);
    // Update ball positions
    for (let i = 0; i < this.balls.length; i += 1) {
      this.ballMeshes[i].position.copy(this.balls[i].position);
      this.ballMeshes[i].quaternion.copy(this.balls[i].quaternion);
    }

    // Update box positions
    for (let i = 0; i < this.voxels.boxes.length; i += 1) {
      this.boxMeshes[i].position.copy(this.voxels.boxes[i].position);
      this.boxMeshes[i].quaternion.copy(this.voxels.boxes[i].quaternion);
    }
    // }
    // Update the animation mixer, controls, and render this frame
    this.mixer.update(mixerUpdateDelta);
    // this.controls.update(Date.now() - this.time);
    this.renderer.render(this.scene, this.camera);
    this.time = Date.now();
  }

  cycleAnimations({ keyCode }) {
    if (keyCode === 38) {
      // Up arrow
      this.cursor = this.cursor > 0
        ? this.cursor - 1
        : this.crossfades.length - 1;
      this.crossfades[this.cursor]();
    } else if (keyCode === 40) {
      // Down arrow
      this.cursor = this.cursor < this.crossfades.length - 1
        ? this.cursor + 1
        : this.crossfades.length - 1;
      this.crossfades[this.cursor]();
    }
  }

  prepareCrossFade(startAction, endAction, duration) {
    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop
    if (startAction === this.idleAction) {
      this.executeCrossFade(startAction, endAction, duration);
    } else {
      // Synchronize cross fade
      const onLoopFinished = (event) => {
        if (event.action === startAction) {
          this.mixer.removeEventListener('loop', onLoopFinished);
          this.executeCrossFade(startAction, endAction, duration);
        }
      };

      this.mixer.addEventListener('loop', onLoopFinished);
    }
  }

  executeCrossFade(startAction, endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    this.setWeight(endAction, 1);
    endAction.time = 0;
    // Crossfade with warping - you can also try without warping by setting the
    // third parameter to false
    startAction.crossFadeTo(endAction, duration, true);
  }

  // Starts the animation
  start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  activateAllActions() {
    this.setWeight(this.idleAction, this.idleWeight);
    this.setWeight(this.walkAction, this.walkWeight);
    this.setWeight(this.runAction, this.runWeight);
    this.actions.forEach((action) => {
      action.play();
    });
  }

  addLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
    this.hemiLight.position.set(0, 20, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff);
    this.dirLight.position.set(-3, 10, -10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.camera.top = 2;
    this.dirLight.shadow.camera.bottom = -2;
    this.dirLight.shadow.camera.left = -2;
    this.dirLight.shadow.camera.right = 2;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 40;
    this.scene.add(this.dirLight);
  }

  addGround() {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(100, 100),
      new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  // Fits scene to screen
  updateDimensions() {
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // Renders the scene to a given dom element
  renderToDomElement(domElement) {
    this.domElement = domElement.current;
    return this.domElement.appendChild(this.renderer.domElement);
  }
}
