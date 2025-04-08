import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TYPE, getTarget, SCREEN_LIMIT } from './targets';
import { GameMenu } from './menu';

const initialConfig = {
    playerScore: 0,
    playerLives: 3,
    gameActive: true,
    gameInitialized: false,
    freezeTime: 0,
    freezeStartTime: 0,
    originalBackgroundColor: new THREE.Color(0x000000),
    freezeBackgroundColor: new THREE.Color(0x00008B),
    transitionBackgroundColor: new THREE.Color(0xffffff),
    transitionDuration: 4,
    speedIncreaseFactor: 1,
    respawnDelay: 2,
    bestScore: localStorage.getItem('bestScore') || 0
};

const gameMusic = document.getElementById('gameMusic');
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
scene.background = initialConfig.originalBackgroundColor;

const startMenu = new GameMenu(startGame);
const mapLevel1 = [
    TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1, TYPE.SPACESHIP_1,
    TYPE.SPACESHIP_2, TYPE.SPACESHIP_2, TYPE.BONUS, TYPE.FREEZE
];

const targets = [];
const respawnTimes = [];

function createHitbox(target) {
    const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    target.add(hitbox);
    return hitbox;
}

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

    // Play the laser sound
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

function tick() {
    if (!initialConfig.gameActive || !initialConfig.gameInitialized) return;

    const elapsedTime = clock.getElapsedTime();
    let livesLost = 0;

    // Start the color transition after 18 seconds
    if (elapsedTime >= 15 && initialConfig.transitionStartTime === 0) {
        initialConfig.transitionStartTime = elapsedTime;
    }

    // Perform the color transition
    if (initialConfig.transitionStartTime > 0) {
        const transitionElapsedTime = elapsedTime - initialConfig.transitionStartTime;
        const t = Math.min(transitionElapsedTime / initialConfig.transitionDuration, 1);
        scene.background.lerpColors(initialConfig.originalBackgroundColor, initialConfig.transitionBackgroundColor, t);
    }

    if (initialConfig.freezeTime > 0 && elapsedTime - initialConfig.freezeStartTime < initialConfig.freezeTime) {
        requestAnimationFrame(tick);
        renderer.render(scene, camera);
        return;
    } else if (initialConfig.freezeTime > 0) {
        initialConfig.freezeTime = 0;
        scene.background = initialConfig.originalBackgroundColor;
    }

    targets.forEach((target, index) => {
        if (initialConfig.freezeTime === 0 && target.userData) {
            target.userData.speed = Math.min(target.userData.speed + initialConfig.speedIncreaseFactor * 0.004, target.userData.maxSpeed);
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
            gameOverDiv.style.display = 'block';
            canvas.style.display = 'none';
            scoreDiv.style.display = 'none';
            livesDiv.style.display = 'none';

            // Stop the music when the game is over
            gameMusic.pause();
            gameMusic.currentTime = 0;

            // Perform the color transition
            if (initialConfig.transitionStartTime > 0) {
                const transitionElapsedTime = elapsedTime - initialConfig.transitionStartTime;
                const t = Math.min(transitionElapsedTime / initialConfig.transitionDuration, 1);
                scene.background.lerpColors(initialConfig.originalBackgroundColor, initialConfig.transitionBackgroundColor, t);
            }

            // Check if the current score exceeds the best score
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
            // Play the snowball sound
            snowballSound.currentTime = 0;
            snowballSound.play();
        } else {
            // Play a random explosion sound
            const randomIndex = Math.floor(Math.random() * explosionSounds.length);
            explosionSounds[randomIndex].currentTime = 0;
            explosionSounds[randomIndex].play();
        }

        if (target.userData.freezeDuration) {
            initialConfig.freezeTime = target.userData.freezeDuration;
            initialConfig.freezeStartTime = clock.getElapsedTime();
            scene.background = initialConfig.freezeBackgroundColor;
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
    // Update the display of lives by hiding heart images
    const hearts = livesDiv.getElementsByTagName('img');
    for (let i = 0; i < hearts.length; i++) {
        if (i < initialConfig.playerLives) {
            hearts[i].style.display = 'inline';
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
});

initializeTargets();
