export class GameMenu {
    constructor(startCallback) {
        this.menuContainer = document.createElement('div');
        this.startButton = document.createElement('button');
        this.scoreDisplay = document.createElement('div');
        this.isVisible = true;

        this.createStyles();
        this.createMenu();
        this.setupEventListeners(startCallback);
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

            body {
                background-image: url('./img/background.png');
                background-blend-mode: overlay;
                background-size: cover;
                margin: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                overflow: hidden;
                position: relative;
            }

            .game-menu {
                text-align: center;
                padding: 2rem;
                border: 2px solid #00ff00;
                border-radius: 10px;
                z-index: 100;
                font-family: 'Press Start 2P', cursive;
                box-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00;
            }

            .start-button {
                padding: 1rem 2rem;
                font-size: 1.5rem;
                background: #00ff00;
                border: 2px solid #00cc00;
                border-radius: 5px;
                cursor: pointer;
                transition: transform 0.3s;
                color: black;
                text-shadow: 1px 1px #00cc00, 2px 2px #00cc00, 3px 3px #00cc00;
                box-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00;
            }

            .start-button:hover {
                transform: scale(1.1);
                background: #00cc00;
                border-color: #00ff00;
                box-shadow: 0 0 15px #00ff00, 0 0 25px #00ff00, 0 0 35px #00ff00;
            }

            .hidden {
                display: none;
            }

            @keyframes neon-glow {
                0%, 100% {
                    text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00, 0 0 15px #00ff00, 0 0 20px #00cc00, 0 0 25px #00cc00, 0 0 30px #00cc00, 0 0 35px #00cc00;
                }
                50% {
                    text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00cc00, 0 0 50px #00cc00, 0 0 60px #00cc00, 0 0 70px #00cc00;
                }
            }

            h1 {
                color: #00ff00;
                animation: neon-glow 1.5s ease-in-out infinite;
            }

            .score-display {
                color: #00ff00;
                font-size: 1.2rem;
                margin-top: 1rem;
            }
        `;
        document.head.appendChild(style);

        // Add noise and scanlines to the body
        const noise = document.createElement('div');
        noise.className = 'noise';
        document.body.appendChild(noise);

        const scanlines = document.createElement('div');
        scanlines.className = 'scanlines';
        document.body.appendChild(scanlines);
    }

    createMenu() {
        this.menuContainer.className = 'game-menu';

        const title = document.createElement('h1');
        title.textContent = 'INTERCEPT TARGET';
        title.style.marginBottom = '2rem';

        this.startButton.className = 'start-button';
        this.startButton.textContent = 'START';

        const bestScore = localStorage.getItem('bestScore');
        this.scoreDisplay.className = 'score-display';
        this.scoreDisplay.textContent = bestScore ? `Meilleur score : ${bestScore}` : 'Meilleur score : 0';

        this.menuContainer.appendChild(title);
        this.menuContainer.appendChild(this.startButton);
        this.menuContainer.appendChild(this.scoreDisplay);
        document.body.appendChild(this.menuContainer);
    }

    setupEventListeners(startCallback) {
        this.startButton.addEventListener('click', () => {
            this.hide();
            startCallback();
        });
    }

    hide() {
        this.menuContainer.classList.add('hidden');
        this.isVisible = false;
    }

    show() {
        this.menuContainer.classList.remove('hidden');
        this.isVisible = true;
    }

    updateScore(score) {
        this.scoreDisplay.textContent = score ? `${score}` : 'Meilleur score : 0';
    }
}
