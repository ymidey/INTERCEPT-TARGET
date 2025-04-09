import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();

const textures = {
  spaceship1: loadTexture('./img/spaceship1.png'),
  spaceship2: loadTexture('./img/spaceship2.png'),
  bonus: loadTexture('./img/spaceship3.png'),
  freeze: loadTexture('./img/Frame 127.png')
};

export const TYPE = {
  SPACESHIP_1: 1,
  SPACESHIP_2: 2,
  BONUS: 3,
  FREEZE: 4
};

export const getTarget = (type) => {
  let mesh;

  switch (type) {
    case TYPE.SPACESHIP_1:
      mesh = createTexturedPlane(textures.spaceship1);
      mesh.userData = {
        gain: 10,
        speed: 3.5,
        initialSpeed: 3.5,
        maxSpeed: 110.5,
        position: 15,
        type: TYPE.SPACESHIP_1
      };
      break;

    case TYPE.SPACESHIP_2:
      mesh = createTexturedPlane(textures.spaceship2);
      mesh.userData = {
        gain: 50,
        speed: 5.5,
        initialSpeed: 5.5,
        maxSpeed: 120.5,
        position: 100,
        type: TYPE.SPACESHIP_2
      };
      break;

    case TYPE.BONUS:
      mesh = createTexturedPlane(textures.bonus);
      mesh.userData = {
        gain: 100,
        speed: 7,
        initialSpeed: 7,
        maxSpeed: 130,
        position: 150,
        type: TYPE.BONUS
      };
      break;

    case TYPE.FREEZE:
      mesh = createTexturedPlane(textures.freeze);
      mesh.userData = {
        gain: 0,
        speed: 10.5,
        initialSpeed: 10.5,
        maxSpeed: 300.5,
        freezeDuration: 1,
        position: 400,
        type: TYPE.FREEZE
      };
      break;
  }

  return mesh;
};

function createTexturedPlane(texture) {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(geometry, material);
  return plane;
}

function loadTexture(url) {
  const texture = textureLoader.load(
    url,
    () => {
      console.log(`Texture loaded: ${url}`);
    },
    undefined,
    (err) => {
      console.error(`An error occurred while loading the texture: ${url}`, err);
    }
  );
  return texture;
}
