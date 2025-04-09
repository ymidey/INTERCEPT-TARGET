import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TYPE, getTarget } from './targets';
import { GameMenu } from './menu';

const initialConfig = {
    playerScore: 0,
    playerLives: 3,
    gameActive: true,
    gameInitialized: false,
    freezeTime: 0,
    freezeStartTime: 0,
    originalBackgroundColor: 0x000000,
    freezeBackgroundColor: 0x00008B,
    transitionBackgroundColor: 0xffffff,
    greenBackgroundColor: 0x006400,
    purpleBackgroundColor: 0x800080,
    darkBrownBackgroundColor: 0x8B4513,
    darkYellowBackgroundColor: 0xFFD700,
    darkRedBackgroundColor: 0x8B0000,
    preFreezeColor: null,
    transitionDuration: 3,
    speedIncreaseFactor: 1,
    respawnDelay: 2,
    bestScore: localStorage.getItem('bestScore') || 0,
    transitionStartTime: 0,
    secondTransitionStartTime: 0,
    thirdTransitionStartTime: 0,
    fourTransitionStartTime: 0,
    fiveTransitionStartTime: 0,
    sixTransitionStartTime: 0,
    lastTickTime: 0
};

const gameMusic = document.getElementById('gameMusic');
gameMusic.loop = true;
const laserSound = document.createElement('audio');
laserSound.src = './music/laser.mp3';

const explosionSounds = [
    document.createElement('audio'),
    document.createElement('audio'),
    document.createElement('audio')
];
explosionSounds[0].src = './music/explosion1.mp3';
explosionSounds[1].src = './music/explosion2.mp3';
explosionSounds[2].src = './music/explosion3.mp3';

const snowballSound = document.createElement('audio');
snowballSound.src = './music/freeze.mp3';

document.body.style.cursor = 'url("./img/cible_.png"), auto';

const canvas = document.querySelector('canvas.webgl');
canvas.style.display = 'none';

const scene = new THREE.Scene();
scene.background = new THREE.Color(initialConfig.originalBackgroundColor);

const startMenu = new GameMenu(startGame);
const mapLevel1 = [
    TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1,
    TYPE.SPACESHIP_2, TYPE.SPACESHIP_2, TYPE.BONUS, TYPE.FREEZE
];

const targets = [];
const respawnTimes = [];
let explosionParticles = [];

let SCREEN_LIMIT = { LEFT: -15, RIGHT: 10 };

function initializeTargets() {
    mapLevel1.forEach(type => {
        const target = getTarget(type);
        if (target && target.userData) {
            target.userData.type = type;
            respawn(target);
            scene.add(target);
            targets.push(target);
            respawnTimes.push(0);

        } else {
            console.error(`Target of type ${type} is not correctly initialized.`);
        }
    });
}

const scoreDiv = createUIElement('right', '10px', `Score: ${initialConfig.playerScore}`);
const livesDiv = createUIElement('left', '10px', ``);
const gameOverDiv = createGameOverElement();

// Create heart images for lives
for (let i = 0; i < initialConfig.playerLives; i++) {
    const heartImg = document.createElement('img');
    heartImg.src = './img/heart.png';
    heartImg.style.width = '100px';
    heartImg.style.height = '100px';
    heartImg.style.marginRight = '5px';
    livesDiv.appendChild(heartImg);
}

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 8;
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: canvas
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

document.addEventListener('click', handleClick);

function handleClick(event) {
    if (!initialConfig.gameActive || !initialConfig.gameInitialized) return;

    laserSound.currentTime = 0;
    laserSound.play();

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        handleTargetHit(intersects[0]);
    }
}

const clock = new THREE.Clock();

function handleColorTransition(startTime, duration, colorStart, colorEnd, elapsedTime) {
    if (startTime > 0 && elapsedTime < startTime + duration) {
        const transitionElapsedTime = elapsedTime - startTime;
        const t = Math.min(transitionElapsedTime / duration, 1);
        scene.background.lerpColors(new THREE.Color(colorStart), new THREE.Color(colorEnd), t);
    }
}

function updateScreenLimits() {
    const aspectRatio = sizes.width / sizes.height;
    const limit = 15 * aspectRatio;
    SCREEN_LIMIT.LEFT = -limit;
    SCREEN_LIMIT.RIGHT = limit;
}

function createExplosion(position) {
    const explosionGeometry = new THREE.BufferGeometry();
    const explosionMaterial = new THREE.PointsMaterial({
        color: 0xcecece,
        size: 0.1,
        transparent: true,
        opacity: 1.0
    });

    const positions = new Float32Array(200 * 3);
    explosionGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const explosion = new THREE.Points(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);

    // Animer l'explosion
    const velocities = new Float32Array(200 * 3);
    for (let i = 0; i < velocities.length; i += 3) {
        velocities[i] = (Math.random() - 0.5) * 2;
        velocities[i + 1] = (Math.random() - 0.5) * 2;
        velocities[i + 2] = (Math.random() - 0.5) * 2;
    }
    explosion.userData.velocities = velocities;
    explosion.userData.time = 0;

    explosionParticles.push(explosion);
    scene.add(explosion);
}

