class Player {
    constructor(x, y, colorConfig, controls, id, maxHealth = CONFIG.PLAYER.DEFAULT_MAX_HEALTH) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER.DEFAULT_WIDTH;
        this.height = CONFIG.PLAYER.DEFAULT_HEIGHT;
        this.colorConfig = colorConfig;
        this.colorName = colorConfig.name || 'red';
        this.controls = controls;
        this.id = id;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.speed = CONFIG.PLAYER.DEFAULT_SPEED;
        this.direction = { x: id === 1 ? 1 : -1, y: 0 };
        this.moveDir = { x: 0, y: 0 };
        this.isAI = false;
        this.isDefending = false;
        this.isAttacking = false;
        this.meleeCooldown = 0;
        this.rangedCooldown = 0;
        this.attackType = null;
        this.attackFrame = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.meleeDamage = CONFIG.PLAYER.DEFAULT_MELEE_DAMAGE;
        this.rangedDamage = CONFIG.PLAYER.DEFAULT_RANGED_DAMAGE;
        this.isWinner = false;
        this.isDefeated = false;
        this.crownBounce = 0;
        this.isMeleeAttacking = false;
        this.meleeHitObstacle = false;
        this.meleeHitPlayer = false;
        this.isDead = false;

        this.skill1Cooldown = 0;
        this.skill1MaxCooldown = CONFIG.COOLDOWNS.SKILL1;
        this.skill2Cooldown = 0;
        this.skill2MaxCooldown = CONFIG.COOLDOWNS.SKILL2;
        this.skill3Cooldown = 0;
        this.skill3MaxCooldown = CONFIG.COOLDOWNS.SKILL3;
        this.isDashing = false;
        this.dashTimer = 0;
        this.isBlasting = false;
        this.blastTimer = 0;
        
