class AIPlayer extends Player {
    constructor(x, y, colorConfig, controls, id, maxHealth, difficulty) {
        super(x, y, colorConfig, controls, id, maxHealth);
        this.difficulty = difficulty;
        this.isAI = true;
        this.target = null;
        this.bullets = [];
        this.obstacles = [];
        
        this.state = 'idle';
        this.stateTimer = 0;
        this.decisionTimer = 0;
        this.currentAction = null;
        this.needsToShoot = false;
        
        this.idealRange = 350;
        this.dangerRange = 120;
        this.retreatRange = 80;
        this.shootRange = 500;
        
        this.lastTargetPos = { x: 0, y: 0 };
        this.targetVisible = false;
        this.targetInRange = false;
        
        this.skillTimers = {
            heal: 0,
            dash: 0,
            blast: 0
        };
        
        this.setupDifficulty();
    }

    setupDifficulty() {
        const configs = {
            1: { 
                reactionDelay: 40, 
                accuracy: 0.4, 
                dodgeChance: 0.05, 
                skillUseChance: 0,
                decisionInterval: 40,
                aimError: 0.5,
                predictMovement: false,
                retreatThreshold: 0.15,
                attackFrequency: 0.4,
                idleChance: 0.3,
                moveRandomly: true
            },
            2: { 
                reactionDelay: 18, 
                accuracy: 0.65, 
                dodgeChance: 0.2, 
                skillUseChance: 0.3,
                decisionInterval: 25,
                aimError: 0.25,
                predictMovement: false,
                retreatThreshold: 0.3,
                attackFrequency: 0.6,
                idleChance: 0.15,
                moveRandomly: false
            },
            3: { 
                reactionDelay: 5, 
                accuracy: 0.95, 
                dodgeChance: 0.6, 
                skillUseChance: 0.8,
                decisionInterval: 10,
                aimError: 0.05,
                predictMovement: true,
                retreatThreshold: 0.45,
                attackFrequency: 1.0,
                idleChance: 0,
                moveRandomly: false
            }
        };
        
        this.aiConfig = configs[this.difficulty] || configs[2];
    }

    setTarget(target) {
        this.target = target;
    }

    setBullets(bullets) {
        this.bullets = bullets;
    }

    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    update(keys, isDayMode, obstacles = [], mapWidth = 1400, mapHeight = 900) {
        if (this.isDashing) {
            this.dashTimer--;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
            this.crownBounce += 0.3;
            return;
        }

        if (this.isBlasting) {
            this.blastTimer--;
            if (this.blastTimer <= 0) {
                this.isBlasting = false;
            }
        }

        this.updateAI();
        
        this.vx = 0;
        this.vy = 0;
        
        if (this.moveDir && (this.moveDir.x !== 0 || this.moveDir.y !== 0)) {
            this.vx = this.moveDir.x * this.speed;
            this.vy = this.moveDir.y * this.speed;
            
            if (this.vx !== 0 && this.vy !== 0) {
                const len = Math.sqrt(2);
                this.vx /= len;
                this.vy /= len;
            }
            
            this.direction = { 
                x: this.moveDir.x > 0 ? 1 : this.moveDir.x < 0 ? -1 : this.direction.x,
                y: this.moveDir.y > 0 ? 1 : this.moveDir.y < 0 ? -1 : this.direction.y
            };
        }

        // 计算新位置
        let newX = this.x + this.vx;
        let newY = this.y + this.vy;

        // 边界限制 - 使用传入的地图尺寸
        newX = Math.max(0, Math.min(mapWidth - this.width, newX));
        newY = Math.max(0, Math.min(mapHeight - this.height, newY));

        // 障碍物碰撞检测 - 改进的分离轴检测，支持沿墙滑动
        if (obstacles && obstacles.length > 0) {
            // 先尝试X轴移动
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
                newX = this.x; // 阻止X轴移动
            }
            
            // 再尝试Y轴移动（使用更新后的X或原始X）
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
                newY = this.y; // 阻止Y轴移动
            }
            
            // 如果两个轴都被阻挡，尝试沿墙滑动（找最近的开口）
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
                        // 计算这个方向与目标方向的一致性
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

