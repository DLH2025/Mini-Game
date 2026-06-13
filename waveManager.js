const WAVE_CONFIGS = {
    easy: {
        totalWaves: 5,
        waves: [
            { enemies: [{ type: 'basic', count: 8 }, { type: 'ranged', count: 3 }], spawnInterval: 2000 },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 5 }], spawnInterval: 1800 },
            { enemies: [{ type: 'basic', count: 8 }, { type: 'ranged', count: 4 }, { type: 'fast', count: 3 }], spawnInterval: 1500 },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 5 }, { type: 'tank', count: 3 }], spawnInterval: 1200 },
            { enemies: [{ type: 'basic', count: 8 }, { type: 'ranged', count: 5 }, { type: 'elite', count: 2 }], spawnInterval: 1000, isBoss: true }
        ]
    },
    normal: {
        totalWaves: 10,
        waves: [
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 5 }], spawnInterval: 1800 },
            { enemies: [{ type: 'basic', count: 12 }, { type: 'ranged', count: 6 }], spawnInterval: 1600 },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 5 }, { type: 'fast', count: 4 }], spawnInterval: 1400 },
            { enemies: [{ type: 'basic', count: 8 }, { type: 'ranged', count: 6 }, { type: 'tank', count: 3 }], spawnInterval: 1300 },
            { enemies: [{ type: 'basic', count: 12 }, { type: 'ranged', count: 6 }, { type: 'fast', count: 5 }, { type: 'elite', count: 1 }], spawnInterval: 1200, isBoss: true },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 8 }, { type: 'fast', count: 5 }], spawnInterval: 1100 },
            { enemies: [{ type: 'basic', count: 8 }, { type: 'ranged', count: 8 }, { type: 'tank', count: 4 }], spawnInterval: 1000 },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 6 }, { type: 'fast', count: 8 }, { type: 'elite', count: 2 }], spawnInterval: 900 },
            { enemies: [{ type: 'basic', count: 15 }, { type: 'ranged', count: 10 }, { type: 'tank', count: 5 }], spawnInterval: 800 },
            { enemies: [{ type: 'basic', count: 10 }, { type: 'ranged', count: 8 }, { type: 'elite', count: 3 }, { type: 'boss', count: 1 }], spawnInterval: 700, isBoss: true }
        ]
    },
    endless: {
        totalWaves: Infinity,
        baseSpawnInterval: 1800,
        difficultyMultiplier: 1.08
    }
};

class WaveManager {
    constructor(difficulty) {
        this.difficulty = difficulty;
        this.config = WAVE_CONFIGS[difficulty];
        this.currentWave = 0;
        this.enemiesSpawned = 0;
        this.totalEnemiesInWave = 0;
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.isWaveActive = false;
        this.isBreakTime = false;
        this.breakTimer = 0;
        this.breakDuration = 8000;
        this.spawnQueue = [];
        this.difficultyScale = 1;
    }

    startWave(waveNumber) {
        this.currentWave = waveNumber;
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.isWaveActive = true;
        this.isBreakTime = false;
        
        if (this.difficulty === 'endless') {
            this.setupEndlessWave(waveNumber);
        } else {
            this.setupNormalWave(waveNumber);
        }
    }

    setupNormalWave(waveNumber) {
        const waveIndex = Math.min(waveNumber - 1, this.config.waves.length - 1);
        const waveData = this.config.waves[waveIndex];
        
        this.spawnQueue = [];
        this.totalEnemiesInWave = 0;
        
        for (const enemyGroup of waveData.enemies) {
            for (let i = 0; i < enemyGroup.count; i++) {
                this.spawnQueue.push(enemyGroup.type);
            }
            this.totalEnemiesInWave += enemyGroup.count;
        }
        
        this.spawnInterval = waveData.spawnInterval;
        this.isBossWave = waveData.isBoss || false;
    }

    setupEndlessWave(waveNumber) {
        this.spawnQueue = [];
        this.totalEnemiesInWave = 0;
        
        this.difficultyScale = Math.pow(this.config.difficultyMultiplier, waveNumber - 1);
        
        const baseCount = 8 + waveNumber * 3;
        const enemyTypes = this.getEndlessEnemyTypes(waveNumber);
        
        // 确保有近战和远程混合
        const meleeCount = Math.floor(baseCount * 0.6);
        const rangedCount = Math.floor(baseCount * 0.4);
        
        for (let i = 0; i < meleeCount; i++) {
            this.spawnQueue.push('basic');
        }
        for (let i = 0; i < rangedCount; i++) {
            this.spawnQueue.push('ranged');
        }
        
        this.totalEnemiesInWave = meleeCount + rangedCount;
        
        // 添加特殊敌人
        if (waveNumber >= 3) {
            const fastCount = Math.floor(waveNumber / 3);
            for (let i = 0; i < fastCount; i++) {
                this.spawnQueue.push('fast');
                this.totalEnemiesInWave++;
            }
        }
        
        if (waveNumber >= 5) {
            const tankCount = Math.floor(waveNumber / 5);
            for (let i = 0; i < tankCount; i++) {
                this.spawnQueue.push('tank');
                this.totalEnemiesInWave++;
            }
        }
        
        this.spawnInterval = Math.max(400, this.config.baseSpawnInterval / this.difficultyScale);
        this.isBossWave = waveNumber % 5 === 0;
        
        if (this.isBossWave) {
            this.spawnQueue.push('boss');
            this.totalEnemiesInWave++;
        }
    }

    getEndlessEnemyTypes(waveNumber) {
        const types = ['basic'];
        if (waveNumber >= 2) types.push('ranged');
        if (waveNumber >= 3) types.push('fast');
        if (waveNumber >= 5) types.push('tank');
        if (waveNumber >= 8) types.push('elite');
        return types;
    }

    update(deltaTime) {
        if (this.isBreakTime) {
            this.breakTimer -= deltaTime;
            if (this.breakTimer <= 0) {
                this.isBreakTime = false;
                this.startWave(this.currentWave + 1);
            }
            return null;
        }
        
        if (!this.isWaveActive) return null;
        
        this.spawnTimer -= deltaTime;
        
        if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
            this.spawnTimer = this.spawnInterval;
            const enemyType = this.spawnQueue.shift();
            this.enemiesSpawned++;
            return enemyType;
        }
        
        return null;
    }

    checkWaveComplete(activeEnemies) {
        if (!this.isWaveActive) return false;
        if (this.spawnQueue.length > 0) return false;
        if (activeEnemies > 0) return false;
        
        this.isWaveActive = false;
        this.isBreakTime = true;
        this.breakTimer = this.breakDuration;
        return true;
    }

    isGameComplete() {
        if (this.difficulty === 'endless') return false;
        return this.currentWave >= this.config.totalWaves;
    }

    getWaveInfo() {
        return {
            currentWave: this.currentWave,
            totalWaves: this.difficulty === 'endless' ? '∞' : this.config.totalWaves,
            enemiesSpawned: this.enemiesSpawned,
            totalEnemies: this.totalEnemiesInWave,
            isBreakTime: this.isBreakTime,
            breakTimer: this.breakTimer,
            isBossWave: this.isBossWave,
            difficultyScale: this.difficultyScale
        };
    }
}
