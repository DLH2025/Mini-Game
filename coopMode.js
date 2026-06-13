class CoopMode {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        this.difficulty = 'normal';
        this.playerCount = 2;
        this.waveManager = null;
        this.enemies = [];
        this.players = [];
        this.bullets = [];
        this.explosions = [];
        this.gameState = 'menu';
        this.score = 0;
        this.totalKills = 0;
        this.waveKills = 0;
        this.sharedLives = 3;
        this.isPaused = false;
        this.lastTime = 0;
        this.animationId = null;
        
        // 使用配置常量
        this.mapWidth = CONFIG.CANVAS.COOP_MAP_WIDTH;
        this.mapHeight = CONFIG.CANVAS.COOP_MAP_HEIGHT;

        // 摄像机
        this.camera = {
            x: 0,
            y: 0,
            width: this.canvas.width,
            height: this.canvas.height,
            viewWidth: this.canvas.width,
            viewHeight: this.canvas.height
        };

        // 使用配置中的敌人出生点
        this.enemySpawnPoints = CONFIG.ENEMY.SPAWN_POINTS;

        // 升级系统
        this.upgradeSystem = {
            healthBonus: 0,
            attackMultiplier: 1.0,
            speedMultiplier: 1.0,
            isUpgradeScreenShown: false
        };

        // 保护目标 - 使用配置
        this.protectTarget = {
            x: CONFIG.CORE.x,
            y: CONFIG.CORE.y,
            width: CONFIG.CORE.width,
            height: CONFIG.CORE.height,
            maxHealth: CONFIG.CORE.maxHealth,
            health: CONFIG.CORE.maxHealth,
            name: '能量核心'
        };

        // 优化系统
        this.spatialGrid = new SpatialGrid(CONFIG.SPATIAL.CELL_SIZE);
        this.viewportCulling = new ViewportCulling(CONFIG.PERFORMANCE.CULLING_MARGIN);
        this.perfMonitor = new PerformanceMonitor();
        
        // 升级界面计时器引用
        this.upgradeTimerInterval = null;
    }

    start(difficulty, playerCount = 2) {
        // 清理之前的状态
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 清理升级计时器
        if (this.upgradeTimerInterval) {
            clearInterval(this.upgradeTimerInterval);
            this.upgradeTimerInterval = null;
        }
        
        // 隐藏升级界面
        this.upgradeSystem.isUpgradeScreenShown = false;
        const upgradeScreen = document.getElementById('upgradeScreen');
        if (upgradeScreen) {
            upgradeScreen.classList.add('hidden');
        }
        
        this.difficulty = difficulty;
        this.playerCount = playerCount;
        this.waveManager = new WaveManager(difficulty);
        this.enemies = [];
        this.bullets = [];
        this.explosions = [];
        this.score = 0;
        this.totalKills = 0;
        this.waveKills = 0;
        this.sharedLives = playerCount === 1 ? 2 : 3;
        this.gameState = 'playing';
        this.isPaused = false;
        
        // 重置升级系统
        this.upgradeSystem = {
            healthBonus: 0,
            attackMultiplier: 1.0,
            speedMultiplier: 1.0,
            isUpgradeScreenShown: false
        };
        
        // 重置核心血量
        this.protectTarget.health = this.protectTarget.maxHealth;
        
        // 清空空间网格
        this.spatialGrid.clear();
        
        // 清空对象池
        BulletPool.releaseAll();
        ExplosionPool.releaseAll();
        EnemyPool.releaseAll();
        
        // 玩家在左侧出生
        this.players = [
            new Player(500, 700, this.game.createColorConfig(this.game.player1Colors, 'red'), {
                up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
                melee: 'KeyJ', ranged: 'KeyK', defend: 'KeyL',
                skill1: 'KeyU', skill2: 'KeyI', skill3: 'KeyO'
            }, 1, this.game.healthLimit)
        ];

        if (playerCount === 2) {
            this.players.push(
                new Player(500, 1100, this.game.createColorConfig(this.game.player2Colors, 'blue'), {
                    up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
                    melee: 'Numpad1', ranged: 'Numpad2', defend: 'Numpad3',
                    skill1: 'Numpad4', skill2: 'Numpad5', skill3: 'Numpad6'
                }, 2, this.game.healthLimit)
            );
        }
        
        this.game.obstacleManager.generateObstacles(1, null, this.mapWidth, this.mapHeight);
        this.waveManager.startWave(1);
        
        this.showCoopUI();
        this.updateSkillsUI();
        this.showMinimap();
        this.lastTime = performance.now();
        
        // 启动性能监控（按F3切换显示）
        this.perfMonitor.startFrame();
        this.gameLoop();
    }

    showMinimap() {
        const minimapContainer = document.getElementById('minimapContainer');
        if (minimapContainer) {
            minimapContainer.classList.remove('hidden');
        }
    }

    hideMinimap() {
        const minimapContainer = document.getElementById('minimapContainer');
        if (minimapContainer) {
            minimapContainer.classList.add('hidden');
        }
    }

    renderMinimap() {
        const minimapCanvas = document.getElementById('minimapCanvas');
        if (!minimapCanvas) return;

        const ctx = minimapCanvas.getContext('2d');
        const minimapWidth = CONFIG.CANVAS.MINIMAP_WIDTH;
        const minimapHeight = CONFIG.CANVAS.MINIMAP_HEIGHT;

        const scale = Math.min(minimapWidth / this.mapWidth, minimapHeight / this.mapHeight);
        const mapDisplayWidth = this.mapWidth * scale;
        const mapDisplayHeight = this.mapHeight * scale;
        const offsetX = (minimapWidth - mapDisplayWidth) / 2;
        const offsetY = (minimapHeight - mapDisplayHeight) / 2;

        ctx.clearRect(0, 0, minimapWidth, minimapHeight);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(offsetX, offsetY, mapDisplayWidth, mapDisplayHeight);

        // 绘制障碍物
        ctx.fillStyle = '#666666';
        this.game.obstacleManager.obstacles.forEach(obs => {
            if (!obs.destroyed) {
                ctx.fillRect(
                    offsetX + obs.x * scale,
                    offsetY + obs.y * scale,
                    obs.width * scale,
                    obs.height * scale
                );
            }
        });

        // 绘制保护目标 - 小地图中使用更醒目的样式
        const target = this.protectTarget;
        const healthPercent = target.health / target.maxHealth;
        const isCritical = healthPercent <= 0.25;
        const isWarning = healthPercent <= 0.5;
        
        // 核心外框 - 根据血量改变颜色
        const coreColor = isCritical ? '#ff4444' : isWarning ? '#ffaa00' : '#00ff88';
        ctx.strokeStyle = coreColor;
        ctx.lineWidth = isCritical ? 2 : 1.5;
        ctx.strokeRect(
            offsetX + target.x * scale,
            offsetY + target.y * scale,
            target.width * scale,
            target.height * scale
        );
        
        // 核心填充
        ctx.fillStyle = coreColor;
        ctx.fillRect(
            offsetX + target.x * scale,
            offsetY + target.y * scale,
            target.width * scale,
            target.height * scale
        );
        
        // 核心中心发光效果
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = isCritical ? 8 : 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
            offsetX + (target.x + target.width / 2) * scale,
            offsetY + (target.y + target.height / 2) * scale,
            Math.max(3, 6 * scale), 0, Math.PI * 2
        );
        ctx.fill();
        ctx.shadowBlur = 0;

        // 绘制玩家
        this.players.forEach((player, index) => {
            if (player.health > 0) {
                ctx.fillStyle = index === 0 ? '#ff0000' : '#0000ff';
                ctx.beginPath();
                ctx.arc(
                    offsetX + (player.x + player.width / 2) * scale,
                    offsetY + (player.y + player.height / 2) * scale,
                    3, 0, Math.PI * 2
                );
                ctx.fill();
            }
        });

        // 绘制敌人 - 使用对象池
        const activeEnemies = EnemyPool.getActive();
        activeEnemies.forEach(enemy => {
            if (enemy.health > 0) {
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.arc(
                    offsetX + (enemy.x + enemy.width / 2) * scale,
                    offsetY + (enemy.y + enemy.height / 2) * scale,
                    2, 0, Math.PI * 2
                );
                ctx.fill();
            }
        });

        // 绘制摄像机视野范围
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            offsetX + this.camera.x * scale,
            offsetY + this.camera.y * scale,
            this.camera.viewWidth * scale,
            this.camera.viewHeight * scale
        );

        ctx.strokeStyle = '#0f3460';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, mapDisplayWidth, mapDisplayHeight);
    }

    showCoopUI() {
        const gameUI = document.querySelector('.game-ui');
        const totalWaves = this.difficulty === 'endless' ? '∞' : this.waveManager.config.totalWaves;
        const modeText = this.playerCount === 1 ? '👤 单人' : '👥 双人';
        const diffText = this.difficulty === 'easy' ? '🟢 简单' : this.difficulty === 'normal' ? '🟡 普通' : '♾️ 无尽';
        const targetHealthPercent = Math.round((this.protectTarget.health / this.protectTarget.maxHealth) * 100);
        
        let playerHealthHTML = '';
        this.players.forEach((player, index) => {
            const healthPercent = Math.round((player.health / player.maxHealth) * 100);
            const colorClass = index === 0 ? 'red-text' : 'blue-text';
            const playerName = index === 0 ? 'P1' : 'P2';
            const barColor = healthPercent > 50 ? '#00ff88' : healthPercent > 25 ? '#ffaa00' : '#ff0000';
            playerHealthHTML += `
                <div class="player-health-bar">
                    <span class="pixel-text ${colorClass}">${playerName}: <span id="playerHealth${index}">${healthPercent}</span>%</span>
                    <div class="coop-health-bar">
                        <div id="playerHealthBar${index}" class="coop-health-fill" style="width: ${healthPercent}%;"></div>
                    </div>
                </div>
            `;
        });
        
        // 核心血条样式 - 根据血量变化颜色
        const coreHealthColor = targetHealthPercent > 50 ? '#00ff88' : targetHealthPercent > 25 ? '#ffaa00' : '#ff0000';
        const coreHealthClass = targetHealthPercent > 50 ? 'healthy' : targetHealthPercent > 25 ? 'warning' : 'critical';
        
        gameUI.innerHTML = `
            <div class="coop-info-left">
                <div class="coop-mode-header">
                    <span class="pixel-text coop-mode-label">${modeText}</span>
                    <span class="pixel-text coop-diff-label">${diffText}</span>
                </div>
                <span class="pixel-text">波次: <span id="waveDisplay">1</span>/${totalWaves}</span>
                <div class="coop-players-health">${playerHealthHTML}</div>
            </div>
            <div class="coop-info-center">
                <span class="pixel-text" id="waveStatus">敌人来袭！</span>
                
                <!-- 核心状态UI -->
                <div class="core-status-container">
                    <div class="core-icon">⚡</div>
                    <div class="core-info">
                        <div class="core-name">能量核心</div>
                        <div class="core-health-bar-container">
                            <div class="core-health-bar-bg">
                                <div id="coreHealthBar" class="core-health-fill ${coreHealthClass}" style="width: ${targetHealthPercent}%;"></div>
                            </div>
                            <span id="coreHealthText" class="core-health-text">${targetHealthPercent}%</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="coop-info-right">
                <span class="pixel-text">击杀: <span id="killDisplay">0</span></span>
                <span class="pixel-text">分数: <span id="scoreDisplay">0</span></span>
                <span class="pixel-text">复活: <span id="livesDisplay">${'❤️'.repeat(this.sharedLives)}</span></span>
            </div>
        `;
    }

    updateSkillsUI() {
        const skillsBottom = document.querySelector('.skills-bottom');
        if (!skillsBottom) return;
        
        const p1Skills = `
            <div class="skills-container-bottom">
                <div class="skill-item" id="skill1-p1">
                    <span class="skill-icon">💚</span>
                    <span class="skill-name">治疗</span>
                    <span class="skill-key">U</span>
                    <div class="skill-cooldown-overlay" id="skill1-cooldown-p1"></div>
                </div>
                <div class="skill-item" id="skill2-p1">
                    <span class="skill-icon">⚡</span>
                    <span class="skill-name">冲刺</span>
                    <span class="skill-key">I</span>
                    <div class="skill-cooldown-overlay" id="skill2-cooldown-p1"></div>
                </div>
                <div class="skill-item" id="skill3-p1">
                    <span class="skill-icon">💥</span>
                    <span class="skill-name">爆发</span>
                    <span class="skill-key">O</span>
                    <div class="skill-cooldown-overlay" id="skill3-cooldown-p1"></div>
                </div>
            </div>
        `;
        
        const p2Skills = this.playerCount === 2 ? `
            <div class="skills-container-bottom-right">
                <div class="skill-item" id="skill1-p2">
                    <span class="skill-icon">💚</span>
                    <span class="skill-name">治疗</span>
                    <span class="skill-key">4</span>
                    <div class="skill-cooldown-overlay" id="skill1-cooldown-p2"></div>
                </div>
                <div class="skill-item" id="skill2-p2">
                    <span class="skill-icon">⚡</span>
                    <span class="skill-name">冲刺</span>
                    <span class="skill-key">5</span>
                    <div class="skill-cooldown-overlay" id="skill2-cooldown-p2"></div>
                </div>
                <div class="skill-item" id="skill3-p2">
                    <span class="skill-icon">💥</span>
                    <span class="skill-name">爆发</span>
                    <span class="skill-key">6</span>
                    <div class="skill-cooldown-overlay" id="skill3-cooldown-p2"></div>
                </div>
            </div>
        ` : '';
        
        skillsBottom.innerHTML = p1Skills + p2Skills;
    }

    updateCoopUI() {
        const waveInfo = this.waveManager.getWaveInfo();
        const waveDisplay = document.getElementById('waveDisplay');
        const killDisplay = document.getElementById('killDisplay');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const livesDisplay = document.getElementById('livesDisplay');
        const waveStatus = document.getElementById('waveStatus');
        
        // 核心UI元素
        const coreHealthBar = document.getElementById('coreHealthBar');
        const coreHealthText = document.getElementById('coreHealthText');
        
        if (waveDisplay) waveDisplay.textContent = waveInfo.currentWave;
        if (killDisplay) killDisplay.textContent = this.totalKills;
        if (scoreDisplay) scoreDisplay.textContent = this.score;
        if (livesDisplay) livesDisplay.textContent = '❤️'.repeat(Math.max(0, this.sharedLives));
        
        // 更新核心血条UI
        const healthPercent = Math.round((this.protectTarget.health / this.protectTarget.maxHealth) * 100);
        if (coreHealthBar) {
            coreHealthBar.style.width = `${healthPercent}%`;
            // 更新颜色类
            coreHealthBar.classList.remove('healthy', 'warning', 'critical');
            if (healthPercent > 50) {
                coreHealthBar.classList.add('healthy');
            } else if (healthPercent > 25) {
                coreHealthBar.classList.add('warning');
            } else {
                coreHealthBar.classList.add('critical');
            }
        }
        if (coreHealthText) {
            coreHealthText.textContent = `${healthPercent}%`;
            // 根据血量改变文字颜色
            if (healthPercent <= 25) {
                coreHealthText.style.color = '#ff4444';
                coreHealthText.style.textShadow = '0 0 8px rgba(255, 68, 68, 0.8)';
            } else if (healthPercent <= 50) {
                coreHealthText.style.color = '#ffaa00';
                coreHealthText.style.textShadow = '0 0 8px rgba(255, 170, 0, 0.6)';
            } else {
                coreHealthText.style.color = '#00ff88';
                coreHealthText.style.textShadow = '0 0 8px rgba(0, 255, 136, 0.6)';
            }
        }
        
        this.players.forEach((player, index) => {
            const playerHealth = document.getElementById(`playerHealth${index}`);
            const playerHealthBar = document.getElementById(`playerHealthBar${index}`);
            if (playerHealth && playerHealthBar) {
                const healthPercent = Math.round((player.health / player.maxHealth) * 100);
                playerHealth.textContent = healthPercent;
                playerHealthBar.style.width = `${healthPercent}%`;
                playerHealthBar.style.background = healthPercent > 50 ? '#00ff88' : healthPercent > 25 ? '#ffaa00' : '#ff0000';
            }
        });
        
        if (waveStatus) {
            if (waveInfo.isBreakTime) {
                waveStatus.textContent = `休息中... ${Math.ceil(waveInfo.breakTimer / 1000)}秒`;
                waveStatus.style.color = '#00ff88';
            } else if (waveInfo.isBossWave) {
                waveStatus.textContent = '⚠️ BOSS来袭！';
                waveStatus.style.color = '#ff0000';
            } else {
                waveStatus.textContent = `敌人: ${waveInfo.enemiesSpawned}/${waveInfo.totalEnemies}`;
                waveStatus.style.color = '#fff';
            }
        }
    }

    spawnEnemy(enemyType) {
        const obstacles = this.game.obstacleManager.obstacles;
        const spawnPoint = this.enemySpawnPoints[Math.floor(Math.random() * this.enemySpawnPoints.length)];
        
        const config = CONFIG.ENEMY_TYPES[enemyType] || CONFIG.ENEMY_TYPES.basic;
        const enemyWidth = config.width;
        const enemyHeight = config.height;
        
        let finalX = spawnPoint.x;
        let finalY = spawnPoint.y;
        
        const isOverlapping = (x, y) => {
            const enemyRect = { x, y, width: enemyWidth, height: enemyHeight };
            for (const obs of obstacles) {
                if (obs.destroyed) continue;
                if (CollisionUtils.rectCollision(enemyRect, obs)) {
                    return true;
                }
            }
            return false;
        };
        
        if (isOverlapping(finalX, finalY)) {
            let found = false;
            for (let radius = 50; radius <= 300 && !found; radius += 50) {
                for (let angle = 0; angle < Math.PI * 2 && !found; angle += Math.PI / 4) {
                    const testX = spawnPoint.x + Math.cos(angle) * radius;
                    const testY = spawnPoint.y + Math.sin(angle) * radius;
                    
                    if (testX < 0 || testX > this.mapWidth - enemyWidth || testY < 0 || testY > this.mapHeight - enemyHeight) continue;
                    
                    if (!isOverlapping(testX, testY)) {
                        finalX = testX;
                        finalY = testY;
                        found = true;
                    }
                }
            }
            
            if (!found) {
                for (let attempt = 0; attempt < 20; attempt++) {
                    const testX = 1600 + Math.random() * 1000;
                    const testY = 200 + Math.random() * 1400;
                    if (!isOverlapping(testX, testY)) {
                        finalX = testX;
                        finalY = testY;
                        break;
                    }
                }
            }
        }
        
        const colorConfig = CONFIG.ENEMY_COLORS[enemyType] || CONFIG.ENEMY_COLORS.basic;
        
        // 使用对象池创建敌人
        const enemy = EnemyPool.acquire(finalX, finalY, enemyType, colorConfig, this.enemies.length + 3);
        
        // 设置敌人属性
        enemy.setTargetPlayers(this.players);
        enemy.setProtectTarget(this.protectTarget);
        enemy.setObstacles(obstacles);
        
        // 应用升级系统的攻击倍率
        enemy.attackDamage = Math.round(enemy.attackDamage * this.upgradeSystem.attackMultiplier);
        
        this.enemies.push(enemy);
        
        // 插入空间网格
        this.spatialGrid.insert(enemy);
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        if (this.upgradeSystem.isUpgradeScreenShown) return;
        
        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, CONFIG.PERFORMANCE.MAX_DELTA_TIME);
        this.lastTime = currentTime;
        
        this.perfMonitor.startFrame();
        
        if (!this.isPaused) {
            this.update(deltaTime);
            this.render();
        }
        
        this.perfMonitor.endFrame();
        
        // 更新性能监控数据
        this.perfMonitor.updatePoolStats('Bullets', BulletPool.getStats());
        this.perfMonitor.updatePoolStats('Explosions', ExplosionPool.getStats());
        this.perfMonitor.updatePoolStats('Enemies', EnemyPool.getStats());
        this.perfMonitor.updateSpatialStats(this.spatialGrid.getStats());
        this.perfMonitor.updateCullingStats(this.viewportCulling.getStats());
        this.perfMonitor.updateEntityCounts({
            bullets: BulletPool.getActive().length,
            explosions: ExplosionPool.getActive().length,
            enemies: EnemyPool.getActive().length,
            obstacles: this.game.obstacleManager.obstacles.filter(o => !o.destroyed).length
        });
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    updateCamera() {
        let targetX, targetY;

        const alivePlayers = this.players.filter(p => p.health > 0);
        if (alivePlayers.length === 0) {
            targetX = this.camera.x;
            targetY = this.camera.y;
        } else if (alivePlayers.length === 1) {
            targetX = alivePlayers[0].x + alivePlayers[0].width / 2 - this.camera.viewWidth / 2;
            targetY = alivePlayers[0].y + alivePlayers[0].height / 2 - this.camera.viewHeight / 2;
        } else {
            const midX = (alivePlayers[0].x + alivePlayers[0].width / 2 + alivePlayers[1].x + alivePlayers[1].width / 2) / 2;
            const midY = (alivePlayers[0].y + alivePlayers[0].height / 2 + alivePlayers[1].y + alivePlayers[1].height / 2) / 2;
            targetX = midX - this.camera.viewWidth / 2;
            targetY = midY - this.camera.viewHeight / 2;
        }

        const maxCameraX = Math.max(0, this.mapWidth - this.camera.viewWidth);
        const maxCameraY = Math.max(0, this.mapHeight - this.camera.viewHeight);
        
        targetX = Math.max(0, Math.min(targetX, maxCameraX));
        targetY = Math.max(0, Math.min(targetY, maxCameraY));

        // 使用配置中的插值因子
        const lerpFactor = CONFIG.CAMERA.LERP_FACTOR;
        this.camera.x += (targetX - this.camera.x) * lerpFactor;
        this.camera.y += (targetY - this.camera.y) * lerpFactor;

        this.camera.x = Math.max(0, Math.min(this.camera.x, maxCameraX));
        this.camera.y = Math.max(0, Math.min(this.camera.y, maxCameraY));
    }

    update(deltaTime) {
        const enemyType = this.waveManager.update(deltaTime);
        if (enemyType) {
            this.spawnEnemy(enemyType);
        }

        const activeEnemies = EnemyPool.getActive().filter(e => e.health > 0).length;
        if (this.waveManager.checkWaveComplete(activeEnemies)) {
            if (this.waveManager.isGameComplete()) {
                this.gameVictory();
                return;
            }
            this.showUpgradeScreen();
            return;
        }

        if (this.upgradeSystem.isUpgradeScreenShown) {
            return;
        }

        const obstacles = this.game.obstacleManager.obstacles;
        const isDayMode = document.body.classList.contains('day-mode');

        // 更新空间网格
        this.spatialGrid.clear();
        
        // 插入障碍物到空间网格
        obstacles.forEach(obs => {
            if (!obs.destroyed) {
                this.spatialGrid.insert(obs);
            }
        });
        
        // 插入玩家到空间网格
        this.players.forEach(player => {
            if (player.health > 0) {
                this.spatialGrid.insert(player);
            }
        });
        
        // 插入敌人到空间网格
        const activeEnemiesList = EnemyPool.getActive();
        activeEnemiesList.forEach(enemy => {
            if (enemy.health > 0) {
                this.spatialGrid.insert(enemy);
            }
        });

        this.players.forEach(player => {
            if (player.health > 0) {
                player.autoAim(this.enemies, obstacles);
                player.update(this.game.keys, isDayMode, obstacles, this.mapWidth, this.mapHeight);
            }
        });

        activeEnemiesList.forEach(enemy => {
            if (enemy.health > 0) {
                // 应用群体AI行为（Boids算法）
                const neighbors = this.spatialGrid.queryNearby(enemy, 150);
                const target = enemy.target || this.protectTarget;
                flockingBehavior.applyToEntity(enemy, neighbors, target, obstacles);
                
                enemy.update({}, isDayMode, obstacles, this.mapWidth, this.mapHeight);

                if (enemy.needsToShoot) {
                    enemy.needsToShoot = false;
                    const attack = enemy.rangedAttack();
                    if (attack) {
                        // 使用对象池创建子弹
                        const bullet = BulletPool.acquire(
                            attack.x, attack.y, 
                            attack.direction, 
                            attack.damage, 
                            attack.owner, 
                            enemy.colorConfig
                        );
                        this.bullets.push(bullet);
                        soundManager.playShoot();
                    }
                }
            }
        });

        this.updateBullets();
        this.updateExplosions();
        this.updateDamageNumbers();
        this.checkPlayerDeath();
        this.updateCamera();
        this.updateCoopUI();
    }

    updateBullets() {
        const activeBullets = BulletPool.getActive();
        
        for (let i = activeBullets.length - 1; i >= 0; i--) {
            const bullet = activeBullets[i];
            bullet.update();
            
            if (bullet.x < 0 || bullet.x > this.mapWidth || bullet.y < 0 || bullet.y > this.mapHeight) {
                BulletPool.release(bullet);
                continue;
            }
            
            const obsResult = this.game.obstacleManager.damageFromBullet(bullet);
            if (obsResult.hit) {
                if (obsResult.destroyed) {
                    this.createExplosion(obsResult.x, obsResult.y, '#ffaa00');
                    soundManager.playObstacleBreak();
                } else {
                    this.createExplosion(bullet.x, bullet.y, '#888888');
                    soundManager.playExplosion();
                }
                BulletPool.release(bullet);
                continue;
            }
            
            let hit = false;
            
            for (const player of this.players) {
                if (bullet.owner >= 3 && bullet.checkCollision(player) && player.health > 0) {
                    player.takeDamage(bullet.damage);
                    // 触发伤害数字
                    damageNumberManager.spawn(
                        player.x + player.width / 2,
                        player.y,
                        bullet.damage,
                        false,
                        false
                    );
                    // 触发屏幕震动（玩家受击）
                    screenShake.shake(5, 10);
                    this.createExplosion(bullet.x, bullet.y, '#ff0000');
                    soundManager.playHit();
                    hit = true;
                    break;
                }
            }
            
            if (!hit && bullet.owner >= 3 && this.checkProtectTargetCollision(bullet)) {
                this.damageProtectTarget(bullet.damage);
                // 触发伤害数字
                damageNumberManager.spawn(
                    this.protectTarget.x + this.protectTarget.width / 2,
                    this.protectTarget.y,
                    bullet.damage,
                    false,
                    false
                );
                // 触发屏幕震动（核心受击）
                screenShake.shake(8, 15);
                this.createExplosion(bullet.x, bullet.y, '#ff0000');
                soundManager.playHit();
                hit = true;
            }
            
            if (!hit) {
                // 使用空间网格查询附近的敌人
                const nearbyEnemies = this.spatialGrid.queryNearby(bullet, 50);
                for (const enemy of nearbyEnemies) {
                    if (bullet.owner < 3 && enemy.health > 0 && bullet.checkCollision(enemy)) {
                        enemy.takeDamage(bullet.damage);
                        // 触发伤害数字
                        damageNumberManager.spawn(
                            enemy.x + enemy.width / 2,
                            enemy.y,
                            bullet.damage,
                            bullet.damage > enemy.maxHealth * 0.3, // 暴击判断
                            false
                        );
                        this.createExplosion(bullet.x, bullet.y, enemy.colorConfig.medium);
                        soundManager.playHit();
                        
                        if (enemy.health <= 0) {
                            this.onEnemyKilled(enemy);
                        }
                        hit = true;
                        break;
                    }
                }
            }
            
            if (hit) {
                BulletPool.release(bullet);
            }
        }
    }

    checkProtectTargetCollision(bullet) {
        const target = this.protectTarget;
        return bullet.x < target.x + target.width &&
               bullet.x + bullet.width > target.x &&
               bullet.y < target.y + target.height &&
               bullet.y + bullet.height > target.y;
    }

    damageProtectTarget(damage) {
        this.protectTarget.health -= damage;
        
        // 触发核心受击UI反馈
        this.triggerCoreDamageFeedback();
        
        if (this.protectTarget.health <= 0) {
            this.protectTarget.health = 0;
            this.gameOver();
        }
    }

    // 核心受击UI反馈
    triggerCoreDamageFeedback() {
        const coreContainer = document.querySelector('.core-status-container');
        if (coreContainer) {
            // 移除旧动画类
            coreContainer.classList.remove('core-damage-flash');
            // 强制重绘
            void coreContainer.offsetWidth;
            // 添加动画类
            coreContainer.classList.add('core-damage-flash');
            
            // 动画结束后移除类
            setTimeout(() => {
                coreContainer.classList.remove('core-damage-flash');
            }, 300);
        }
    }

    onEnemyKilled(enemy) {
        this.score += enemy.scoreValue;
        this.totalKills++;
        this.waveKills++;
        this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ffaa00');
        soundManager.playExplosion();
        
        // 从空间网格中移除
        this.spatialGrid.remove(enemy);
        
        // 从对象池中释放
        EnemyPool.release(enemy);
    }

    updateExplosions() {
        const activeExplosions = ExplosionPool.getActive();
        
        for (let i = activeExplosions.length - 1; i >= 0; i--) {
            const exp = activeExplosions[i];
            exp.update();
            if (exp.life <= 0) {
                ExplosionPool.release(exp);
            }
        }
    }

    // 添加伤害数字更新方法
    updateDamageNumbers() {
        damageNumberManager.update();
    }
    createExplosion(x, y, color) {
        const explosion = ExplosionPool.acquire(x, y, color);
        return explosion;
    }

    checkPlayerDeath() {
        let alivePlayers = this.players.filter(p => p.health > 0).length;
        
        this.players.forEach((player, index) => {
            if (player.health <= 0 && !player.isDead) {
                player.isDead = true;
                this.sharedLives--;
                alivePlayers--;
                
                if (this.sharedLives < 0) {
                    this.gameOver();
                } else if (this.playerCount === 2) {
                    setTimeout(() => this.respawnPlayer(index), 3000);
                }
            }
        });
        
        if (this.playerCount === 1 && alivePlayers === 0 && this.sharedLives >= 0 && this.gameState === 'playing') {
            setTimeout(() => this.respawnPlayer(0), 3000);
        }
    }

    respawnPlayer(playerIndex) {
        if (this.gameState !== 'playing') return;
        const player = this.players[playerIndex];
        if (!player) return;
        player.health = player.maxHealth;
        player.isDead = false;
        player.x = 400 + Math.random() * 200;
        player.y = 700 + Math.random() * 400;
        this.createExplosion(player.x, player.y, '#00ff88');
    }

    render() {
        if (this.upgradeSystem.isUpgradeScreenShown) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        const isDayMode = document.body.classList.contains('day-mode');

        // 应用屏幕震动
        screenShake.update();
        screenShake.apply(this.ctx);

        this.ctx.fillStyle = isDayMode ? '#e6f2ff' : '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 使用离屏缓存渲染网格
        this.renderGridCached(isDayMode);

        // 使用离屏缓存渲染障碍物
        this.renderObstaclesCached(isDayMode);

        // 渲染爆炸
        const activeExplosions = ExplosionPool.getActive();
        activeExplosions.forEach(exp => {
            if (exp.life > 0) {
                exp.render(this.ctx, isDayMode);
            }
        });

        // 渲染子弹
        const activeBullets = BulletPool.getActive();
        activeBullets.forEach(bullet => {
            if (bullet.active) {
                bullet.render(this.ctx, isDayMode);
            }
        });

        // 渲染伤害数字
        damageNumberManager.render(this.ctx);

        // 渲染敌人（使用视口裁剪）
        const activeEnemies = EnemyPool.getActive();
        activeEnemies.forEach(enemy => {
            if (enemy.health > 0 && this.viewportCulling.isVisible(enemy, this.camera.x, this.camera.y, this.camera.viewWidth, this.camera.viewHeight)) {
                enemy.render(this.ctx, isDayMode);
            }
        });

        // 渲染玩家
        this.players.forEach(player => {
            if (player.health > 0) {
                player.render(this.ctx, isDayMode);
            }
        });

        // 绘制保护目标
        this.renderProtectTarget(isDayMode);

        this.ctx.restore();

        // 渲染小地图
        this.renderMinimap();
    }

    // 离屏缓存渲染网格
    renderGridCached(isDayMode) {
        const cacheKey = `grid_${isDayMode ? 'day' : 'night'}_${this.mapWidth}_${this.mapHeight}`;
        
        if (offscreenCache.isDirty(cacheKey)) {
            const cache = offscreenCache.getCanvas(cacheKey, this.mapWidth, this.mapHeight);
            
            cache.ctx.strokeStyle = isDayMode ? 'rgba(74, 158, 255, 0.2)' : 'rgba(15, 52, 96, 0.3)';
            cache.ctx.lineWidth = 1;
            const gridSize = CONFIG.CANVAS.GRID_SIZE;
            
            for (let x = 0; x < this.mapWidth; x += gridSize) {
                cache.ctx.beginPath();
                cache.ctx.moveTo(x, 0);
                cache.ctx.lineTo(x, this.mapHeight);
                cache.ctx.stroke();
            }
            for (let y = 0; y < this.mapHeight; y += gridSize) {
                cache.ctx.beginPath();
                cache.ctx.moveTo(0, y);
                cache.ctx.lineTo(this.mapWidth, y);
                cache.ctx.stroke();
            }
            
            offscreenCache.clearDirty(cacheKey);
        }
        
        // 直接绘制整个缓存画布（因为已经通过translate设置了坐标系）
        const cache = offscreenCache.getCanvas(cacheKey, this.mapWidth, this.mapHeight);
        this.ctx.drawImage(cache.canvas, 0, 0);
    }

    // 离屏缓存渲染障碍物
    renderObstaclesCached(isDayMode) {
        const cacheKey = `obstacles_${isDayMode ? 'day' : 'night'}_${this.game.obstacleManager.obstacles.length}`;
        
        if (offscreenCache.isDirty(cacheKey)) {
            const cache = offscreenCache.getCanvas(cacheKey, this.mapWidth, this.mapHeight);
            cache.ctx.clearRect(0, 0, this.mapWidth, this.mapHeight);
            
            this.game.obstacleManager.obstacles.forEach(obs => {
                if (!obs.destroyed) {
                    obs.render(cache.ctx, isDayMode);
                }
            });
            
            offscreenCache.clearDirty(cacheKey);
        }
        
        // 直接绘制整个缓存画布（因为已经通过translate设置了坐标系）
        const cache = offscreenCache.getCanvas(cacheKey, this.mapWidth, this.mapHeight);
        this.ctx.drawImage(cache.canvas, 0, 0);
    }

    renderProtectTarget(isDayMode) {
        const target = this.protectTarget;
        const healthPercent = target.health / target.maxHealth;
        
        this.ctx.strokeStyle = isDayMode ? '#2a6aaa' : '#00ff88';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(target.x, target.y, target.width, target.height);
        
        const fillColor = isDayMode ? 'rgba(74, 158, 255, 0.3)' : 'rgba(0, 255, 136, 0.2)';
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(target.x, target.y, target.width, target.height);
        
        this.ctx.fillStyle = isDayMode ? '#4a9eff' : '#00ff88';
        this.ctx.beginPath();
        this.ctx.arc(target.x + target.width / 2, target.y + target.height / 2, 30, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowColor = isDayMode ? '#4a9eff' : '#00ff88';
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(target.x + target.width / 2, target.y + target.height / 2, 20, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(target.x, target.y - 15, target.width, 10);
        
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(target.x, target.y - 15, target.width * healthPercent, 10);
        
        this.ctx.fillStyle = isDayMode ? '#2a6aaa' : '#00ff88';
        this.ctx.font = 'bold 14px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(target.name, target.x + target.width / 2, target.y - 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Courier New';
        this.ctx.fillText(`${target.health}/${target.maxHealth}`, target.x + target.width / 2, target.y - 6);
    }

    gameVictory() {
        this.gameState = 'victory';
        soundManager.playVictory();
        const modeText = this.playerCount === 1 ? '单人' : '双人';
        this.showResultScreen(`${modeText}闯关胜利！`, `总分: ${this.score} | 击杀: ${this.totalKills}`);
    }

    gameOver() {
        this.gameState = 'gameover';
        soundManager.playDefeat();
        const modeText = this.playerCount === 1 ? '单人' : '双人';
        this.showResultScreen(`${modeText}闯关失败`, `存活波次: ${this.waveManager.currentWave} | 总分: ${this.score}`);
    }

    showResultScreen(title, subtitle) {
        const endScreen = document.getElementById('endScreen');
        const victoryContainer = endScreen.querySelector('.victory-container');
        
        victoryContainer.innerHTML = `
            <h1 class="title pixel-text" style="color: #00ff88;">${title}</h1>
            <div class="victory-decoration">
                <div class="star">★</div>
                <div class="star">★</div>
                <div class="star">★</div>
            </div>
            <p class="victory-subtitle pixel-text">${subtitle}</p>
            <div class="end-buttons">
                <button id="coopRestartBtn" class="pixel-btn end-btn">🔄 再来一局</button>
                <button id="coopHomeBtn" class="pixel-btn end-btn">🏠 返回主页</button>
            </div>
        `;
        
        this.game.showScreen('endScreen');
        
        // 使用一次性事件监听器，避免重复绑定
        const restartBtn = document.getElementById('coopRestartBtn');
        const homeBtn = document.getElementById('coopHomeBtn');
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.game.isCoopMode = true;
                this.start(this.difficulty, this.playerCount);
            }, { once: true });
        }
        
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                this.stop();
                this.game.isCoopMode = false;
                this.game.coopMode = null;
                this.game.gameState = 'menu';
                this.game.showScreen('startScreen');
            }, { once: true });
        }
    }

    pause() {
        this.isPaused = !this.isPaused;
        
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (this.isPaused) {
            this.gameState = 'paused';
            pauseOverlay.classList.remove('hidden');
        } else {
            this.gameState = 'playing';
            pauseOverlay.classList.add('hidden');
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    stop() {
        this.gameState = 'stopped';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.hideMinimap();
        
        // 清理对象池
        BulletPool.releaseAll();
        ExplosionPool.releaseAll();
        EnemyPool.releaseAll();
        
        // 清理性能监控
        this.perfMonitor.destroy();
        
        // 清理升级计时器
        if (this.upgradeTimerInterval) {
            clearInterval(this.upgradeTimerInterval);
            this.upgradeTimerInterval = null;
        }
    }

    showUpgradeScreen() {
        this.upgradeSystem.isUpgradeScreenShown = true;
        const upgradeScreen = document.getElementById('upgradeScreen');
        const waveNum = document.getElementById('upgradeWaveNum');
        const currentHealth = document.getElementById('currentHealth');
        const currentAttack = document.getElementById('currentAttack');
        const currentSpeed = document.getElementById('currentSpeed');

        if (waveNum) waveNum.textContent = this.waveManager.currentWave;
        if (currentHealth && this.players[0]) currentHealth.textContent = Math.round(this.players[0].maxHealth + this.upgradeSystem.healthBonus);
        if (currentAttack) currentAttack.textContent = Math.round(this.upgradeSystem.attackMultiplier * 100) + '%';
        if (currentSpeed) currentSpeed.textContent = Math.round(this.upgradeSystem.speedMultiplier * 100) + '%';

        if (upgradeScreen) upgradeScreen.classList.remove('hidden');

        let timeLeft = CONFIG.UPGRADE.COUNTDOWN_TIME;
        const timerElement = document.getElementById('upgradeTimer');
        if (timerElement) timerElement.textContent = timeLeft;

        // 清理旧的计时器
        if (this.upgradeTimerInterval) {
            clearInterval(this.upgradeTimerInterval);
        }

        this.upgradeTimerInterval = setInterval(() => {
            timeLeft--;
            if (timerElement) timerElement.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(this.upgradeTimerInterval);
                this.upgradeTimerInterval = null;
                this.selectUpgrade('health');
            }
        }, 1000);

        const selectUpgrade = (type) => {
            if (this.upgradeTimerInterval) {
                clearInterval(this.upgradeTimerInterval);
                this.upgradeTimerInterval = null;
            }
            this.selectUpgrade(type);
        };

        document.getElementById('upgradeHealth').onclick = () => selectUpgrade('health');
        document.getElementById('upgradeAttack').onclick = () => selectUpgrade('attack');
        document.getElementById('upgradeSpeed').onclick = () => selectUpgrade('speed');
    }

    selectUpgrade(type) {
        switch(type) {
            case 'health':
                this.upgradeSystem.healthBonus += CONFIG.UPGRADE.HEALTH_BONUS;
                this.players.forEach(player => {
                    player.maxHealth += CONFIG.UPGRADE.HEALTH_BONUS;
                    player.health += CONFIG.UPGRADE.HEALTH_BONUS;
                });
                break;
            case 'attack':
                this.upgradeSystem.attackMultiplier += CONFIG.UPGRADE.ATTACK_MULTIPLIER;
                this.players.forEach(player => {
                    player.meleeDamage = Math.round(player.meleeDamage * (1 + CONFIG.UPGRADE.ATTACK_MULTIPLIER));
                    player.rangedDamage = Math.round(player.rangedDamage * (1 + CONFIG.UPGRADE.ATTACK_MULTIPLIER));
                });
                break;
            case 'speed':
                this.upgradeSystem.speedMultiplier += CONFIG.UPGRADE.SPEED_MULTIPLIER;
                this.players.forEach(player => {
                    player.speed *= (1 + CONFIG.UPGRADE.SPEED_MULTIPLIER);
                });
                break;
        }

        const upgradeScreen = document.getElementById('upgradeScreen');
        if (upgradeScreen) upgradeScreen.classList.add('hidden');
        this.upgradeSystem.isUpgradeScreenShown = false;

        this.waveManager.startWave(this.waveManager.currentWave + 1);
    }

    // 切换性能监控显示
    togglePerformanceMonitor() {
        this.perfMonitor.toggle();
    }
}
