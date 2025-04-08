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
    speedIncreaseFactor: 1,
    respawnDelay: 2,
    bestScore: localStorage.getItem('bestScore') || 0

};

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
const livesDiv = createUIElement('left', '10px', `Vies: ${initialConfig.playerLives}`);
const gameOverDiv = createGameOverElement();

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

    if (initialConfig.freezeTime > 0 && elapsedTime - initialConfig.freezeStartTime < initialConfig.freezeTime) {
        requestAnimationFrame(tick);
        renderer.render(scene, camera);
        return;
    } else if (initialConfig.freezeTime > 0) {
        initialConfig.freezeTime = 0;
        scene.background = initialConfig.originalBackgroundColor;
    }

    targets.forEach((target, index) => {
        if (respawnTimes[index] && elapsedTime >= respawnTimes[index]) {
            respawn(target);
            respawnTimes[index] = 0;
        }

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
        livesDiv.textContent = `Vies: ${initialConfig.playerLives}`;

        if (initialConfig.playerLives <= 0) {
            initialConfig.gameActive = false;
            gameOverDiv.style.display = 'block';
            canvas.style.display = 'none';
            scoreDiv.style.display = 'none';
            livesDiv.style.display = 'none';

            // Vérifiez si le score actuel dépasse le meilleur score
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
    canvas.style.display = 'block';
    scoreDiv.style.display = 'block';
    livesDiv.style.display = 'block';

    resetGameState();
    tick();
}

function resetGameState() {
    initialConfig.playerScore = 0;
    initialConfig.playerLives = 3;
    initialConfig.freezeTime = 0;
    scoreDiv.textContent = `Score: ${initialConfig.playerScore}`;
    livesDiv.textContent = `Vies: ${initialConfig.playerLives}`;
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
