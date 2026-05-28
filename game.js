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
        
        this.gameMode = 'two';
        this.difficulty = 2;
        this.selectedMapId = 1;
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.defaultPlayer1Color = '#e94560';
        this.defaultPlayer2Color = '#4a9eff';
        this.player1Color = this.defaultPlayer1Color;
        this.player2Color = this.defaultPlayer2Color;
        
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
                        soundManager.playShoot();
                    }
                }
                if (e.code === this.players[0].controls.skill1) {
                    if (this.players[0].skill1()) {
                        this.createHealingEffect(this.players[0]);
                        soundManager.playSkill1();
                    }
                }
                if (e.code === this.players[0].controls.skill2) {
                    if (this.players[0].skill2(this.obstacleManager.obstacles)) {
                        this.createDashEffect(this.players[0]);
                        soundManager.playSkill2();
                    }
                }
                if (e.code === this.players[0].controls.skill3) {
                    const blast = this.players[0].skill3();
                    if (blast) {
                        this.createBlastEffect(this.players[0]);
                        this.processBlast(blast, this.players[1], this.players[0]);
                        soundManager.playSkill3();
                    }
                }
                
                // 双人模式时才处理玩家2输入
                if (this.gameMode === 'two') {
                    if (e.code === this.players[1].controls.melee) {
                        const attack = this.players[1].meleeAttack();
                        if (attack) soundManager.playMelee();
                    }
                    if (e.code === this.players[1].controls.ranged) {
                        const attack = this.players[1].rangedAttack();
                        if (attack) {
                            this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, this.players[1].colorConfig));
                            soundManager.playShoot();
                        }
                    }
                    if (e.code === this.players[1].controls.skill1) {
                        if (this.players[1].skill1()) {
                            this.createHealingEffect(this.players[1]);
                            soundManager.playSkill1();
                        }
                    }
                    if (e.code === this.players[1].controls.skill2) {
                        if (this.players[1].skill2(this.obstacleManager.obstacles)) {
                            this.createDashEffect(this.players[1]);
                            soundManager.playSkill2();
                        }
                    }
                    if (e.code === this.players[1].controls.skill3) {
                        const blast = this.players[1].skill3();
                        if (blast) {
                            this.createBlastEffect(this.players[1]);
                            this.processBlast(blast, this.players[0], this.players[1]);
                            soundManager.playSkill3();
                        }
                    }
                }
            }
            
            if ((this.gameState === 'gameover' || this.gameState === 'countdown') && e.code === 'Enter') {
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
        document.getElementById('singlePlayerBtn').addEventListener('click', () => {
            this.gameMode = 'single';
            this.showScreen('difficultyScreen');
        });
        
        document.getElementById('twoPlayerBtn').addEventListener('click', () => {
            this.gameMode = 'two';
            this.showScreen('mapSelectionScreen');
        });
        
        document.getElementById('easyBtn').addEventListener('click', () => {
            this.difficulty = 1;
            this.showScreen('mapSelectionScreen');
        });
        
        document.getElementById('normalBtn').addEventListener('click', () => {
            this.difficulty = 2;
            this.showScreen('mapSelectionScreen');
        });
        
        document.getElementById('hardBtn').addEventListener('click', () => {
            this.difficulty = 3;
            this.showScreen('mapSelectionScreen');
        });
        
        document.getElementById('backToStartBtn').addEventListener('click', () => {
            this.showScreen('startScreen');
        });
        
        document.getElementById('backFromMapBtn').addEventListener('click', () => {
            if (this.gameMode === 'single') {
                this.showScreen('difficultyScreen');
            } else {
                this.showScreen('startScreen');
            }
        });
        
        document.getElementById('randomMapBtn').addEventListener('click', () => {
            this.selectedMapId = 0;
            this.startGame();
        });
        
        this.setupMapSelection();
        
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('restartGameBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('homeBtn').addEventListener('click', () => {
            this.goToHome();
        });
        
        const settingsModal = document.getElementById('settingsModal');
        const settingsBtn = document.getElementById('settingsBtn');
        const closeModalBtn = document.getElementById('closeModalBtn');
        
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
        
        closeModalBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
        
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('hidden');
            }
        });
        
        // 新版侧边栏标签切换
        const sidebarTabs = document.querySelectorAll('.sidebar-tab');
        const settingsContents = document.querySelectorAll('.settings-content');
        
        const switchTab = (tabName) => {
            sidebarTabs.forEach(tab => {
                if (tab.dataset.tab === tabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            settingsContents.forEach(content => {
                if (content.id === tabName + 'Panel') {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        };
        
        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.tab);
            });
        });
        
        const healthLimitInput = document.getElementById('healthLimit');
        const healthLimitValue = document.getElementById('healthLimitValue');
        
        healthLimitInput.addEventListener('input', (e) => {
            this.healthLimit = parseInt(e.target.value);
            healthLimitValue.textContent = this.healthLimit;
        });
        
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
        
        // 音效设置
        this.setupSoundSettings();
    }
    
    setupSoundSettings() {
        const soundToggleBtn = document.getElementById('soundToggleBtn');
        const masterVolumeInput = document.getElementById('masterVolume');
        const masterVolumeValue = document.getElementById('masterVolumeValue');
        const sfxVolumeInput = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        const musicVolumeInput = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        
        if (!soundToggleBtn) return;
        
        const updateSoundToggle = () => {
            if (soundManager.enabled) {
                soundToggleBtn.textContent = '🔊 开启';
                soundToggleBtn.classList.add('active');
            } else {
                soundToggleBtn.textContent = '🔇 关闭';
                soundToggleBtn.classList.remove('active');
            }
        };
        
        soundToggleBtn.addEventListener('click', () => {
            soundManager.setEnabled(!soundManager.enabled);
            updateSoundToggle();
        });
        
        masterVolumeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            masterVolumeValue.textContent = value;
            soundManager.setMasterVolume(value / 100);
        });
        
        sfxVolumeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            sfxVolumeValue.textContent = value;
            soundManager.setSfxVolume(value / 100);
        });
        
        musicVolumeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            musicVolumeValue.textContent = value;
            soundManager.setMusicVolume(value / 100);
        });
        
        // 加载保存的音效设置
        masterVolumeInput.value = Math.round(soundManager.masterVolume * 100);
        masterVolumeValue.textContent = Math.round(soundManager.masterVolume * 100);
        sfxVolumeInput.value = Math.round(soundManager.sfxVolume * 100);
        sfxVolumeValue.textContent = Math.round(soundManager.sfxVolume * 100);
        musicVolumeInput.value = Math.round(soundManager.musicVolume * 100);
        musicVolumeValue.textContent = Math.round(soundManager.musicVolume * 100);
        updateSoundToggle();
    }
    
    setupMapSelection() {
        const mapGrid = document.getElementById('mapGrid');
        if (!mapGrid) return;
        
        mapGrid.innerHTML = '';
        
        MAPS.forEach((map, index) => {
            const mapCard = document.createElement('div');
            mapCard.className = 'map-card';
            mapCard.dataset.mapId = map.id;
            
            const previewContainer = document.createElement('div');
            previewContainer.className = 'map-preview';
            
            const canvas = document.createElement('canvas');
            canvas.id = `mapPreview${map.id}`;
            previewContainer.appendChild(canvas);
            
            const mapInfo = document.createElement('div');
            mapInfo.className = 'map-info';
            mapInfo.innerHTML = `
                <h3 class="map-name">${map.name}</h3>
                <p class="map-name-en">${map.nameEn}</p>
                <p class="map-description">${map.description}</p>
                <div class="map-difficulty">
                    ${'⭐'.repeat(map.difficulty)}
                </div>
            `;
            
            mapCard.appendChild(previewContainer);
            mapCard.appendChild(mapInfo);
            
            mapCard.addEventListener('click', () => {
                document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
                mapCard.classList.add('selected');
                this.selectedMapId = map.id;
                setTimeout(() => {
                    this.startGame(map.id);
                }, 300);
            });
            
            mapGrid.appendChild(mapCard);
        });
        
        setTimeout(() => {
            MAPS.forEach(map => {
                this.renderMapPreview(map.id);
            });
        }, 100);
    }
    
    renderMapPreview(mapId) {
        const canvas = document.getElementById(`mapPreview${mapId}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const map = MAPS[mapId - 1];
        const isDayMode = document.body.classList.contains('day-mode');
        
        canvas.width = 280;
        canvas.height = 180;
        
        const padding = 10;
        const mapWidth = canvas.width - padding * 2;
        const mapHeight = canvas.height - padding * 2;
        
        ctx.fillStyle = isDayMode ? '#e6f2ff' : '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const gridColor = isDayMode ? 'rgba(74, 158, 255, 0.2)' : 'rgba(74, 158, 255, 0.3)';
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        const gridSize = 14;
        for (let x = padding; x < canvas.width - padding; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, canvas.height - padding);
            ctx.stroke();
        }
        for (let y = padding; y < canvas.height - padding; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }
        
        const mapBgColor = isDayMode ? '#f0f8ff' : '#2d2d4a';
        const mapBorderColor = isDayMode ? '#4a9eff' : '#4a4a6a';
        ctx.fillStyle = mapBgColor;
        ctx.fillRect(padding, padding, mapWidth, mapHeight);
        
        ctx.strokeStyle = mapBorderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(padding, padding, mapWidth, mapHeight);
        
        if (map) {
            const scaleX = mapWidth / 1400;
            const scaleY = mapHeight / 900;
            
            map.obstacles.forEach((obs, index) => {
                const x = padding + obs.x * scaleX;
                const y = padding + obs.y * scaleY;
                const w = obs.w * scaleX;
                const h = obs.h * scaleY;
                
                const obsLightColor = isDayMode ? '#8ab4f8' : '#5a5a7a';
                const obsDarkColor = isDayMode ? '#5a8fd8' : '#4a4a6a';
                
                const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
                gradient.addColorStop(0, obsLightColor);
                gradient.addColorStop(1, obsDarkColor);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, w, h);
                
                ctx.strokeStyle = isDayMode ? '#6a9ad8' : '#7a7a9a';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, w, h);
                
                ctx.fillStyle = isDayMode ? 'rgba(140, 180, 248, 0.6)' : 'rgba(90, 90, 120, 0.5)';
                ctx.fillRect(x + 2, y + 2, w - 4, 3);
                ctx.fillRect(x + 2, y + 2, 3, h - 4);
                
                ctx.fillStyle = isDayMode ? 'rgba(90, 140, 200, 0.5)' : 'rgba(50, 50, 70, 0.5)';
                ctx.fillRect(x + w - 5, y + 5, 3, h - 7);
                ctx.fillRect(x + 5, y + h - 5, w - 7, 3);
            });
        }
        
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        const player1Glow = isDayMode ? '#cc3333' : '#e94560';
        const player1Color = isDayMode ? '#ff6b6b' : '#e94560';
        const player1Highlight = isDayMode ? '#ff9999' : '#ff6b8a';
        
        ctx.fillStyle = player1Color;
        ctx.shadowBlur = isDayMode ? 4 : 8;
        ctx.shadowColor = player1Glow;
        ctx.beginPath();
        ctx.arc(padding + 15, padding + mapHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = player1Highlight;
        ctx.beginPath();
        ctx.arc(padding + 13, padding + mapHeight / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        const player2Glow = isDayMode ? '#2266aa' : '#4a9eff';
        const player2Color = isDayMode ? '#5090f0' : '#4a9eff';
        const player2Highlight = isDayMode ? '#80c0ff' : '#7ac4ff';
        
        ctx.fillStyle = player2Color;
        ctx.shadowBlur = isDayMode ? 4 : 8;
        ctx.shadowColor = player2Glow;
        ctx.beginPath();
        ctx.arc(canvas.width - padding - 15, padding + mapHeight / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = player2Highlight;
        ctx.beginPath();
        ctx.arc(canvas.width - padding - 17, padding + mapHeight / 2 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        ctx.strokeStyle = isDayMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padding + 15, padding + mapHeight / 2);
        ctx.lineTo(canvas.width / 2, padding + mapHeight / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, padding + mapHeight / 2);
        ctx.lineTo(canvas.width - padding - 15, padding + mapHeight / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (map && map.description) {
            ctx.fillStyle = isDayMode ? 'rgba(200, 220, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(5, canvas.height - 20, canvas.width - 10, 15);
            
            const textColor = isDayMode ? '#2d5a8a' : '#aaa';
            ctx.fillStyle = textColor;
            ctx.font = '8px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(`难度: ${'⭐'.repeat(map.difficulty)}`, canvas.width / 2, canvas.height - 9);
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

    startGame(mapId = null) {
        if (mapId !== null) {
            this.selectedMapId = mapId;
        }
        
        this.level = 1;
        
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
        
        if (this.gameMode === 'single') {
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
            this.players[1].setTarget(this.players[0]);
        } else {
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
        
        if (this.selectedMapId === 0) {
            this.obstacleManager.generateObstacles(this.level);
        } else {
            this.obstacleManager.generateObstacles(this.level, this.selectedMapId);
        }
        
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
        
        soundManager.playMusic();
        
        let count = 3;
        countdownNumber.textContent = count;
        countdownText.textContent = '准备开始！';
        soundManager.playCountdown();
        
        const countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownNumber.textContent = count;
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out infinite';
                soundManager.playCountdown();
            } else if (count === 0) {
                countdownNumber.textContent = 'GO!';
                countdownNumber.style.color = '#ffd700';
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight;
                countdownNumber.style.animation = 'countdownPulse 0.3s ease-in-out infinite';
                countdownText.textContent = '开始战斗！';
                soundManager.playCountdown();
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
        
        if (this.players[0].isMeleeAttacking && !this.players[0].meleeHitPlayer) {
            if (this.players[0].checkMeleeHit(this.players[1])) {
                this.players[1].takeDamage(this.players[0].meleeDamage);
                this.players[0].meleeHitPlayer = true;
                this.createExplosion(this.players[1].x + this.players[1].width/2, this.players[1].y + this.players[1].height/2, this.players[0].colorConfig.medium);
                soundManager.playHit();
            }
        }
        
        if (this.players[1].isMeleeAttacking && !this.players[1].meleeHitPlayer) {
            if (this.players[1].checkMeleeHit(this.players[0])) {
                this.players[0].takeDamage(this.players[1].meleeDamage);
                this.players[1].meleeHitPlayer = true;
                this.createExplosion(this.players[0].x + this.players[0].width/2, this.players[0].y + this.players[0].height/2, this.players[1].colorConfig.medium);
                soundManager.playHit();
            }
        }
        
        if (this.players[0].isMeleeAttacking && !this.players[0].meleeHitObstacle) {
            const meleeResult1 = this.obstacleManager.damageFromMelee(this.players[0]);
            if (meleeResult1.hit) {
                this.players[0].meleeHitObstacle = true;
                this.createExplosion(meleeResult1.x, meleeResult1.y, '#888888');
                soundManager.playMelee();
            }
        }
        
        if (this.players[1].isMeleeAttacking && !this.players[1].meleeHitObstacle) {
            const meleeResult2 = this.obstacleManager.damageFromMelee(this.players[1]);
            if (meleeResult2.hit) {
                this.players[1].meleeHitObstacle = true;
                this.createExplosion(meleeResult2.x, meleeResult2.y, '#888888');
                soundManager.playMelee();
            }
        }
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            
            const obsResult = this.obstacleManager.damageFromBullet(bullet);
            if (obsResult.hit) {
                if (obsResult.destroyed) {
                    this.createExplosion(obsResult.x, obsResult.y, '#ffaa00');
                    soundManager.playObstacleBreak();
                } else {
                    this.createExplosion(bullet.x, bullet.y, '#888888');
                    soundManager.playExplosion();
                }
                return false;
            }
            
            if (bullet.owner === 1 && bullet.checkCollision(this.players[1])) {
                this.players[1].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[0].colorConfig.medium);
                soundManager.playHit();
                return false;
            }
            
            if (bullet.owner === 2 && bullet.checkCollision(this.players[0])) {
                this.players[0].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[1].colorConfig.medium);
                soundManager.playHit();
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
        if (!this.players[1]) return;
        
        const ai = this.players[1];
        
        // 处理远程射击
        if (ai.needsToShoot) {
            ai.needsToShoot = false;
            const attack = ai.rangedAttack();
            if (attack) {
                this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, ai.colorConfig));
                soundManager.playShoot();
            }
        }
        
        // 处理技能使用
        if (ai.currentAction) {
            switch (ai.currentAction) {
                case 'heal':
                    if (ai.skill1Cooldown <= 0) {
                        if (ai.skill1()) {
                            this.createHealingEffect(ai);
                        }
                    }
                    break;
                case 'dash':
                    if (ai.skill2Cooldown <= 0) {
                        if (ai.skill2(this.obstacleManager.obstacles)) {
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
            ai.currentAction = null;
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
                const damage = Math.ceil(obs.maxHealth * 0.5);
                obs.takeDamage(damage);
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
        soundManager.stopMusic();
        
        if (winner === 1) {
            this.players[0].isWinner = true;
            this.players[1].isDefeated = true;
            soundManager.playVictory();
        } else {
            this.players[1].isWinner = true;
            this.players[0].isDefeated = true;
            soundManager.playDefeat();
        }
        
        this.showVictoryAnimation(winner);
    }

    showVictoryAnimation(winner) {
        const endScreen = document.getElementById('endScreen');
        const victoryContainer = endScreen.querySelector('.victory-container');
        
        victoryContainer.innerHTML = `
            <h1 class="title pixel-text" style="color: ${winner === 1 ? this.player1Color : this.player2Color};">
                ${winner === 1 ? '🎉 红方获胜！🎉' : '🎉 蓝方获胜！🎉'}
            </h1>
            <div class="victory-decoration">
                <div class="star">★</div>
                <div class="star">★</div>
                <div class="star">★</div>
            </div>
            <p class="victory-subtitle pixel-text">恭喜获胜方！</p>
            <div class="end-buttons">
                <button id="playAgainBtn" class="pixel-btn end-btn">🔄 再来一局</button>
                <button id="changeMapBtn" class="pixel-btn end-btn">🗺️ 换个地图</button>
                <button id="homeBtnEnd" class="pixel-btn end-btn">🏠 返回主页</button>
            </div>
            <p class="end-hint pixel-text">选择上方选项继续游戏</p>
        `;
        
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
            this.setupEndScreenButtons();
        }, 3000);
    }
    
    setupEndScreenButtons() {
        const playAgainBtn = document.getElementById('playAgainBtn');
        const changeMapBtn = document.getElementById('changeMapBtn');
        const homeBtnEnd = document.getElementById('homeBtnEnd');
        
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.startGame();
            });
        }
        
        if (changeMapBtn) {
            changeMapBtn.addEventListener('click', () => {
                this.showScreen('mapSelectionScreen');
            });
        }
        
        if (homeBtnEnd) {
            homeBtnEnd.addEventListener('click', () => {
                this.goToHome();
            });
        }
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
