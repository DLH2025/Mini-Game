class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.keys = {};
        this.bullets = [];
        this.explosions = [];
        this.level = 1;
        this.gameState = 'menu';
        this.obstacleManager = new ObstacleManager();
        this.healthLimit = 200;
        
        // 模式和难度设置
        this.gameMode = 'two'; // 'single' 或 'two'
        this.difficulty = 2; // 1=简单, 2=普通, 3=困难
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 默认颜色配置
        this.defaultPlayer1Color = '#e94560';
        this.defaultPlayer2Color = '#4a9eff';
        this.player1Color = this.defaultPlayer1Color;
        this.player2Color = this.defaultPlayer2Color;
        
        // 初始化玩家（临时，实际游戏开始时重新创建）
        this.players = [
            new Player(100, 400, this.createColorConfig(this.player1Color, 'red'), {
                up: 'KeyW',
                down: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                melee: 'KeyJ',
                ranged: 'KeyK',
                defend: 'KeyL',
                skill1: 'KeyU',
                skill2: 'KeyI',
                skill3: 'KeyO'
            }, 1, 200),
            new Player(1250, 400, this.createColorConfig(this.player2Color, 'blue'), {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                melee: 'Numpad1',
                ranged: 'Numpad2',
                defend: 'Numpad3',
                skill1: 'Numpad4',
                skill2: 'Numpad5',
                skill3: 'Numpad6'
            }, 2, 200)
        ];
        
        this.setupEventListeners();
        this.setupUI();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const gameWidth = 1400;
        const gameHeight = 900;
        
        const containerWidth = rect.width;
        const containerHeight = rect.height - 50;
        
        const scale = Math.min(containerWidth / gameWidth, containerHeight / gameHeight);
        
        this.canvas.width = gameWidth;
        this.canvas.height = gameHeight;
        this.canvas.style.width = `${gameWidth * scale}px`;
        this.canvas.style.height = `${gameHeight * scale}px`;
        
        this.scale = scale;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Escape') {
                if (this.gameState === 'playing') {
                    this.pauseGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
                return;
            }
            
            if (e.code === 'KeyR' && (this.gameState === 'playing' || this.gameState === 'paused')) {
                this.restartGame();
                return;
            }
            
            if (e.code === 'KeyH' && (this.gameState === 'playing' || this.gameState === 'paused')) {
                this.goToHome();
                return;
            }
            
            if (this.gameState === 'playing') {
                if (e.code === this.players[0].controls.melee) {
                    const attack = this.players[0].meleeAttack();
                }
                if (e.code === this.players[0].controls.ranged) {
                    const attack = this.players[0].rangedAttack();
                    if (attack) {
                        this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, this.players[0].colorConfig));
                    }
                }
                if (e.code === this.players[0].controls.skill1) {
                    if (this.players[0].skill1()) {
                        this.createHealingEffect(this.players[0]);
                    }
                }
                if (e.code === this.players[0].controls.skill2) {
                    if (this.players[0].skill2()) {
                        this.createDashEffect(this.players[0]);
                    }
                }
                if (e.code === this.players[0].controls.skill3) {
                    const blast = this.players[0].skill3();
                    if (blast) {
                        this.createBlastEffect(this.players[0]);
                        this.processBlast(blast, this.players[1], this.players[0]);
                    }
                }
                
                // 双人模式时才处理玩家2输入
                if (this.gameMode === 'two') {
                    if (e.code === this.players[1].controls.melee) {
                        const attack = this.players[1].meleeAttack();
                    }
                    if (e.code === this.players[1].controls.ranged) {
                        const attack = this.players[1].rangedAttack();
                        if (attack) {
                            this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, this.players[1].colorConfig));
                        }
                    }
                    if (e.code === this.players[1].controls.skill1) {
                        if (this.players[1].skill1()) {
                            this.createHealingEffect(this.players[1]);
                        }
                    }
                    if (e.code === this.players[1].controls.skill2) {
                        if (this.players[1].skill2()) {
                            this.createDashEffect(this.players[1]);
                        }
                    }
                    if (e.code === this.players[1].controls.skill3) {
                        const blast = this.players[1].skill3();
                        if (blast) {
                            this.createBlastEffect(this.players[1]);
                            this.processBlast(blast, this.players[0], this.players[1]);
                        }
                    }
                }
            }
            
            if ((this.gameState === 'gameover' || this.gameState === 'countdown') && e.code === 'Enter') {
                this.startGame();
            }
            
            if (this.gameState === 'countdown' || this.gameState === 'paused') {
                return;
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    createColorConfig(hexColor, name) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // 计算深色和浅色版本
        const darkR = Math.floor(r * 0.7);
        const darkG = Math.floor(g * 0.7);
        const darkB = Math.floor(b * 0.7);
        const darkColor = '#' + 
            darkR.toString(16).padStart(2, '0') + 
            darkG.toString(16).padStart(2, '0') + 
            darkB.toString(16).padStart(2, '0');
            
        const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.4));
        const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.4));
        const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.4));
        const lightColor = '#' + 
            lightR.toString(16).padStart(2, '0') + 
            lightG.toString(16).padStart(2, '0') + 
            lightB.toString(16).padStart(2, '0');
        
        return {
            name: name,
            medium: hexColor,
            dark: darkColor,
            light: lightColor
        };
    }

    setupUI() {
        // 模式选择按钮
        document.getElementById('singlePlayerBtn').addEventListener('click', () => {
            this.gameMode = 'single';
            this.showScreen('difficultyScreen');
        });
        
        document.getElementById('twoPlayerBtn').addEventListener('click', () => {
            this.gameMode = 'two';
            this.startGame();
        });
        
        // 难度选择按钮
        document.getElementById('easyBtn').addEventListener('click', () => {
            this.difficulty = 1;
            this.startGame();
        });
        
        document.getElementById('normalBtn').addEventListener('click', () => {
            this.difficulty = 2;
            this.startGame();
        });
        
        document.getElementById('hardBtn').addEventListener('click', () => {
            this.difficulty = 3;
            this.startGame();
        });
        
        document.getElementById('backToStartBtn').addEventListener('click', () => {
            this.showScreen('startScreen');
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartGameBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.goToHome();
        });
        
        // 游戏设置弹窗
        const settingsModal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const controlsTab = document.getElementById('controlsTab');
        const gameplayTab = document.getElementById('gameplayTab');
        const controlsPanel = document.getElementById('controlsPanel');
        const gameplayPanel = document.getElementById('gameplayPanel');
        
        // 打开/关闭弹窗
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
        
        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
        
        // 点击弹窗外部关闭
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
        
        // 标签页切换
        const switchTab = (tab) => {
            if (tab === 'controls') {
                controlsTab.classList.add('active');
                gameplayTab.classList.remove('active');
                controlsPanel.classList.remove('hidden');
                gameplayPanel.classList.add('hidden');
            } else {
                gameplayTab.classList.add('active');
                controlsTab.classList.remove('active');
                gameplayPanel.classList.remove('hidden');
                controlsPanel.classList.add('hidden');
            }
        };
        
        controlsTab.addEventListener('click', () => switchTab('controls'));
        gameplayTab.addEventListener('click', () => switchTab('gameplay'));
        
        // 血量上限设置
        const healthLimitInput = document.getElementById('healthLimit');
        const healthLimitValue = document.getElementById('healthLimitValue');
        
        healthLimitInput.addEventListener('input', (e) => {
            this.healthLimit = parseInt(e.target.value);
            healthLimitValue.textContent = this.healthLimit;
        });
        
        // 白天/黑夜模式切换
        const dayThemeBtn = document.getElementById('dayThemeBtn');
        const nightThemeBtn = document.getElementById('nightThemeBtn');
        
        const switchTheme = (theme) => {
            if (theme === 'day') {
                document.body.classList.add('day-mode');
                dayThemeBtn.classList.add('active');
                nightThemeBtn.classList.remove('active');
                localStorage.setItem('gameTheme', 'day');
            } else {
                document.body.classList.remove('day-mode');
                nightThemeBtn.classList.add('active');
                dayThemeBtn.classList.remove('active');
                localStorage.setItem('gameTheme', 'night');
            }
        };
        
        dayThemeBtn.addEventListener('click', () => switchTheme('day'));
        nightThemeBtn.addEventListener('click', () => switchTheme('night'));
        
        // 玩家颜色选择
        const player1ColorInput = document.getElementById('player1Color');
        const player1Preview = document.getElementById('player1Preview');
        const player2ColorInput = document.getElementById('player2Color');
        const player2Preview = document.getElementById('player2Preview');
        
        const updatePlayer1Color = (color) => {
            this.player1Color = color;
            player1Preview.style.backgroundColor = color;
            localStorage.setItem('player1Color', color);
            this.players[0].colorConfig = this.createColorConfig(color, 'red');
        };
        
        const updatePlayer2Color = (color) => {
            this.player2Color = color;
            player2Preview.style.backgroundColor = color;
            localStorage.setItem('player2Color', color);
            this.players[1].colorConfig = this.createColorConfig(color, 'blue');
        };
        
        player1ColorInput.addEventListener('input', (e) => {
            updatePlayer1Color(e.target.value);
        });
        
        player2ColorInput.addEventListener('input', (e) => {
            updatePlayer2Color(e.target.value);
        });
        
        // 从本地存储恢复主题和颜色
        const savedTheme = localStorage.getItem('gameTheme');
        if (savedTheme === 'day') {
            switchTheme('day');
        }
        
        const savedPlayer1Color = localStorage.getItem('player1Color');
        if (savedPlayer1Color) {
            player1ColorInput.value = savedPlayer1Color;
            updatePlayer1Color(savedPlayer1Color);
        }
        
        const savedPlayer2Color = localStorage.getItem('player2Color');
        if (savedPlayer2Color) {
            player2ColorInput.value = savedPlayer2Color;
            updatePlayer2Color(savedPlayer2Color);
        }
    }

    pauseGame() {
        this.gameState = 'paused';
        document.getElementById('pauseOverlay').classList.remove('hidden');
    }

    resumeGame() {
        this.gameState = 'playing';
        document.getElementById('pauseOverlay').classList.add('hidden');
        this.gameLoop();
    }

    restartGame() {
        document.getElementById('pauseOverlay').classList.add('hidden');
        this.startGame();
    }

    goToHome() {
        document.getElementById('pauseOverlay').classList.add('hidden');
        this.gameState = 'menu';
        this.showScreen('startScreen');
    }

    startGame() {
        this.level = 1;
        
        // 创建玩家1（人类玩家）
        this.players[0] = new Player(100, 400, this.createColorConfig(this.player1Color, 'red'), {
            up: 'KeyW',
            down: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            melee: 'KeyJ',
            ranged: 'KeyK',
            defend: 'KeyL',
            skill1: 'KeyU',
            skill2: 'KeyI',
            skill3: 'KeyO'
        }, 1, this.healthLimit);
        
        // 根据模式创建玩家2
        if (this.gameMode === 'single') {
            // AI玩家
            this.players[1] = new AIPlayer(1250, 400, this.createColorConfig(this.player2Color, 'blue'), {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                melee: 'Numpad1',
                ranged: 'Numpad2',
                defend: 'Numpad3',
                skill1: 'Numpad4',
                skill2: 'Numpad5',
                skill3: 'Numpad6'
            }, 2, this.healthLimit, this.difficulty);
            // 设置AI目标
            this.players[1].setTarget(this.players[0]);
        } else {
            // 双人模式：人类玩家
            this.players[1] = new Player(1250, 400, this.createColorConfig(this.player2Color, 'blue'), {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                melee: 'Numpad1',
                ranged: 'Numpad2',
                defend: 'Numpad3',
                skill1: 'Numpad4',
                skill2: 'Numpad5',
                skill3: 'Numpad6'
            }, 2, this.healthLimit);
        }
        
        this.bullets = [];
        this.explosions = [];
        this.obstacleManager.generateObstacles(this.level);
        this.showScreen('gameScreen');
        this.updateUI();
        this.startCountdown();
    }

    startCountdown() {
        const countdownOverlay = document.getElementById('countdownOverlay');
        const countdownNumber = document.getElementById('countdownNumber');
        const countdownText = document.querySelector('.countdown-text');
        
        countdownOverlay.classList.remove('hidden');
        this.gameState = 'countdown';
        
        let count = 3;
        countdownNumber.textContent = count;
        countdownText.textContent = '准备开始！';
        
        const countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out infinite';
            } else if (count === 0) {
                countdownNumber.textContent = 'GO!';
                countdownNumber.style.color = '#ffd700';
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 0.3s ease-in-out infinite';
                countdownText.textContent = '开始战斗！';
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.classList.add('hidden');
                countdownNumber.style.color = '#00ff88';
                this.gameState = 'playing';
                this.gameLoop();
            }
        }, 1000);
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    }

    update() {
        if (this.gameState !== 'playing') {
            if (this.gameState === 'victory') {
                this.render();
            }
            return;
        }
        
        // 更新玩家
        this.players.forEach(player => {
            const prevX = player.x;
            const prevY = player.y;
            
            // 如果是AI玩家，更新AI决策
            if (this.gameMode === 'single' && player.id === 2) {
                player.setBullets(this.bullets);
                player.setObstacles(this.obstacleManager.obstacles);
                // 调用AIPlayer的update方法，它会先调用updateAI再调用super.update
                player.update(null, document.body.classList.contains('day-mode'));
            } else {
                // 人类玩家
                player.update(this.keys);
            }
            
            this.obstacleManager.checkCollisions(player, prevX, prevY);
        });
        
        // 处理AI玩家的攻击
        if (this.gameMode === 'single') {
            this.processAIAttacks();
        }
        
        if (this.players[0].checkMeleeHit(this.players[1])) {
            this.players[1].takeDamage(this.players[0].meleeDamage);
            this.createExplosion(this.players[1].x + this.players[1].width/2, this.players[1].y + this.players[1].height/2, this.players[0].colorConfig.medium);
        }
        
        if (this.players[1].checkMeleeHit(this.players[0])) {
            this.players[0].takeDamage(this.players[1].meleeDamage);
            this.createExplosion(this.players[0].x + this.players[0].width/2, this.players[0].y + this.players[0].height/2, this.players[1].colorConfig.medium);
        }
        
        if (this.players[0].isMeleeAttacking) {
            const meleeResult1 = this.obstacleManager.damageFromMelee(this.players[0]);
            if (meleeResult1.hit) {
                this.createExplosion(meleeResult1.x, meleeResult1.y, '#888888');
            }
        }
        
        if (this.players[1].isMeleeAttacking) {
            const meleeResult2 = this.obstacleManager.damageFromMelee(this.players[1]);
            if (meleeResult2.hit) {
                this.createExplosion(meleeResult2.x, meleeResult2.y, '#888888');
            }
        }
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            
            const obsResult = this.obstacleManager.damageFromBullet(bullet);
            if (obsResult.hit) {
                if (obsResult.destroyed) {
                    this.createExplosion(obsResult.x, obsResult.y, '#ffaa00');
                } else {
                    this.createExplosion(bullet.x, bullet.y, '#888888');
                }
                return false;
            }
            
            if (bullet.owner === 1 && bullet.checkCollision(this.players[1])) {
                this.players[1].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[0].colorConfig.medium);
                return false;
            }
            
            if (bullet.owner === 2 && bullet.checkCollision(this.players[0])) {
                this.players[0].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[1].colorConfig.medium);
                return false;
            }
            
            return bullet.active;
        });
        
        this.explosions = this.explosions.filter(exp => {
            exp.update();
            return !exp.dead;
        });
        
        this.obstacleManager.obstacles.forEach(obs => {
            if (obs.destroyed) {
                obs.updateDebris();
            }
        });
        
        this.checkGameOver();
        this.updateUI();
    }
    
    // 处理AI玩家的攻击
    processAIAttacks() {
        if (!this.players[1] || !this.players[1].currentAction) return;
        
        const ai = this.players[1];
        
        switch (ai.currentAction) {
            case 'melee':
                // 近战攻击会在AI逻辑中处理
                break;
            case 'ranged':
                // 检查是否有攻击动画，避免重复发射
                if (!ai.isShooting || ai.attackFrame % 12 === 0) {
                    const attack = ai.rangedAttack();
                    if (attack) {
                        this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, ai.colorConfig));
                    }
                }
                break;
            case 'heal':
                if (ai.skill1Cooldown <= 0) {
                    if (ai.skill1()) {
                        this.createHealingEffect(ai);
                    }
                }
                break;
            case 'dash':
                if (ai.skill2Cooldown <= 0) {
                    if (ai.skill2()) {
                        this.createDashEffect(ai);
                    }
                }
                break;
            case 'blast':
                if (ai.skill3Cooldown <= 0) {
                    const blast = ai.skill3();
                    if (blast) {
                        this.createBlastEffect(ai);
                        this.processBlast(blast, this.players[0], ai);
                    }
                }
                break;
        }
    }

    createExplosion(x, y, color) {
        this.explosions.push(new Explosion(x, y, color));
    }
    
    createHealingEffect(player) {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const x = player.x + Math.random() * player.width;
                const y = player.y + Math.random() * player.height;
                this.createExplosion(x, y, '#00ff88');
            }, i * 30);
        }
    }
    
    createDashEffect(player) {
        const color = player.colorConfig.light;
        for (let i = 0; i < 8; i++) {
            const trailX = player.x - player.direction.x * (i * 20);
            const trailY = player.y - player.direction.y * (i * 20);
            this.createExplosion(trailX + player.width / 2, trailY + player.height / 2, color);
        }
    }
    
    createBlastEffect(player) {
        const color = player.colorConfig.light;
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const dist = 30 + Math.random() * 50;
            const x = player.x + player.width / 2 + Math.cos(angle) * dist;
            const y = player.y + player.height / 2 + Math.sin(angle) * dist;
            setTimeout(() => {
                this.createExplosion(x, y, color);
            }, i * 30);
        }
    }
    
    processBlast(blast, target, attacker) {
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        const dist = Math.sqrt(
            Math.pow(targetCenterX - blast.x, 2) + 
            Math.pow(targetCenterY - blast.y, 2)
        );
        
        if (dist < blast.radius) {
            target.takeDamage(blast.damage);
            this.createExplosion(targetCenterX, targetCenterY, attacker.colorConfig.light);
        }
        
        for (const obs of this.obstacleManager.obstacles) {
            if (obs.destroyed) continue;
            const obsCenterX = obs.x + obs.width / 2;
            const obsCenterY = obs.y + obs.height / 2;
            const obsDist = Math.sqrt(
                Math.pow(obsCenterX - blast.x, 2) + 
                Math.pow(obsCenterY - blast.y, 2)
            );
            
            if (obsDist < blast.radius) {
                obs.takeDamage(blast.damage);
            }
        }
    }

    checkGameOver() {
        if (this.players[0].health <= 0) {
            this.endGame(2);
        } else if (this.players[1].health <= 0) {
            this.endGame(1);
        }
    }

    endGame(winner) {
        if (winner === 1) {
            this.players[0].isWinner = true;
            this.players[1].isDefeated = true;
        } else {
            this.players[1].isWinner = true;
            this.players[0].isDefeated = true;
        }
        
        this.showVictoryAnimation(winner);
    }

    showVictoryAnimation(winner) {
        const winnerText = document.getElementById('winnerText');
        winnerText.textContent = winner === 1 ? '🎉 红方获胜！🎉' : '🎉 蓝方获胜！🎉';
        winnerText.style.color = winner === 1 ? this.player1Color : this.player2Color;
        
        this.showScreen('gameScreen');
        
        this.gameState = 'victory';
        
        const victoryLoop = () => {
            if (this.gameState !== 'victory') return;
            
            this.players.forEach(p => p.crownBounce += 0.15);
            this.render();
            
            requestAnimationFrame(victoryLoop);
        };
        
        setTimeout(() => {
            this.gameState = 'gameover';
            this.showScreen('endScreen');
        }, 3000);
    }

    nextLevel() {
        this.level++;
        this.players[0].reset(100, 400, this.level, this.healthLimit);
        this.players[1].reset(1250, 400, this.level, this.healthLimit);
        this.bullets = [];
        this.explosions = [];
        this.obstacleManager.generateObstacles(this.level);
    }

    updateUI() {
        document.getElementById('health1').style.width = (this.players[0].health / this.players[0].maxHealth * 100) + '%';
        document.getElementById('health2').style.width = (this.players[1].health / this.players[1].maxHealth * 100) + '%';
        document.getElementById('healthText1').textContent = Math.ceil(this.players[0].health);
        document.getElementById('healthText2').textContent = Math.ceil(this.players[1].health);
        document.getElementById('level').textContent = this.level;
        
        const skill1Cooldown1 = (this.players[0].skill1Cooldown / this.players[0].skill1MaxCooldown * 100);
        const skill1Cooldown2 = (this.players[1].skill1Cooldown / this.players[1].skill1MaxCooldown * 100);
        const skill2Cooldown1 = (this.players[0].skill2Cooldown / this.players[0].skill2MaxCooldown * 100);
        const skill2Cooldown2 = (this.players[1].skill2Cooldown / this.players[1].skill2MaxCooldown * 100);
        const skill3Cooldown1 = (this.players[0].skill3Cooldown / this.players[0].skill3MaxCooldown * 100);
        const skill3Cooldown2 = (this.players[1].skill3Cooldown / this.players[1].skill3MaxCooldown * 100);
        
        document.getElementById('skill1-cooldown-p1').style.height = skill1Cooldown1 + '%';
        document.getElementById('skill1-cooldown-p2').style.height = skill1Cooldown2 + '%';
        document.getElementById('skill2-cooldown-p1').style.height = skill2Cooldown1 + '%';
        document.getElementById('skill2-cooldown-p2').style.height = skill2Cooldown2 + '%';
        document.getElementById('skill3-cooldown-p1').style.height = skill3Cooldown1 + '%';
        document.getElementById('skill3-cooldown-p2').style.height = skill3Cooldown2 + '%';
    }

    render() {
        const isDayMode = document.body.classList.contains('day-mode');
        
        // 背景色
        this.ctx.fillStyle = isDayMode ? '#e6f2ff' : '#1a1a2e';
        this.ctx.fillRect(0, 0, 1400, 900);
        
        this.drawGrid(isDayMode);
        
        this.obstacleManager.render(this.ctx, isDayMode);
        
        this.players.forEach(player => player.render(this.ctx, isDayMode));
        
        this.bullets.forEach(bullet => bullet.render(this.ctx, isDayMode));
        
        this.explosions.forEach(exp => exp.render(this.ctx, isDayMode));
    }

    drawGrid(isDayMode) {
        this.ctx.strokeStyle = isDayMode ? 'rgba(74, 158, 255, 0.2)' : 'rgba(15, 52, 96, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < 1400; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 900);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < 900; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(1400, y);
            this.ctx.stroke();
        }
    }

    gameLoop() {
        if (this.gameState === 'countdown') {
            this.render();
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        if (this.gameState === 'paused') {
            this.render();
            return;
        }
        
        if (this.gameState !== 'playing' && this.gameState !== 'victory') return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();
