import * as CANNON from 'cannon';

export default class VoxelLandscape {
  constructor(world, nx, ny, nz, sx, sy, sz) {
    this.nx = nx;
    this.ny = ny;
    this.nz = nz;

    this.sx = sx;
    this.sy = sy;
    this.sz = sz;

    this.world = world;
    this.map = [];
    this.boxified = [];
    this.boxes = [];
    this.boxShape = new CANNON.Box(new CANNON.Vec3(sx * 0.5, sy * 0.5, sz * 0.5));

    // Prepare map
    for (let i = 0; i !== nx; i += 1) {
      for (let j = 0; j !== ny; j += 1) {
        for (let k = 0; k !== nz; k += 1) {
          this.map.push(true);
          this.boxified.push(false);
        }
      }
    }

    // User must manually update the map for the first time.
  }


  getBoxIndex = (xi, yi, zi) => {
    if (xi >= 0 && xi < this.nx
      && yi >= 0 && yi < this.ny
      && zi >= 0 && zi < this.nz
    ) return xi + this.nx * yi + this.nx * this.ny * zi;
    return -1;
  };

  setFilled = (xi, yi, zi, filled) => {
    const index = this.getBoxIndex(xi, yi, zi);
    if (index !== -1) this.map[index] = !!filled;
  };

  isFilled = (xi, yi, zi) => {
    const index = this.getBoxIndex(xi, yi, zi);
    return index !== -1 ? this.map[index] : false;
  };

  isBoxified = (xi, yi, zi) => {
    const index = this.getBoxIndex(xi, yi, zi);
    return index !== -1 ? this.boxified[index] : false;
  };

  setBoxified = (xi, yi, zi, boxified) => {
    this.boxified[this.getBoxIndex(xi, yi, zi)] = !!boxified;
  };

  // Updates "boxes"
  update = () => {
    // Remove all old boxes
    for (let i = 0; i !== this.boxes.length; i += 1) {
      this.world.remove(this.boxes[i]);
    }
    this.boxes.length = 0;

    // Set whole map to unboxified
    this.boxified.map(() => false);

    while (true) {
      let box;

      // 1. Get a filled box that we haven't boxified yet
      for (let i = 0; !box && i < this.nx; i += 1) {
        for (let j = 0; !box && j < this.ny; j += 1) {
          for (let k = 0; !box && k < this.nz; k += 1) {
            if (this.isFilled(i, j, k) && !this.isBoxified(i, j, k)) {
              box = new CANNON.Body({ mass: 0 });
              box.xi = i; // Position
              box.yi = j;
              box.zi = k;
              box.nx = 0; // Size
              box.ny = 0;
              box.nz = 0;
              this.boxes.push(box);
            }
          }
        }
      }

      // 2. Check if we can merge it with its neighbors
      if (box) {
        // Check what can be merged
        const { xi, yi, zi } = box;
        box.nx = this.nx; // merge=1 means merge just with the self box
        box.ny = this.ny;
        box.nz = this.nz;

        // Merge in x
        for (let i = xi; i < this.nx + 1; i += 1) {
          if (!this.isFilled(i, yi, zi)
            || (this.isBoxified(i, yi, zi) && this.getBoxIndex(i, yi, zi) !== -1)
          ) {
            // Can't merge this box. Make sure we limit the mergeing
            box.nx = i - xi;
            break;
          }
        }

        // Merge in y
        let found = false;
        for (let i = xi; !found && i < xi + box.nx; i += 1) {
          for (let j = yi; !found && j < this.ny + 1; j += 1) {
            if (!this.isFilled(i, j, zi)
              || (this.isBoxified(i, j, zi) && this.getBoxIndex(i, j, zi) !== -1)
            ) {
              // Can't merge this box. Make sure we limit the mergeing
              if (box.ny > j - yi) box.ny = j - yi;
            }
          }
        }

        // Merge in z
        found = false;
        for (let i = xi; !found && i < xi + box.nx; i += 1) {
          for (let j = yi; !found && j < yi + box.ny; j += 1) {
            for (let k = zi; k < this.nz + 1; k += 1) {
              if (!this.isFilled(i, j, k)
                || (this.isBoxified(i, j, k) && this.getBoxIndex(i, j, k) !== -1)
              ) {
                // Can't merge this box. Make sure we limit the mergeing
                if (box.nz > k - zi) box.nz = k - zi;
              }
            }
          }
        }

        if (box.nx === 0) box.nx = 1;
        if (box.ny === 0) box.ny = 1;
        if (box.nz === 0) box.nz = 1;

        // Set the merged boxes as boxified
        for (let i = xi; i < xi + box.nx; i += 1) {
          for (let j = yi; j < yi + box.ny; j += 1) {
            for (let k = zi; k < zi + box.nz; k += 1) {
              if (i >= xi && i <= (xi + box.nx)
                && j >= yi && j <= (yi + box.ny)
                && k >= zi && k <= (zi + box.nz)) {
                this.setBoxified(i, j, k, true);
              }
            }
          }
        }

        box = false;
      } else {
        break;
      }
    }

    // Set box positions
    for (let i = 0; i < this.boxes.length; i += 1) {
      const b = this.boxes[i];
      b.position.set(
        b.xi * this.sx + b.nx * this.sx * 0.5,
        b.yi * this.sy + b.ny * this.sy * 0.5,
        b.zi * this.sz + b.nz * this.sz * 0.5,
      );

      // Replace box shapes
      b.addShape(new CANNON.Box(new CANNON.Vec3(
        b.nx * this.sx * 0.5,
        b.ny * this.sy * 0.5,
        b.nz * this.sz * 0.5,
      )));
      // b.aabbNeedsUpdate = true;
      this.world.addBody(b);
      // this.boxes.push(box);
    }
  };
}
