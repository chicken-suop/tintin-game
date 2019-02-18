/* eslint no-param-reassign: ["error", { "props": false }] */

import React from 'react';
import * as CANNON from 'cannon';
import VoxelLandscape from './VoxelLandscape';

export default class CannonScene extends React.Component {
  constructor() {
    super();
    // Setup our world
    this.cannonWorld = new CANNON.World();
    this.cannonWorld.quatNormalizeSkip = 0;
    this.cannonWorld.quatNormalizeFast = false;
    this.cannonWorld.defaultContactMaterial.contactEquationStiffness = 1e9;
    this.cannonWorld.defaultContactMaterial.contactEquationRelaxation = 4;
    this.cannonWorld.gravity.set(0, -20, 0);
    this.cannonWorld.broadphase = new CANNON.NaiveBroadphase();
    this.cannonWorld.broadphase.useBoundingBoxes = true;
    this.solver = new CANNON.GSSolver();
    this.solver.iterations = 7;
    this.solver.tolerance = 0.1;
    this.cannonWorld.solver = new CANNON.SplitSolver(this.solver);

    // Create a slippery material (friction coefficient = 0.0)
    this.physicsMaterial = new CANNON.Material('slipperyMaterial');
    const physicsContactMaterial = new CANNON.ContactMaterial(
      this.physicsMaterial,
      this.physicsMaterial,
      0.0, // friction coefficient
      0.3, // restitution
    );

    // We must add the contact materials to the world
    this.cannonWorld.addContactMaterial(physicsContactMaterial);
    const nx = 50;
    const ny = 8;
    const nz = 50;
    const sx = 0.5;
    const sy = 0.5;
    const sz = 0.5;

    // Create a sphere
    const mass = 5;
    const radius = 1.3;

    this.sphereShape = new CANNON.Sphere(radius);
    this.sphereBody = new CANNON.Body({ mass, material: this.physicsMaterial });
    this.sphereBody.addShape(this.sphereShape);
    this.sphereBody.position.set(nx * sx * 0.5, ny * sy + radius * 2, nz * sz * 0.5);
    this.sphereBody.linearDamping = 0.9;
    this.cannonWorld.addBody(this.sphereBody);

    // Create a plane
    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.groundBody.position.set(0, 0, 0);
    this.cannonWorld.addBody(this.groundBody);

    this.voxelLandscape = new VoxelLandscape(this.cannonWorld, nx, ny, nz, sx, sy, sz);
    for (let i = 0; i < nx; i += 1) {
      for (let j = 0; j < ny; j += 1) {
        for (let k = 0; k < nz; k += 1) {
          let filled = true;

          // Insert map constructing logic here
          if (Math.sin(i * 0.1) * Math.sin(k * 0.1) < j / ny * 2 - 1) {
            filled = false;
          }

          this.voxelLandscape.setFilled(i, j, k, filled);
        }
      }
    }

    this.voxelLandscape.update();
    console.log(`${this.voxelLandscape.boxes.length} voxel physics bodies`);
  }

  get voxels() {
    return this.voxelLandscape;
  }

  get world() {
    return this.cannonWorld;
  }
}
