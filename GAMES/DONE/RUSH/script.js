class RacingGame {
    constructor() {
        this.game = document.getElementById("game");
        this.player = document.getElementById("player");
        this.scoreElement = document.getElementById("scoreValue");
        this.levelElement = document.getElementById("levelValue");
        this.speedElement = document.getElementById("speedValue");
        
        this.playerX = 175;
        this.gameRunning = true;
        this.score = 0;
        this.level = 1;
        this.speed = 1;
        this.enemySpeed = 3;
        this.spawnRate = 1500;
        this.lastSpawn = 0;
        this.keys = {};
        this.particles = [];
        
        this.init();
    }

    init() {
        this.createStars();
        this.createRoadLines();
        this.bindEvents();
        this.gameLoop();
        this.spawnEnemies();
        this.spawnPowerUps();
    }

    createStars() {
        const starsContainer = document.querySelector('.stars');
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.animationDelay = Math.random() * 3 + 's';
            starsContainer.appendChild(star);
        }
    }

    createRoadLines() {
        setInterval(() => {
            if (!this.gameRunning) return;
            
            const line = document.createElement('div');
            line.className = 'road-line';
            this.game.appendChild(line);
            
            setTimeout(() => {
                if (line.parentNode) {
                    line.remove();
                }
            }, 500);
        }, 200);
    }

    bindEvents() {
        document.addEventListener("keydown", (e) => {
            this.keys[e.key] = true;
        });

        document.addEventListener("keyup", (e) => {
            this.keys[e.key] = false;
        });
    }

    handleInput() {
        if (!this.gameRunning) return;

        const moveSpeed = 8;
        
        if (this.keys["ArrowLeft"] && this.playerX > 0) {
            this.playerX -= moveSpeed;
            this.createParticle(this.playerX + 50, 580);
        }
        if (this.keys["ArrowRight"] && this.playerX < 350) {
            this.playerX += moveSpeed;
            this.createParticle(this.playerX, 580);
        }
        
        this.player.style.left = this.playerX + "px";
    }

    createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        this.game.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 2000);
    }

    createEnemy() {
        const enemy = document.createElement("div");
        const types = ['type1', 'type2', 'type3'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        enemy.classList.add("enemy", randomType);
        enemy.style.left = Math.floor(Math.random() * 7) * 50 + "px";
        this.game.appendChild(enemy);
        this.moveEnemy(enemy);
    }

    createPowerUp() {
        const powerUp = document.createElement("div");
        powerUp.classList.add("speed-boost");
        powerUp.style.left = Math.floor(Math.random() * 7) * 50 + 10 + "px";
        this.game.appendChild(powerUp);
        this.movePowerUp(powerUp);
    }

    moveEnemy(enemy) {
        let y = -80;
        const moveInterval = setInterval(() => {
            if (!this.gameRunning) {
                clearInterval(moveInterval);
                return;
            }
            
            y += this.enemySpeed * this.speed;
            enemy.style.top = y + "px";
            
            if (this.checkCollision(enemy, this.player)) {
                this.gameOver();
                clearInterval(moveInterval);
                return;
            }
            
            if (y > 600) {
                this.score += 10;
                this.updateScore();
                enemy.remove();
                clearInterval(moveInterval);
            }
        }, 20);
    }

    movePowerUp(powerUp) {
        let y = -30;
        const moveInterval = setInterval(() => {
            if (!this.gameRunning) {
                clearInterval(moveInterval);
                return;
            }
            
            y += this.enemySpeed * this.speed;
            powerUp.style.top = y + "px";
            
            if (this.checkCollision(powerUp, this.player)) {
                this.collectPowerUp();
                powerUp.remove();
                clearInterval(moveInterval);
                return;
            }
            
            if (y > 600) {
                powerUp.remove();
                clearInterval(moveInterval);
            }
        }, 20);
    }

    checkCollision(rect1, rect2) {
        const r1 = rect1.getBoundingClientRect();
        const r2 = rect2.getBoundingClientRect();
        
        return !(r1.right < r2.left || 
                r1.left > r2.right || 
                r1.bottom < r2.top || 
                r1.top > r2.bottom);
    }

    collectPowerUp() {
        this.score += 50;
        this.speed = Math.min(this.speed + 0.2, 3);
        this.updateScore();
        
        // Create collection effect
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createParticle(
                    this.playerX + Math.random() * 50,
                    580 + Math.random() * 20
                );
            }, i * 50);
        }
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.speedElement.textContent = this.speed.toFixed(1);
        
        const newLevel = Math.floor(this.score / 200) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.levelElement.textContent = this.level;
            this.enemySpeed += 0.5;
            this.spawnRate = Math.max(800, this.spawnRate - 100);
        }
    }

    createExplosion(x, y) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = (x - 50) + 'px';
        explosion.style.top = (y - 50) + 'px';
        this.game.appendChild(explosion);
        
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.remove();
            }
        }, 500);
    }

    gameOver() {
        this.gameRunning = false;
        this.createExplosion(this.playerX + 25, 580);
        
        setTimeout(() => {
            const gameOverDiv = document.createElement('div');
            gameOverDiv.className = 'game-over';
            gameOverDiv.innerHTML = `
                <h2>💥 GAME OVER</h2>
                <p>Final Score: ${this.score}</p>
                <p>Level Reached: ${this.level}</p>
                <button class="restart-btn" onclick="location.reload()">
                    🔄 PLAY AGAIN
                </button>
            `;
            this.game.appendChild(gameOverDiv);
        }, 500);
    }

    spawnEnemies() {
        setInterval(() => {
            if (this.gameRunning && Math.random() > 0.3) {
                this.createEnemy();
            }
        }, this.spawnRate);
    }

    spawnPowerUps() {
        setInterval(() => {
            if (this.gameRunning && Math.random() > 0.85) {
                this.createPowerUp();
            }
        }, 3000);
    }

    gameLoop() {
        if (this.gameRunning) {
            this.handleInput();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Start the game
window.addEventListener('load', () => {
    new RacingGame();
});