function updateExplosions(deltaTime) {
    explosionParticles = explosionParticles.filter(explosion => {
        explosion.userData.time += deltaTime;
        const positions = explosion.geometry.attributes.position.array;
        const velocities = explosion.userData.velocities;

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime * 2;
            positions[i + 1] += velocities[i + 1] * deltaTime * 2;
            positions[i + 2] += velocities[i + 2] * deltaTime * 2;
        }

        explosion.geometry.attributes.position.needsUpdate = true;
        explosion.material.opacity = 1.0 - explosion.userData.time * 0.5;

        return explosion.userData.time < 2;
    });
}

function tick() {
    if (!initialConfig.gameActive || !initialConfig.gameInitialized) return;

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - initialConfig.lastTickTime;
    initialConfig.lastTickTime = elapsedTime;

    let livesLost = 0;

    if (elapsedTime >= 15 && initialConfig.transitionStartTime === 0) {
        initialConfig.transitionStartTime = elapsedTime;
    }

    if (elapsedTime >= 24 && initialConfig.secondTransitionStartTime === 0) {
        initialConfig.secondTransitionStartTime = elapsedTime;
    }

    if (elapsedTime >= 33 && initialConfig.thirdTransitionStartTime === 0) {
        initialConfig.thirdTransitionStartTime = elapsedTime;
    }
    if (elapsedTime >= 65 && initialConfig.freezeTime === 0) {
        initialConfig.fourTransitionStartTime = elapsedTime;
    }
    if (elapsedTime >= 95 && initialConfig.fourTransitionStartTime === 0) {
        initialConfig.fiveTransitionStartTime = elapsedTime;
    }
    if (elapsedTime >= 118 && initialConfig.fiveTransitionStartTime === 0) {
        initialConfig.sixTransitionStartTime = elapsedTime;
    }
    handleColorTransition(initialConfig.transitionStartTime, initialConfig.transitionDuration, initialConfig.originalBackgroundColor, initialConfig.transitionBackgroundColor, elapsedTime);
    handleColorTransition(initialConfig.secondTransitionStartTime, initialConfig.transitionDuration, initialConfig.transitionBackgroundColor, initialConfig.greenBackgroundColor, elapsedTime);
    handleColorTransition(initialConfig.thirdTransitionStartTime, initialConfig.transitionDuration, initialConfig.greenBackgroundColor, initialConfig.purpleBackgroundColor, elapsedTime);
    handleColorTransition(initialConfig.fourTransitionStartTime, initialConfig.transitionDuration, initialConfig.purpleBackgroundColor, initialConfig.darkBrownBackgroundColor, elapsedTime);
    handleColorTransition(initialConfig.fiveTransitionStartTime, initialConfig.transitionDuration, initialConfig.darkBrownBackgroundColor, initialConfig.darkYellowBackgroundColor, elapsedTime);
    handleColorTransition(initialConfig.sixTransitionStartTime, initialConfig.transitionDuration, initialConfig.darkYellowBackgroundColor, initialConfig.darkRedBackgroundColor, elapsedTime);

    if (initialConfig.freezeTime > 0) {
        if (elapsedTime - initialConfig.freezeStartTime < initialConfig.freezeTime) {
            if (!initialConfig.preFreezeColor) {
                initialConfig.preFreezeColor = scene.background.getHex();
            }
            scene.background = new THREE.Color(initialConfig.freezeBackgroundColor);
            requestAnimationFrame(tick);
            renderer.render(scene, camera);
            return;
        } else {
            initialConfig.freezeTime = 0;
            if (initialConfig.preFreezeColor) {
                scene.background = new THREE.Color(initialConfig.preFreezeColor);
                initialConfig.preFreezeColor = null;
            }
        }
    }

    targets.forEach((target, index) => {
        if (initialConfig.freezeTime === 0 && target.userData) {
            target.userData.speed = Math.min(target.userData.speed + initialConfig.speedIncreaseFactor * 0.007, target.userData.maxSpeed);
            target.position.x += target.userData.speed * 0.01;
        }

        if (target.position.x > SCREEN_LIMIT.RIGHT) {
            if (target.userData.type !== TYPE.FREEZE) {
                livesLost++;
            }
            respawnTimes[index] = elapsedTime + initialConfig.respawnDelay;
            respawn(target);
        }
    });

    if (livesLost > 0) {
        initialConfig.playerLives -= livesLost;
        updateLivesDisplay();

        if (initialConfig.playerLives <= 0) {
            initialConfig.gameActive = false;
            scene.background = new THREE.Color(initialConfig.originalBackgroundColor);
            initialConfig.transitionStartTime = 0;
            initialConfig.secondTransitionStartTime = 0;
            initialConfig.thirdTransitionStartTime = 0;
            gameOverDiv.style.display = 'block';
            canvas.style.display = 'none';
            scoreDiv.style.display = 'none';
            livesDiv.style.display = 'none';

            gameMusic.pause();
            gameMusic.currentTime = 0;

            scene.background = new THREE.Color(initialConfig.originalBackgroundColor);

            if (initialConfig.playerScore > initialConfig.bestScore) {
                initialConfig.bestScore = initialConfig.playerScore;
                localStorage.setItem('bestScore', initialConfig.bestScore);
                startMenu.updateScore(`Nouveau meilleur score : ${initialConfig.bestScore}`);
            } else {
                startMenu.updateScore(`Meilleur score : ${initialConfig.bestScore}`);
            }

            setTimeout(() => {
                gameOverDiv.style.display = 'none';
                startMenu.show();
            }, 3000);
        }
    }

    updateExplosions(deltaTime);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}