        // 自动锁定敌人
        this.autoLockTarget = null;
        this.lockRange = CONFIG.PLAYER.LOCK_RANGE;
        this.currentObstacles = [];
    }

    findNearestEnemy(enemies, obstacles = []) {
        let nearestDist = Infinity;
        let nearestEnemy = null;
        
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        for (const enemy of enemies) {
            if (enemy.health <= 0) continue;
            const enemyCenterX = enemy.x + enemy.width / 2;
            const enemyCenterY = enemy.y + enemy.height / 2;
            const dx = enemyCenterX - myCenterX;
            const dy = enemyCenterY - myCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist && dist < this.lockRange) {
                // 检查视线是否被阻挡
                const hasLineOfSight = this.checkLineOfSight(myCenterX, myCenterY, enemyCenterX, enemyCenterY, obstacles);
                // 优先选择有视线的敌人，如果没有则选择最近的（穿墙锁定）
                if (hasLineOfSight || nearestEnemy === null) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            }
        }
        
        return nearestEnemy;
    }
    
    checkLineOfSight(x1, y1, x2, y2, obstacles) {
        for (const obs of obstacles) {
            if (obs.destroyed) continue;
            if (this.lineIntersectsRect(x1, y1, x2, y2, obs)) {
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

    autoAim(enemies, obstacles = []) {
        this.currentObstacles = obstacles;
        const target = this.findNearestEnemy(enemies, obstacles);
        if (!target) return false;
        
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        
        const dx = targetCenterX - myCenterX;
        const dy = targetCenterY - myCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 设置方向朝向目标（自由方向，非八向限制）
        if (dist > 0) {
            this.direction.x = dx / dist;
            this.direction.y = dy / dist;
        }
        
        this.autoLockTarget = target;
        return true;
    }

    update(keys, isDayMode, obstacles = [], mapWidth = CONFIG.CANVAS.GAME_WIDTH, mapHeight = CONFIG.CANVAS.GAME_HEIGHT) {
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

        this.vx = 0;
        this.vy = 0;
        let dirX = 0;
        let dirY = 0;
        let hasInput = false;

        if (!this.isAttacking) {
            if (this.isAI) {
                if (this.moveDir && (this.moveDir.x !== 0 || this.moveDir.y !== 0)) {
                    this.vx = this.moveDir.x * this.speed;
                    this.vy = this.moveDir.y * this.speed;
                    dirX = this.moveDir.x;
                    dirY = this.moveDir.y;
                    hasInput = true;
                }
            } else {
                if (keys && keys[this.controls.up]) {
                    this.vy = -this.speed;
                    dirY = -1;
                    hasInput = true;
                }
                if (keys && keys[this.controls.down]) {
                    this.vy = this.speed;
                    dirY = 1;
                    hasInput = true;
                }
                if (keys && keys[this.controls.left]) {
                    this.vx = -this.speed;
                    dirX = -1;
                    hasInput = true;
                }
                if (keys && keys[this.controls.right]) {
                    this.vx = this.speed;
                    dirX = 1;
                    hasInput = true;
                }
            }

            if (hasInput) {
                if (dirX !== 0 && dirY !== 0) {
                    const len = Math.sqrt(2);
                    this.vx /= len;
                    this.vy /= len;
                }
                // 记录移动方向，用于冲刺技能
                this.moveDir.x = dirX;
                this.moveDir.y = dirY;
                // 不再强制设置direction为移动方向
                // 攻击方向由autoAim控制
            } else {
                // 没有输入时重置移动方向
                this.moveDir.x = 0;
                this.moveDir.y = 0;
            }
        }

        // 计算新位置
        let newX = this.x + this.vx;
        let newY = this.y + this.vy;

        // 边界限制 - 使用传入的地图尺寸
        newX = Math.max(0, Math.min(mapWidth - this.width, newX));
        newY = Math.max(0, Math.min(mapHeight - this.height, newY));

        // 障碍物碰撞检测 - 分离轴检测防止卡入
        if (obstacles && obstacles.length > 0) {
            // 先尝试X轴移动
            let testX = newX;
            let xBlocked = false;
            const xRect = { x: testX, y: this.y, width: this.width, height: this.height };
            
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
            let testY = newY;
            let yBlocked = false;
            const yRect = { x: xBlocked ? this.x : newX, y: testY, width: this.width, height: this.height };
            
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

        if (!this.isAI && keys) {
            this.isDefending = keys[this.controls.defend];
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

    meleeAttack() {
        if (this.meleeCooldown > 0 || this.isDefending || this.isDashing) return null;
        this.isAttacking = true;
        this.attackType = 'melee';
        this.meleeCooldown = CONFIG.COOLDOWNS.MELEE;
        this.isMeleeAttacking = true;
        this.meleeHitObstacle = false; // 标记是否已经击中过掩体
        this.meleeHitPlayer = false; // 标记是否已经击打过玩家
        setTimeout(() => { this.isMeleeAttacking = false; }, 200);

        const attackSize = 40;
        return {
            x: this.x + this.width / 2 - attackSize / 2 + this.direction.x * (this.width / 2 + 5),
            y: this.y + this.height / 2 - attackSize / 2 + this.direction.y * (this.height / 2 + 5),
            width: attackSize,
            height: attackSize,
            damage: this.meleeDamage,
            owner: this.id,
            direction: this.direction
        };
    }

    rangedAttack() {
        if (this.rangedCooldown > 0 || this.isDefending || this.isDashing) return null;
        this.isAttacking = true;
        this.attackType = 'ranged';
        this.rangedCooldown = CONFIG.COOLDOWNS.RANGED;
        // 复制direction对象，避免引用问题
        const bulletDirection = { x: this.direction.x, y: this.direction.y };
        return {
            x: this.x + this.width / 2 - 8 + bulletDirection.x * (this.width / 2 + 15),
            y: this.y + this.height / 2 - 4 + bulletDirection.y * (this.height / 2 + 15),
            direction: bulletDirection,
            damage: this.rangedDamage,
            owner: this.id
        };
    }

    skill1() {
        if (this.skill1Cooldown > 0 || this.isDashing) return false;
        this.health += 60;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
        this.skill1Cooldown = this.skill1MaxCooldown;
        return true;
    }

    skill2(obstacles = []) {
        if (this.skill2Cooldown > 0 || this.isDashing) return false;
        this.isDashing = true;
        this.dashTimer = 10;
        this.skill2Cooldown = this.skill2MaxCooldown;
        
        const maxDashDistance = CONFIG.PLAYER.DASH_DISTANCE;
        let dashDistance = maxDashDistance;
        
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        
        // 使用移动方向进行冲刺，不跟随锁定目标
        let dirX = this.moveDir.x;
        let dirY = this.moveDir.y;

        // 如果没有移动输入，则使用当前朝向
        if (dirX === 0 && dirY === 0) {
            dirX = this.direction.x;
            dirY = this.direction.y;
        }

        // 归一化斜向移动方向
        if (dirX !== 0 && dirY !== 0) {
            const len = Math.sqrt(2);
            dirX /= len;
            dirY /= len;
        }

        const dashEndX = startX + dirX * maxDashDistance;
        const dashEndY = startY + dirY * maxDashDistance;
        
        let closestObstacleDist = maxDashDistance;
        
        obstacles.forEach(obs => {
            if (obs.destroyed) return;
            
            const closestX = Math.max(obs.x, Math.min(startX, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(startY, obs.y + obs.height));
            
            const dx = startX - closestX;
            const dy = startY - closestY;
            const distFromStart = Math.sqrt(dx * dx + dy * dy);
            
            if (distFromStart > 0) {
                const t = ((startX - closestX) * dirX + (startY - closestY) * dirY) / (distFromStart * distFromStart);
                
                let nearX, nearY;
                if (t < 0) {
                    nearX = startX;
                    nearY = startY;
                } else if (t > 1) {
                    nearX = startX + dirX * distFromStart;
                    nearY = startY + dirY * distFromStart;
                } else {
                    nearX = startX - dirX * t * distFromStart;
                    nearY = startY - dirY * t * distFromStart;
                }
                
                if (nearX >= obs.x && nearX <= obs.x + obs.width &&
                    nearY >= obs.y && nearY <= obs.y + obs.height) {
                    
                    const distToObstacle = Math.sqrt(Math.pow(nearX - startX, 2) + Math.pow(nearY - startY, 2));
                    
                    if (distToObstacle < closestObstacleDist) {
                        closestObstacleDist = distToObstacle;
                    }
                }
            }
        });
        
        if (closestObstacleDist < maxDashDistance - 10) {
            dashDistance = closestObstacleDist - this.width / 2 - 10;
            if (dashDistance < CONFIG.PLAYER.DASH_MIN_DISTANCE) {
                dashDistance = CONFIG.PLAYER.DASH_MIN_DISTANCE;
            }
        }
        
        // 计算目标位置
        let targetX = this.x + dirX * dashDistance;
        let targetY = this.y + dirY * dashDistance;
        
        // 边界限制
        targetX = Math.max(0, Math.min(CONFIG.CANVAS.GAME_WIDTH - this.width, targetX));
        targetY = Math.max(0, Math.min(CONFIG.CANVAS.GAME_HEIGHT - this.height, targetY));
        
        // 检测目标位置是否与障碍物碰撞，如果是则调整位置
        if (obstacles && obstacles.length > 0) {
            const targetRect = { x: targetX, y: targetY, width: this.width, height: this.height };
            
            for (const obs of obstacles) {
                if (obs.destroyed) continue;
                
                if (this.checkRectCollision(targetRect, obs)) {
                    // 如果目标位置在障碍物内，调整位置到障碍物边缘
                    if (dirX > 0) {
                        targetX = obs.x - this.width - 5;
                    } else if (dirX < 0) {
                        targetX = obs.x + obs.width + 5;
                    }
                    
                    if (dirY > 0) {
                        targetY = obs.y - this.height - 5;
                    } else if (dirY < 0) {
                        targetY = obs.y + obs.height + 5;
                    }
                    
                    // 重新检查边界
                    targetX = Math.max(0, Math.min(CONFIG.CANVAS.GAME_WIDTH - this.width, targetX));
                    targetY = Math.max(0, Math.min(CONFIG.CANVAS.GAME_HEIGHT - this.height, targetY));
                    
                    break;
                }
            }
        }
        
        this.x = targetX;
        this.y = targetY;
        
        return true;
    }

    skill3() {
        if (this.skill3Cooldown > 0 || this.isDashing || this.isBlasting) return false;
        this.isBlasting = true;
        this.blastTimer = 20;
        this.skill3Cooldown = this.skill3MaxCooldown;
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            damage: 30,
            radius: 100
        };
    }

    takeDamage(amount) {
        if (this.isDefending) {
            amount = Math.floor(amount * 0.2);
        }
        this.health -= amount;
        if (this.health < 0) this.health = 0;
    }

    render(ctx, isDayMode = false) {
        ctx.save();

        if (this.isDashing) {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = isDayMode ? this.colorConfig.light : this.colorConfig.medium;
            ctx.fillRect(this.x - 10, this.y - 10, this.width + 20, this.height + 20);
            ctx.globalAlpha = 1;
        }

        if (this.isBlasting) {
            const progress = 1 - this.blastTimer / 20;
            const currentRadius = 20 + progress * 80;
            const alpha = 1 - progress * 0.5;

            ctx.globalAlpha = alpha;
            const gradient = ctx.createRadialGradient(
                this.x + this.width / 2, this.y + this.height / 2, 0,
                this.x + this.width / 2, this.y + this.height / 2, currentRadius
            );
            gradient.addColorStop(0, isDayMode ? this.colorConfig.light : this.colorConfig.medium);
            gradient.addColorStop(0.5, isDayMode ? this.colorConfig.medium : this.colorConfig.dark);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, currentRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (this.isDefeated) {
            this.drawDefeatedMech(ctx);
        } else {
            let renderY = this.y;
            if (this.isWinner) {
                renderY = this.y + Math.abs(Math.sin(this.crownBounce * 2)) * 8;
            }

            if (this.isDefending) {
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = this.colorConfig.medium;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, renderY + this.height / 2, 45, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            if (this.skill1Cooldown <= 0) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
                ctx.globalAlpha = 1;
            }

            this.drawMechAt(ctx, renderY, isDayMode);

            if (this.isAttacking && this.attackType === 'melee') {
                this.drawMeleeAttack(ctx, isDayMode);
            }
            
            // 绘制锁定指示器
            if (this.autoLockTarget && this.autoLockTarget.health > 0) {
                this.drawLockIndicator(ctx, renderY);
            }
        }

        ctx.restore();
    }
    
    drawLockIndicator(ctx, renderY) {
        const target = this.autoLockTarget;
        if (!target) return;
        
        const myCenterX = this.x + this.width / 2;
        const myCenterY = renderY + this.height / 2;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        
        // 检查视线是否被阻挡
        const hasLineOfSight = this.checkLineOfSight(myCenterX, myCenterY, targetCenterX, targetCenterY, this.currentObstacles);
        
        // 绘制锁定线
        ctx.save();
        if (hasLineOfSight) {
            // 有视线 - 实线，亮色
            ctx.strokeStyle = this.colorConfig.light;
            ctx.setLineDash([]);
            ctx.globalAlpha = 0.8;
        } else {
            // 无视线（穿墙）- 虚线，暗色
            ctx.strokeStyle = '#888888';
            ctx.setLineDash([3, 3]);
            ctx.globalAlpha = 0.5;
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(myCenterX, myCenterY);
        ctx.lineTo(targetCenterX, targetCenterY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制目标标记
        if (hasLineOfSight) {
            ctx.strokeStyle = '#ff0000';
            ctx.globalAlpha = 0.8;
        } else {
            ctx.strokeStyle = '#888888';
            ctx.globalAlpha = 0.5;
        }
        ctx.lineWidth = 2;
        const markSize = 15;
        ctx.beginPath();
        ctx.moveTo(targetCenterX - markSize, targetCenterY - markSize);
        ctx.lineTo(targetCenterX - markSize / 2, targetCenterY - markSize);
        ctx.moveTo(targetCenterX + markSize / 2, targetCenterY - markSize);
        ctx.lineTo(targetCenterX + markSize, targetCenterY - markSize);
        ctx.lineTo(targetCenterX + markSize, targetCenterY - markSize / 2);
        ctx.moveTo(targetCenterX + markSize, targetCenterY + markSize / 2);
        ctx.lineTo(targetCenterX + markSize, targetCenterY + markSize);
        ctx.lineTo(targetCenterX + markSize / 2, targetCenterY + markSize);
        ctx.moveTo(targetCenterX - markSize / 2, targetCenterY + markSize);
        ctx.lineTo(targetCenterX - markSize, targetCenterY + markSize);
        ctx.lineTo(targetCenterX - markSize, targetCenterY + markSize / 2);
        ctx.moveTo(targetCenterX - markSize, targetCenterY - markSize / 2);
        ctx.lineTo(targetCenterX - markSize, targetCenterY - markSize);
        ctx.stroke();
        
        ctx.restore();
    }

    drawCrown(ctx, renderY) {
        const bounceY = Math.sin(this.crownBounce) * 5;
        const crownX = this.x + this.width / 2 - 16;
        const crownY = renderY - 30 + bounceY;

        ctx.fillStyle = '#ffd700';
        ctx.fillRect(crownX + 4, crownY + 8, 24, 8);
        ctx.fillRect(crownX + 2, crownY + 4, 6, 12);
        ctx.fillRect(crownX + 10, crownY + 2, 12, 14);
        ctx.fillRect(crownX + 24, crownY + 4, 6, 12);

        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(crownX + 4, crownY + 8, 4, 4);
        ctx.fillRect(crownX + 12, crownY + 2, 6, 6);
        ctx.fillRect(crownX + 24, crownY + 8, 4, 4);

        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(crownX, crownY - 5, 32, 25);
        ctx.shadowBlur = 0;
    }

    drawMechAt(ctx, renderY, isDayMode = false) {
        const px = 4;
        const x = Math.floor((this.x + this.width / 2) / px) * px;
        const y = Math.floor((renderY + this.height / 2) / px) * px;

        // 使用玩家自定义配色
        const primaryColor = this.colorConfig.medium;
        const secondaryColor = this.colorConfig.secondary || this.colorConfig.light;
        const whiteColor = '#FFFFFF';
        const darkColor = '#2C3E50';
        const glowColor = secondaryColor;

        const legOffset = (this.vx !== 0 || this.vy !== 0) ? Math.sin(this.animFrame * Math.PI / 2) * px * 2 : 0;
        
        // 绘制阴影
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x - px * 8, y + px * 18, px * 16, px * 3);

        // ===== 高达风格机器人绘制 =====
        
        // 腿部（机械风格）
        // 左腿 - 白色装甲
        ctx.fillStyle = whiteColor;
        ctx.fillRect(x - px * 6, y + px * 6, px * 4, px * 12 + legOffset);
        // 左腿关节 - 主色
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x - px * 5, y + px * 10 + legOffset, px * 2, px * 2);
        // 左腿底部 - 辅色
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(x - px * 6, y + px * 16 + legOffset, px * 4, px * 2);
        
        // 右腿 - 白色装甲
        ctx.fillStyle = whiteColor;
        ctx.fillRect(x + px * 2, y + px * 6, px * 4, px * 12 - legOffset);
        // 右腿关节 - 主色
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x + px * 3, y + px * 10 - legOffset, px * 2, px * 2);
        // 右腿底部 - 辅色
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(x + px * 2, y + px * 16 - legOffset, px * 4, px * 2);

        // 身体/躯干 - 白色主体
        ctx.fillStyle = whiteColor;
        ctx.fillRect(x - px * 6, y - px * 4, px * 12, px * 12);
        
        // 胸部装甲 - 主色
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x - px * 4, y - px * 2, px * 8, px * 6);
        
        // 胸部核心 - 辅色发光
        ctx.fillStyle = secondaryColor;
        ctx.shadowColor = secondaryColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(x - px * 2, y, px * 4, px * 3);
        ctx.shadowBlur = 0;
        
        // 核心高光
        ctx.fillStyle = this.colorConfig.light;
        ctx.fillRect(x - px * 1, y + px * 0.5, px * 2, px * 1);

        // 腰部装甲
        ctx.fillStyle = darkColor;
        ctx.fillRect(x - px * 5, y + px * 6, px * 10, px * 2);

        // 肩膀装甲（大型）
        ctx.fillStyle = primaryColor;
        // 左肩
        ctx.fillRect(x - px * 10, y - px * 6, px * 5, px * 6);
        ctx.fillRect(x - px * 9, y - px * 7, px * 3, px * 1);
        // 右肩
        ctx.fillRect(x + px * 5, y - px * 6, px * 5, px * 6);
        ctx.fillRect(x + px * 6, y - px * 7, px * 3, px * 1);

        // 手臂
        if (this.isAttacking && this.attackType === 'melee') {
            // 攻击姿态
            const armExtendX = Math.round(this.direction.x) * px * 4;
            const armExtendY = Math.round(this.direction.y) * px * 4;
            
            // 左臂 - 白色
            ctx.fillStyle = whiteColor;
            ctx.fillRect(x - px * 9, y - px * 2, px * 3, px * 6);
            // 左手 - 辅色
            ctx.fillStyle = secondaryColor;
            ctx.fillRect(x - px * 9, y + px * 4, px * 3, px * 2);
            
            // 右臂（伸出）- 白色
            ctx.fillStyle = whiteColor;
            ctx.fillRect(x + px * 6 + armExtendX, y - px * 2 + armExtendY, px * 3, px * 6);
            // 右手 - 辅色
            ctx.fillStyle = secondaryColor;
            ctx.fillRect(x + px * 6 + armExtendX, y + px * 4 + armExtendY, px * 3, px * 2);
            
            // 武器光效
            ctx.fillStyle = glowColor;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(x + px * 8 + armExtendX, y + px * 2 + armExtendY, px * 4, px * 4);
            ctx.globalAlpha = 1;
        } else {
            // 正常姿态
            // 左臂 - 白色
            ctx.fillStyle = whiteColor;
            ctx.fillRect(x - px * 9, y - px * 2, px * 3, px * 6);
            // 左手 - 辅色
            ctx.fillStyle = secondaryColor;
            ctx.fillRect(x - px * 9, y + px * 4, px * 3, px * 2);
            
            // 右臂 - 白色
            ctx.fillStyle = whiteColor;
            ctx.fillRect(x + px * 6, y - px * 2, px * 3, px * 6);
            // 右手 - 辅色
            ctx.fillStyle = secondaryColor;
            ctx.fillRect(x + px * 6, y + px * 4, px * 3, px * 2);
        }

        // 头部（高达风格）
        // 头盔主体 - 白色
        ctx.fillStyle = whiteColor;
        ctx.fillRect(x - px * 6, y - px * 14, px * 12, px * 10);
        ctx.fillRect(x - px * 5, y - px * 16, px * 10, px * 2);
        ctx.fillRect(x - px * 4, y - px * 17, px * 8, px * 1);

        // 头盔顶部天线 - 主色
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x - px * 6, y - px * 19, px * 2, px * 3);
        ctx.fillRect(x + px * 4, y - px * 19, px * 2, px * 3);
        // 天线顶端
        ctx.fillRect(x - px * 6, y - px * 20, px * 2, px * 1);
        ctx.fillRect(x + px * 4, y - px * 20, px * 2, px * 1);

        // 头盔侧面装甲 - 辅色
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(x - px * 8, y - px * 14, px * 2, px * 6);
        ctx.fillRect(x + px * 6, y - px * 14, px * 2, px * 6);

        // 眼睛（高达风格 - 绿色传感器）
        const eyeDirX = Math.round(this.direction.x) * px;
        const eyeDirY = Math.round(this.direction.y) * px;
        
        // 眼睛背景
        ctx.fillStyle = darkColor;
        ctx.fillRect(x - px * 4 + eyeDirX, y - px * 11 + eyeDirY, px * 8, px * 3);
        
        // 左眼 - 绿色发光
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.fillRect(x - px * 3 + eyeDirX, y - px * 10 + eyeDirY, px * 3, px * 1);
        
        // 右眼 - 绿色发光
        ctx.fillRect(x + px * 1 + eyeDirX, y - px * 10 + eyeDirY, px * 3, px * 1);
        ctx.shadowBlur = 0;

        // 嘴巴（机械风格线条）
        ctx.fillStyle = darkColor;
        ctx.fillRect(x - px * 2, y - px * 6, px * 4, px * 1);

        // 头部主色装饰
        ctx.fillStyle = primaryColor;
        ctx.fillRect(x - px * 1, y - px * 15, px * 2, px * 2);

        if (this.isWinner) {
            this.drawCrown(ctx, renderY);
        }
    }

    drawDefeatedMech(ctx) {
        const px = 4;
        const x = Math.floor((this.x + this.width / 2) / px) * px;
        const y = Math.floor((this.y + this.height / 2 + 20) / px) * px;

        // 使用玩家自定义配色
        const primaryColor = this.colorConfig.medium;
        const secondaryColor = this.colorConfig.secondary || this.colorConfig.light;
        const whiteColor = '#FFFFFF';
        const darkColor = '#2C3E50';

        // 倒下破损的高达机器人
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 2); // 侧躺
        
        // 身体 - 白色装甲破损
        ctx.fillStyle = whiteColor;
        ctx.fillRect(-px * 6, -px * 4, px * 12, px * 8);
        // 破损痕迹
        ctx.fillStyle = darkColor;
        ctx.fillRect(-px * 4, -px * 2, px * 3, px * 2);
        ctx.fillRect(px * 2, px * 1, px * 2, px * 2);
        
        // 头部 - 白色头盔
        ctx.fillStyle = whiteColor;
        ctx.fillRect(-px * 6, -px * 14, px * 12, px * 10);
        ctx.fillRect(-px * 5, -px * 16, px * 10, px * 2);
        ctx.fillRect(-px * 4, -px * 17, px * 8, px * 1);
        
        // 天线 - 主色（一个折断）
        ctx.fillStyle = primaryColor;
        ctx.fillRect(-px * 6, -px * 19, px * 2, px * 3);
        ctx.fillRect(-px * 6, -px * 20, px * 2, px * 1);
        // 右侧天线折断
        ctx.fillRect(px * 4, -px * 17, px * 2, px * 2);
        
        // 侧面装甲 - 辅色
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-px * 8, -px * 14, px * 2, px * 4);
        ctx.fillRect(px * 6, -px * 14, px * 2, px * 3);
        
        // 闭着的眼睛（X形）- 像素线
        ctx.fillStyle = darkColor;
        ctx.fillRect(-px * 3, -px * 10, px * 1, px * 1);
        ctx.fillRect(-px * 2, -px * 11, px * 1, px * 1);
        ctx.fillRect(-px * 1, -px * 10, px * 1, px * 1);
        ctx.fillRect(-px * 2, -px * 9, px * 1, px * 1);
        
        ctx.fillRect(px * 1, -px * 10, px * 1, px * 1);
        ctx.fillRect(px * 2, -px * 11, px * 1, px * 1);
        ctx.fillRect(px * 3, -px * 10, px * 1, px * 1);
        ctx.fillRect(px * 2, -px * 9, px * 1, px * 1);
        
        // 腿部 - 白色装甲
        ctx.fillStyle = whiteColor;
        ctx.fillRect(-px * 3, px * 4, px * 2, px * 8);
        ctx.fillRect(px * 1, px * 4, px * 2, px * 6);
        // 关节
        ctx.fillStyle = primaryColor;
        ctx.fillRect(-px * 3, px * 8, px * 2, px * 1);
        // 底部
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(-px * 3, px * 11, px * 2, px * 1);
        
        ctx.restore();
    }

    getDarkerColor(color, factor) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return '#' +
            Math.floor(r * factor).toString(16).padStart(2, '0') +
            Math.floor(g * factor).toString(16).padStart(2, '0') +
            Math.floor(b * factor).toString(16).padStart(2, '0');
    }

    getLighterColor(color, factor) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return '#' +
            Math.min(255, Math.floor(r + (255 - r) * factor)).toString(16).padStart(2, '0') +
            Math.min(255, Math.floor(g + (255 - g) * factor)).toString(16).padStart(2, '0') +
            Math.min(255, Math.floor(b + (255 - b) * factor)).toString(16).padStart(2, '0');
    }

    drawMeleeAttack(ctx, isDayMode = false) {
        const attackSize = 60;
        const attackX = this.x + this.width / 2 + this.direction.x * 30 - attackSize / 2;
        const attackY = this.y + this.height / 2 + this.direction.y * 30 - attackSize / 2;

        const progress = this.attackFrame / 20;
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = this.colorConfig.light;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2 + this.direction.x * 30,
                this.y + this.height / 2 + this.direction.y * 30,
                20 * (1 + progress), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    checkMeleeHit(target) {
        if (!this.isAttacking || this.attackType !== 'melee') return false;

        const attackSize = 40;
        const attackRange = 30;
        const attackBox = {
            x: this.x + this.width / 2 - attackSize / 2 + this.direction.x * attackRange,
            y: this.y + this.height / 2 - attackSize / 2 + this.direction.y * attackRange,
            width: attackSize,
            height: attackSize
        };

        return this.rectCollision(attackBox, target);
    }

    rectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    reset(x, y, level, newMaxHealth = null) {
        this.x = x;
        this.y = y;
        if (newMaxHealth !== null) {
            this.maxHealth = newMaxHealth;
        }
        this.health = this.maxHealth;
        this.isDefending = false;
        this.isAttacking = false;
        this.meleeCooldown = 0;
        this.rangedCooldown = 0;
        this.direction = { x: this.id === 1 ? 1 : -1, y: 0 };
        this.meleeDamage = 15 + (level - 1) * 1;
        this.rangedDamage = 10 + (level - 1) * 0.5;
        this.isWinner = false;
        this.isDefeated = false;
        this.crownBounce = 0;
        this.skill1Cooldown = 0;
        this.skill2Cooldown = 0;
        this.skill3Cooldown = 0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.isBlasting = false;
        this.blastTimer = 0;
        this.isDead = false;
        this.meleeHitObstacle = false;
        this.meleeHitPlayer = false;
    }
}