        if (this.meleeCooldown > 0) this.meleeCooldown--;
        if (this.rangedCooldown > 0) this.rangedCooldown--;
        if (this.skill1Cooldown > 0) this.skill1Cooldown--;
        if (this.skill2Cooldown > 0) this.skill2Cooldown--;
        if (this.skill3Cooldown > 0) this.skill3Cooldown--;

        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame > 20) {
                this.isAttacking = false;
                this.attackFrame = 0;
                this.attackType = null;
            }
        }

        this.animTimer++;
        if (this.animTimer > 10) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        if (this.isWinner) {
            this.crownBounce += 0.1;
        }
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    updateAI() {
        if (!this.target) return;
        
        this.decisionTimer++;
        this.stateTimer++;
        
        this.analyzeSituation();
        
        if (this.decisionTimer >= this.aiConfig.decisionInterval) {
            this.decisionTimer = 0;
            this.makeDecision();
        }
        
        this.executeAction();
        
        Object.keys(this.skillTimers).forEach(key => {
            if (this.skillTimers[key] > 0) this.skillTimers[key]--;
        });
    }

    analyzeSituation() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.targetInRange = dist < this.shootRange;
        this.targetVisible = this.checkLineOfSight();
        
        this.lastTargetPos = { x: this.target.x, y: this.target.y };
        
        this.threats = this.detectThreats();
        this.healthPercent = this.health / this.maxHealth;
        this.targetHealthPercent = this.target.health / this.target.maxHealth;
    }

    checkLineOfSight() {
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        const endX = this.target.x + this.target.width / 2;
        const endY = this.target.y + this.target.height / 2;
        
        for (const obs of this.obstacles) {
            if (obs.destroyed) continue;
            if (this.lineIntersectsRect(startX, startY, endX, endY, obs)) {
                return false;
            }
        }
        return true;
    }

    lineIntersectsRect(x1, y1, x2, y2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;
        
        if ((x1 < left && x2 < left) || (x1 > right && x2 > right) ||
            (y1 < top && y2 < top) || (y1 > bottom && y2 > bottom)) {
            return false;
        }
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        const t1 = (left - x1) / dx;
        const t2 = (right - x1) / dx;
        const t3 = (top - y1) / dy;
        const t4 = (bottom - y1) / dy;
        
        const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        return tmax >= 0 && tmin <= 1 && tmin <= tmax;
    }

    detectThreats() {
        const threats = [];
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        for (const bullet of this.bullets) {
            if (bullet.owner === this.id) continue;
            
            const bulletCenterX = bullet.x + bullet.width / 2;
            const bulletCenterY = bullet.y + bullet.height / 2;
            const dist = Math.sqrt(
                Math.pow(bulletCenterX - myCenterX, 2) + 
                Math.pow(bulletCenterY - myCenterY, 2)
            );
            
            if (dist < 200) {
                const willHit = this.predictBulletHit(bullet);
                if (willHit) {
                    threats.push({ type: 'bullet', obj: bullet, dist: dist, urgency: 200 - dist });
                }
            }
        }
        
        const targetDist = Math.sqrt(
            Math.pow(this.target.x - this.x, 2) + 
            Math.pow(this.target.y - this.y, 2)
        );
        
        if (targetDist < this.dangerRange && this.target.isMeleeAttacking) {
            threats.push({ type: 'melee', obj: this.target, dist: targetDist, urgency: 300 });
        }
        
        return threats.sort((a, b) => b.urgency - a.urgency);
    }

    predictBulletHit(bullet) {
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        const futureX = bullet.x + bullet.direction.x * bullet.speed * 5;
        const futureY = bullet.y + bullet.direction.y * bullet.speed * 5;
        
        const distToPath = this.pointToLineDistance(
            myCenterX, myCenterY,
            bullet.x, bullet.y,
            futureX, futureY
        );
        
        return distToPath < 60;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = x1; yy = y1;
        } else if (param > 1) {
            xx = x2; yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    makeDecision() {
        this.currentAction = null;
        this.needsToShoot = false;
        
        const urgentThreat = this.threats.length > 0 ? this.threats[0] : null;
        
        if (urgentThreat && urgentThreat.urgency > 150) {
            if (this.shouldUseDash()) {
                this.currentAction = 'dash';
                return;
            }
            
            if (this.shouldDefend()) {
                this.isDefending = true;
                this.state = 'defending';
                return;
            }
            
            this.state = 'dodge';
            this.dodgeThreat(urgentThreat);
            return;
        }
        
        this.isDefending = false;
        
        if (this.shouldUseHeal()) {
            this.currentAction = 'heal';
            return;
        }
        
        if (this.shouldUseBlast()) {
            this.currentAction = 'blast';
            return;
        }
        
        const dist = Math.sqrt(
            Math.pow(this.target.x - this.x, 2) + 
            Math.pow(this.target.y - this.y, 2)
        );
        
        if (dist < this.retreatRange) {
            this.state = 'retreat';
        } else if (dist < this.idealRange && this.targetVisible) {
            this.state = 'attack';
            if (Math.random() < this.aiConfig.attackFrequency) {
                this.currentAction = 'ranged';
            }
        } else if (dist < this.shootRange && this.targetVisible) {
            this.state = 'approach';
            if (Math.random() < this.aiConfig.attackFrequency) {
                this.currentAction = 'ranged';
            }
        } else {
            this.state = 'chase';
        }
    }

    shouldUseHeal() {
        if (this.aiConfig.skillUseChance <= 0) return false;
        if (this.skill1Cooldown > 0 || this.skillTimers.heal > 0) return false;
        if (this.healthPercent > this.aiConfig.retreatThreshold) return false;
        if (Math.random() > this.aiConfig.skillUseChance) return false;
        
        this.skillTimers.heal = 300;
        return true;
    }

    shouldUseDash() {
        if (this.aiConfig.skillUseChance <= 0) return false;
        if (this.skill2Cooldown > 0 || this.skillTimers.dash > 0) return false;
        if (Math.random() > this.aiConfig.skillUseChance * 0.8) return false;
        
        const dist = Math.sqrt(
            Math.pow(this.target.x - this.x, 2) + 
            Math.pow(this.target.y - this.y, 2)
        );
        
        if (dist > 400 && this.healthPercent < 0.5) {
            this.skillTimers.dash = 180;
            return true;
        }
        
        if (this.threats.length > 1) {
            this.skillTimers.dash = 180;
            return true;
        }
        
        return false;
    }

    shouldUseBlast() {
        if (this.aiConfig.skillUseChance <= 0) return false;
        if (this.skill3Cooldown > 0 || this.skillTimers.blast > 0) return false;
        if (Math.random() > this.aiConfig.skillUseChance) return false;
        
        const dist = Math.sqrt(
            Math.pow(this.target.x - this.x, 2) + 
            Math.pow(this.target.y - this.y, 2)
        );
        
        if (dist < 120) {
            this.skillTimers.blast = 240;
            return true;
        }
        
        return false;
    }

    shouldDefend() {
        if (this.aiConfig.dodgeChance <= 0) return false;
        if (this.threats.length === 0) return false;
        const topThreat = this.threats[0];
        return topThreat.type === 'bullet' && topThreat.dist < 100 && Math.random() < this.aiConfig.dodgeChance;
    }

    dodgeThreat(threat) {
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        let dodgeX = 0, dodgeY = 0;
        
        if (threat.type === 'bullet') {
            const bullet = threat.obj;
            dodgeX = -bullet.direction.y;
            dodgeY = bullet.direction.x;
            
            if (Math.random() > 0.5) {
                dodgeX = -dodgeX;
                dodgeY = -dodgeY;
            }
        } else {
            const dx = this.x - this.target.x;
            const dy = this.y - this.target.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                dodgeX = dx / dist;
                dodgeY = dy / dist;
            }
        }
        
        this.moveDir = { x: dodgeX, y: dodgeY };
    }

    executeAction() {
        // 简单模式：有几率发呆或随机移动
        if (this.aiConfig.idleChance > 0 && Math.random() < this.aiConfig.idleChance) {
            this.moveDir = { x: 0, y: 0 };
            return;
        }
        
        switch (this.state) {
            case 'attack':
                this.aimAtTarget();
                if (this.aiConfig.moveRandomly) {
                    this.randomMove();
                } else {
                    this.strafe();
                }
                if (this.targetVisible && this.targetInRange && this.currentAction === 'ranged') {
                    this.needsToShoot = true;
                }
                break;
                
            case 'approach':
                this.aimAtTarget();
                if (this.aiConfig.moveRandomly) {
                    this.randomMove();
                } else {
                    this.moveTowardsTarget();
                }
                if (this.targetVisible && this.targetInRange && this.currentAction === 'ranged') {
                    this.needsToShoot = true;
                }
                break;
                
            case 'chase':
                if (this.aiConfig.moveRandomly) {
                    this.randomMove();
                } else {
                    this.moveTowardsTarget();
                }
                this.aimAtTarget();
                break;
                
            case 'retreat':
                if (this.aiConfig.moveRandomly) {
                    this.randomMove();
                } else {
                    this.moveAwayFromTarget();
                }
                this.aimAtTarget();
                if (this.targetVisible && this.currentAction === 'ranged') {
                    this.needsToShoot = true;
                }
                break;
                
            case 'dodge':
                break;
                
            case 'defending':
                this.moveDir = { x: 0, y: 0 };
                break;
                
            default:
                this.aimAtTarget();
                this.moveDir = { x: 0, y: 0 };
        }
    }
    
    randomMove() {
        const time = Date.now() / 1000;
        const angle = Math.sin(time * 0.5) * Math.PI * 2;
        this.moveDir = {
            x: Math.cos(angle) * 0.5,
            y: Math.sin(angle) * 0.5
        };
    }

    aimAtTarget() {
        if (!this.target) return;
        
        let targetX = this.target.x + this.target.width / 2;
        let targetY = this.target.y + this.target.height / 2;
        
        if (this.aiConfig.predictMovement) {
            const targetVx = this.target.vx || 0;
            const targetVy = this.target.vy || 0;
            targetX += targetVx * 10;
            targetY += targetVy * 10;
        }
        
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        let dx = targetX - myCenterX;
        let dy = targetY - myCenterY;
        
        if (this.aiConfig.aimError > 0) {
            dx += (Math.random() - 0.5) * this.aiConfig.aimError * 100;
            dy += (Math.random() - 0.5) * this.aiConfig.aimError * 100;
        }
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction.x = dx > 0 ? 1 : -1;
            this.direction.y = 0;
        } else {
            this.direction.x = 0;
            this.direction.y = dy > 0 ? 1 : -1;
        }
    }

    moveTowardsTarget() {
        if (!this.target) return;
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            // 使用寻路系统获取移动方向
            const moveDir = pathfinder.getMoveDirection(
                this,
                this.target.x + this.target.width / 2,
                this.target.y + this.target.height / 2,
                this.obstacles,
                this.mapWidth || 1400,
                this.mapHeight || 900
            );
            
            this.moveDir = moveDir;
        }
    }

    moveAwayFromTarget() {
        if (!this.target) return;
        
        const dx = this.x - this.target.x;
        const dy = this.y - this.target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            // 后退时也考虑障碍物
            const retreatX = this.x + (dx / dist) * this.speed * 5;
            const retreatY = this.y + (dy / dist) * this.speed * 5;
            
            const moveDir = pathfinder.getMoveDirection(
                this,
                retreatX,
                retreatY,
                this.obstacles,
                this.mapWidth || 1400,
                this.mapHeight || 900
            );
            
            this.moveDir = moveDir;
        }
    }

    strafe() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            const perpX = -dy / dist;
            const perpY = dx / dist;
            
            const time = Date.now() / 1000;
            const strafeDir = Math.sin(time * 2) > 0 ? 1 : -1;
            
            // 使用寻路系统确保横向移动不会撞墙
            const targetX = this.x + perpX * strafeDir * this.speed * 3;
            const targetY = this.y + perpY * strafeDir * this.speed * 3;
            
            const moveDir = pathfinder.getMoveDirection(
                this,
                targetX,
                targetY,
                this.obstacles,
                this.mapWidth || 1400,
                this.mapHeight || 900
            );
            
            this.moveDir = moveDir;
        }
    }

    shoot() {
        this.needsToShoot = true;
    }
}
