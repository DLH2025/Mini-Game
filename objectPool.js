/**
 * Object Pool System
 * Efficiently reuses objects to reduce garbage collection
 */

class ObjectPool {
    constructor(factory, resetFn, initialSize = 50) {
        this.factory = factory;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        this.totalCreated = 0;
        this.totalReused = 0;
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
            this.totalCreated++;
        }
    }

    acquire(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.totalReused++;
        } else {
            obj = this.factory();
            this.totalCreated++;
        }
        
        this.resetFn(obj, ...args);
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.pool.push(obj);
        }
    }

    releaseAll() {
        while (this.active.length > 0) {
            this.pool.push(this.active.pop());
        }
    }

    getActive() {
        return this.active;
    }

    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.active.length,
            totalCreated: this.totalCreated,
            totalReused: this.totalReused,
            reuseRate: this.totalCreated > 0 ? (this.totalReused / this.totalCreated * 100).toFixed(1) + '%' : '0%'
        };
    }
}

// Bullet Pool Factory
const BulletPool = new ObjectPool(
    () => ({
        x: 0, y: 0,
        width: CONFIG.PHYSICS.BULLET_SIZE,
        height: CONFIG.PHYSICS.BULLET_SIZE / 2,
        speed: CONFIG.PHYSICS.BULLET_SPEED,
        direction: { x: 0, y: 0 },
        damage: 0,
        owner: 0,
        colorConfig: null,
        active: false,
        distance: 0,
        maxDistance: 1000
    }),
    (bullet, x, y, direction, damage, owner, colorConfig) => {
        bullet.x = x;
        bullet.y = y;
        bullet.direction = { ...direction };
        bullet.damage = damage;
        bullet.owner = owner;
        bullet.colorConfig = colorConfig;
        bullet.active = true;
        bullet.distance = 0;
        bullet.maxDistance = 1000;
    },
    CONFIG.POOL.BULLET_POOL_SIZE
);

// Explosion Pool Factory
const ExplosionPool = new ObjectPool(
    () => ({
        x: 0, y: 0,
        color: '#ff0000',
        radius: 0,
        maxRadius: CONFIG.PHYSICS.EXPLOSION_MAX_RADIUS,
        life: 0,
        maxLife: CONFIG.PHYSICS.EXPLOSION_LIFE,
        active: false,
        particles: []
    }),
    (explosion, x, y, color) => {
        explosion.x = x;
        explosion.y = y;
        explosion.color = color;
        explosion.radius = 0;
        explosion.maxRadius = CONFIG.PHYSICS.EXPLOSION_MAX_RADIUS;
        explosion.life = CONFIG.PHYSICS.EXPLOSION_LIFE;
        explosion.maxLife = CONFIG.PHYSICS.EXPLOSION_LIFE;
        explosion.active = true;
        explosion.particles = [];
        
        // Pre-generate particles
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            explosion.particles.push({
                x: 0, y: 0,
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: Math.sin(angle) * (2 + Math.random() * 3),
                life: 20 + Math.random() * 10,
                size: 2 + Math.random() * 3
            });
        }
    },
    CONFIG.POOL.EXPLOSION_POOL_SIZE
);