function startGame() {
    initialConfig.gameInitialized = true;
    initialConfig.gameActive = true;
    initialConfig.backgroundColor = initialConfig.originalBackgroundColor;
    canvas.style.display = 'block';
    scoreDiv.style.display = 'block';
    livesDiv.style.display = 'block';
    initialConfig.transitionStartTime = 0; // Reset transition start time
    initialConfig.secondTransitionStartTime = 0; // Reset second transition start time
    initialConfig.thirdTransitionStartTime = 0; // Reset third transition start time

    resetGameState();
    gameMusic.currentTime = 0;
    gameMusic.volume = 0.4;
    gameMusic.play();
    tick();
}

function resetGameState() {
    initialConfig.playerScore = 0;
    initialConfig.playerLives = 3;
    initialConfig.freezeTime = 0;
    scoreDiv.textContent = `Score: ${initialConfig.playerScore}`;
    updateLivesDisplay();
    gameOverDiv.style.display = 'none';
    scene.background.copy(new THREE.Color(initialConfig.originalBackgroundColor));
    initialConfig.transitionStartTime = 0;
    initialConfig.secondTransitionStartTime = 0;
    initialConfig.thirdTransitionStartTime = 0;

    targets.forEach((target, index) => {
        respawn(target);
        respawnTimes[index] = 0;
        if (target.userData) {
            target.userData.speed = target.userData.initialSpeed;
        }
    });

    clock.start();
    clock.getElapsedTime();

    startMenu.updateScore(initialConfig.playerScore);
}

function handleTargetHit(intersect) {
    const target = intersect.object;
    if (target.userData) {
        initialConfig.playerScore += target.userData.gain;
        scoreDiv.textContent = `Score: ${initialConfig.playerScore}`;

        if (target.userData.type === TYPE.FREEZE) {
            snowballSound.currentTime = 0;
            snowballSound.play();
        } else {
            const randomIndex = Math.floor(Math.random() * explosionSounds.length);
            explosionSounds[randomIndex].currentTime = 0;
            explosionSounds[randomIndex].play();

            // Créer une explosion à la position de la cible
            createExplosion(target.position);
        }

        if (target.userData.freezeDuration) {
            initialConfig.freezeTime = target.userData.freezeDuration;
            initialConfig.freezeStartTime = clock.getElapsedTime();
            scene.background = new THREE.Color(initialConfig.freezeBackgroundColor);
        }

        const index = targets.indexOf(target);
        respawnTimes[index] = clock.getElapsedTime() + initialConfig.respawnDelay;
        respawn(target);
    }
}

function createUIElement(position, bottom, text) {
    const element = document.createElement('div');
    element.style.position = 'fixed';
    element.style.bottom = bottom;
    element.style[position] = '10px';
    element.style.color = 'white';
    element.style.pointerEvents = 'none';
    element.style.fontSize = '24px';
    element.textContent = text;
    element.style.display = 'none';
    document.body.appendChild(element);
    return element;
}

function createGameOverElement() {
    const element = document.createElement('div');
    element.textContent = 'GAME OVER';
    element.style.position = 'fixed';
    element.style.top = '50%';
    element.style.left = '50%';
    element.style.transform = 'translate(-50%, -50%)';
    element.style.color = 'red';
    element.style.fontSize = '48px';
    element.style.display = 'none';
    document.body.appendChild(element);
    return element;
}

function updateLivesDisplay() {
    const hearts = livesDiv.getElementsByTagName('img');
    for (let i = 0; i < hearts.length; i++) {
        if (i < initialConfig.playerLives) {
            hearts[i].style.display = 'inline';
            hearts[i].style.pointerEvents = 'none'; // Disable clicks on heart images
        } else {
            hearts[i].style.display = 'none';
        }
    }
}

function getRandomInt(max) {
    return Math.round(Math.random() * max);
}

function respawn(target) {
    target.position.set(
        -(getRandomInt(target.userData.position) + SCREEN_LIMIT.RIGHT),
        getRandomInt(10) - 5,
        0
    );
}

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    updateScreenLimits(); // Update screen limits on resize
});

initializeTargets();
updateScreenLimits(); // Initial call to set screen limits
