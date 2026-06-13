class Enemy extends AIPlayer {
    constructor(x, y, colorConfig, id, maxHealth, enemyType = 'basic') {
        const config = CONFIG.ENEMY_TYPES[enemyType] || CONFIG.ENEMY_TYPES.basic;
        super(x, y, colorConfig, id, config.maxHealth);
        
        this.enemyType = enemyType;
        this.speed = config.speed;
        this.attackDamage = config.attackDamage;
        this.scoreValue = config.scoreValue;
        this.accuracy = config.accuracy;
        this.attackFrequency = config.attackFrequency;
        this.dodgeChance = config.dodgeChance || 0;
        this.decisionInterval = config.decisionInterval;
        this.idealRange = config.idealRange;
        this.shootRange = config.shootRange;
        this.isMelee = config.isMelee;
        this.width = config.width;
        this.height = config.height;

        this.target = null;
        this.targetPlayers = [];
        this.protectTarget = null;
        this.obstacles = [];
        this.aggroRange = CONFIG.ENEMY.AGGRO_RANGE;
        this.isAggroed = false;
    }

    setTargetPlayers(players) {
        this.targetPlayers = players.filter(p => p.health > 0);
    }

    setProtectTarget(target) {
        this.protectTarget = target;
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    updateTarget() {
        this.setTargetPlayers(this.targetPlayers);

        let closestPlayer = null;
        let closestPlayerDist = Infinity;

        for (const player of this.targetPlayers) {
            if (player.health <= 0) continue;
            const dist = Math.hypot(
                (player.x + player.width/2) - (this.x + this.width/2),
                (player.y + player.height/2) - (this.y + this.height/2)
            );
            if (dist < closestPlayerDist) {
                closestPlayerDist = dist;
                closestPlayer = player;
            }
        }

        // 检查是否有玩家进入仇恨范围
        if (closestPlayer && closestPlayerDist < this.aggroRange) {
            this.isAggroed = true;
            this.target = closestPlayer;
            return;
        }

        // 如果已经被仇恨锁定，继续攻击玩家（直到超出2倍范围）
        if (this.isAggroed && closestPlayer) {
            if (closestPlayerDist > this.aggroRange * CONFIG.ENEMY.AGGRO_RELEASE_MULTIPLIER) {
                this.isAggroed = false;
            } else {
                this.target = closestPlayer;
                return;
            }
        }

        // 优先攻击保护目标（核心）
        if (this.protectTarget && this.protectTarget.health > 0) {
            this.target = this.protectTarget;
            return;
        }

        // 最后选择最近的玩家
        if (closestPlayer) {
            this.target = closestPlayer;
        }
    }

    update(keys, isDayMode, obstacles = [], mapWidth = CONFIG.CANVAS.COOP_MAP_WIDTH, mapHeight = CONFIG.CANVAS.COOP_MAP_HEIGHT) {
        this.updateTarget();
        super.update(keys, isDayMode, obstacles, mapWidth, mapHeight);
    }

    rangedAttack() {
        if (!this.target || this.target.health <= 0) return null;
        
        const targetCenterX = this.target.x + this.target.width / 2;
        const targetCenterY = this.target.y + this.target.height / 2;
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        let dx = targetCenterX - myCenterX;
        let dy = targetCenterY - myCenterY;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 0) {
            dx /= dist;
            dy /= dist;
        }
        
        const accuracy = this.accuracy;
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * (1 - accuracy) * Math.PI;
        
        return {
            x: myCenterX,
            y: myCenterY,
            direction: { x: Math.cos(angle), y: Math.sin(angle) },
            damage: this.attackDamage,
            owner: this.id
        };
    }

    takeDamage(damage) {
        if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
            return;
        }
        super.takeDamage(damage);
    }
}