// Enemy Pool (for coop mode)
const EnemyPool = new ObjectPool(
    () => {
        const enemy = {
            x: 0, y: 0,
            width: 40,
            height: 52,
            health: 0,
            maxHealth: 0,
            speed: 0,
            active: false,
            enemyType: 'basic',
            colorConfig: null,
            direction: { x: 0, y: 0 },
            target: null,
            targetPlayers: [],
            protectTarget: null,
            obstacles: [],
            aggroRange: CONFIG.ENEMY.AGGRO_RANGE,
            isAggroed: false,
            attackDamage: 0,
            scoreValue: 0,
            needsToShoot: false,
            isAttacking: false,
            attackFrame: 0,
            attackType: null,
            isDashing: false,
            dashTimer: 0,
            isBlasting: false,
            blastTimer: 0,
            animFrame: 0,
            animTimer: 0,
            vx: 0,
            vy: 0,
            moveDir: { x: 0, y: 0 },
            isMelee: true,
            idealRange: 80,
            shootRange: 120,
            id: 0
        };
        
        // 绑定Enemy类的方法到对象池对象
        enemy.setTargetPlayers = function(players) {
            this.targetPlayers = players.filter(p => p.health > 0);
        };
        
        enemy.setProtectTarget = function(target) {
            this.protectTarget = target;
        };
        
        enemy.setObstacles = function(obstacles) {
            this.obstacles = obstacles;
        };
        
        enemy.updateTarget = function() {
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
        };
        
        enemy.rangedAttack = function() {
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
            
            const accuracy = this.accuracy || 0.5;
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * (1 - accuracy) * Math.PI;
            
            return {
                x: myCenterX,
                y: myCenterY,
                direction: { x: Math.cos(angle), y: Math.sin(angle) },
                damage: this.attackDamage,
                owner: this.id
            };
        };
        
        enemy.takeDamage = function(damage) {
            if (this.dodgeChance > 0 && Math.random() < this.dodgeChance) {
                return;
            }
            this.health -= damage;
            if (this.health < 0) this.health = 0;
        };
        
        enemy.checkCollision = function(other) {
            return this.x < other.x + other.width &&
                   this.x + this.width > other.x &&
                   this.y < other.y + other.height &&
                   this.y + this.height > other.y;
        };
        
        enemy.checkRectCollision = function(rect1, rect2) {
            return rect1.x < rect2.x + rect2.width &&
                   rect1.x + rect1.width > rect2.x &&
                   rect1.y < rect2.y + rect2.height &&
                   rect1.y + rect1.height > rect2.y;
        };
        
        // 简化的update方法（对象池对象不需要完整的AIPlayer继承链）
        enemy.update = function(keys, isDayMode, obstacles = [], mapWidth = 2800, mapHeight = 1800) {
            // 更新目标选择
            this.updateTarget();
            
            // 处理移动
            this.vx = 0;
            this.vy = 0;
            
            if (this.moveDir && (this.moveDir.x !== 0 || this.moveDir.y !== 0)) {
                this.vx = this.moveDir.x * this.speed;
                this.vy = this.moveDir.y * this.speed;
                
                // 斜向移动速度归一化
                if (this.vx !== 0 && this.vy !== 0) {
                    const len = Math.sqrt(2);
                    this.vx /= len;
                    this.vy /= len;
                }
                
                // 更新朝向
                this.direction = { 
                    x: this.moveDir.x > 0 ? 1 : this.moveDir.x < 0 ? -1 : this.direction.x,
                    y: this.moveDir.y > 0 ? 1 : this.moveDir.y < 0 ? -1 : this.direction.y
                };
            }
            
            // 计算新位置
            let newX = this.x + this.vx;
            let newY = this.y + this.vy;
            
            // 边界限制
            newX = Math.max(0, Math.min(mapWidth - this.width, newX));
            newY = Math.max(0, Math.min(mapHeight - this.height, newY));
            
            // 障碍物碰撞检测 - 分离轴检测
            if (obstacles && obstacles.length > 0) {
                let xBlocked = false;
                const xRect = { x: newX, y: this.y, width: this.width, height: this.height };
                
                for (const obs of obstacles) {
                    if (obs.destroyed) continue;
                    if (this.checkRectCollision(xRect, obs)) {
                        xBlocked = true;
                        break;
                    }
                }
                
                if (xBlocked) {
                    newX = this.x;
                }
                
                let yBlocked = false;
                const yRect = { x: xBlocked ? this.x : newX, y: newY, width: this.width, height: this.height };
                
                for (const obs of obstacles) {
                    if (obs.destroyed) continue;
                    if (this.checkRectCollision(yRect, obs)) {
                        yBlocked = true;
                        break;
                    }
                }
                
                if (yBlocked) {
                    newY = this.y;
                }
                
                // 如果两个轴都被阻挡，尝试沿墙滑动
                if (xBlocked && yBlocked) {
                    const slideDirections = [
                        { x: this.speed, y: 0 },
                        { x: -this.speed, y: 0 },
                        { x: 0, y: this.speed },
                        { x: 0, y: -this.speed },
                        { x: this.speed * 0.7, y: this.speed * 0.7 },
                        { x: -this.speed * 0.7, y: this.speed * 0.7 },
                        { x: this.speed * 0.7, y: -this.speed * 0.7 },
                        { x: -this.speed * 0.7, y: -this.speed * 0.7 }
                    ];
                    
                    let bestDir = null;
                    let bestDist = Infinity;
                    
                    for (const dir of slideDirections) {
                        const testX = this.x + dir.x;
                        const testY = this.y + dir.y;
                        const testRect = { x: testX, y: testY, width: this.width, height: this.height };
                        
                        let collided = false;
                        for (const obs of obstacles) {
                            if (obs.destroyed) continue;
                            if (this.checkRectCollision(testRect, obs)) {
                                collided = true;
                                break;
                            }
                        }
                        
                        if (!collided) {
                            const dirDist = Math.sqrt(
                                Math.pow(testX - (this.x + this.vx), 2) + 
                                Math.pow(testY - (this.y + this.vy), 2)
                            );
                            if (dirDist < bestDist) {
                                bestDist = dirDist;
                                bestDir = { x: testX, y: testY };
                            }
                        }
                    }
                    
                    if (bestDir) {
                        newX = bestDir.x;
                        newY = bestDir.y;
                    }
                }
            }
            
            this.x = newX;
            this.y = newY;
            
            // 更新动画
            this.animTimer++;
            if (this.animTimer > 10) {
                this.animTimer = 0;
                this.animFrame = (this.animFrame + 1) % 4;
            }
        };
        
        // 简化的render方法（使用EnemyRenderer进行精细化渲染）
        enemy.render = function(ctx, isDayMode = false) {
            enemyRenderer.render(ctx, this, isDayMode);
        };
        
        return enemy;
    },
    (enemy, x, y, enemyType, colorConfig, id) => {
        const config = CONFIG.ENEMY_TYPES[enemyType] || CONFIG.ENEMY_TYPES.basic;
        
        enemy.x = x;
        enemy.y = y;
        enemy.width = config.width;
        enemy.height = config.height;
        enemy.health = config.maxHealth;
        enemy.maxHealth = config.maxHealth;
        enemy.speed = config.speed;
        enemy.active = true;
        enemy.enemyType = enemyType;
        enemy.colorConfig = colorConfig;
        enemy.direction = { x: -1, y: 0 };
        enemy.target = null;
        enemy.targetPlayers = [];
        enemy.protectTarget = null;
        enemy.obstacles = [];
        enemy.aggroRange = CONFIG.ENEMY.AGGRO_RANGE;
        enemy.isAggroed = false;
        enemy.attackDamage = config.attackDamage;
        enemy.scoreValue = config.scoreValue;
        enemy.needsToShoot = false;
        enemy.isAttacking = false;
        enemy.attackFrame = 0;
        enemy.attackType = null;
        enemy.isDashing = false;
        enemy.dashTimer = 0;
        enemy.isBlasting = false;
        enemy.blastTimer = 0;
        enemy.animFrame = 0;
        enemy.animTimer = 0;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.moveDir = { x: 0, y: 0 };
        enemy.isMelee = config.isMelee;
        enemy.idealRange = config.idealRange;
        enemy.shootRange = config.shootRange;
        enemy.id = id;
        enemy.dodgeChance = config.dodgeChance || 0;
        enemy.accuracy = config.accuracy || 0.5;
    },
    CONFIG.POOL.ENEMY_POOL_SIZE
);

// Export pools
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ObjectPool, BulletPool, ExplosionPool, EnemyPool };
}
