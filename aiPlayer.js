// AI玩家类 - 超简化但可用版本 - 修复版
class AIPlayer extends Player {
    constructor(x, y, colorConfig, controls, id, maxHealth, difficulty) {
        super(x, y, colorConfig, controls, id, maxHealth);
        this.difficulty = difficulty;
        this.isAI = true;
        this.target = null;
        this.bullets = [];
        this.obstacles = [];
        this.shootTimer = 0;
        
        // 难度设置
        this.shootDelay = difficulty === 1 ? 30 : difficulty === 2 ? 20 : 15;
    }

    // 设置目标
    setTarget(target) {
        this.target = target;
    }

    // 设置子弹
    setBullets(bullets) {
        this.bullets = bullets;
    }
    
    // 设置障碍物（空方法，兼容性）
    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    // 简化的AI更新
    updateAI() {
        if (!this.target) return;
        
        this.shootTimer++;
        
        // 总是面向目标
        this.lookAtTarget();
        
        // 总是向目标移动
        this.moveToTarget();
        
        // 射击
        if (this.shootTimer >= this.shootDelay) {
            this.shoot();
            this.shootTimer = 0;
        }
    }
    
    // 面向目标
    lookAtTarget() {
        if (!this.target) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction.x = dx > 0 ? 1 : -1;
            this.direction.y = 0;
        } else {
            this.direction.x = 0;
            this.direction.y = dy > 0 ? 1 : -1;
        }
    }
    
    // 向目标移动
    moveToTarget() {
        if (!this.target) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 100) { // 保持距离，不会太近
            this.moveDir.x = dx / dist;
            this.moveDir.y = dy / dist;
        } else if (dist < 80) {
            // 太近了，往后退
            this.moveDir.x = -dx / dist;
            this.moveDir.y = -dy / dist;
        } else {
            this.moveDir.x = 0;
            this.moveDir.y = 0;
        }
    }
    
    // 射击 - 这个需要game来实际创建子弹
    shoot() {
        // 我们设置一个标志，game会检查并创建子弹
        this.needsToShoot = true;
    }
}
