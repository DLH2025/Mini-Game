class Player {
    constructor(x, y, colorConfig, controls, id, maxHealth = 200) {
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 64;
        this.colorConfig = colorConfig;
        this.colorName = colorConfig.name || 'red';
        this.controls = controls;
        this.id = id;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.speed = 4;
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
        this.meleeDamage = 15;
        this.rangedDamage = 10;
        this.isWinner = false;
        this.isDefeated = false;
        this.crownBounce = 0;
        this.isMeleeAttacking = false;

        this.skill1Cooldown = 0;
        this.skill1MaxCooldown = 300;
        this.skill2Cooldown = 0;
        this.skill2MaxCooldown = 180;
        this.skill3Cooldown = 0;
        this.skill3MaxCooldown = 240;
        this.isDashing = false;
        this.dashTimer = 0;
        this.isBlasting = false;
        this.blastTimer = 0;
    }

    update(param1) {
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
                const keys = param1;
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
                if (dirX !== 0 || dirY !== 0) {
                    this.direction = { x: dirX, y: dirY };
                }
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        this.x = Math.max(0, Math.min(1400 - this.width, this.x));
        this.y = Math.max(0, Math.min(900 - this.height, this.y));

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

        if (!this.isAI && param1) {
            this.isDefending = param1[this.controls.defend];
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

    meleeAttack() {
        if (this.meleeCooldown > 0 || this.isDefending || this.isDashing) return null;
        this.isAttacking = true;
        this.attackType = 'melee';
        this.meleeCooldown = 30;
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
        this.rangedCooldown = 20;
        return {
            x: this.x + this.width / 2 - 8 + this.direction.x * (this.width / 2 + 5),
            y: this.y + this.height / 2 - 4 + this.direction.y * (this.height / 2 + 5),
            direction: this.direction,
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
        
        const maxDashDistance = 300;
        let dashDistance = maxDashDistance;
        
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        
        const dirX = this.direction.x;
        const dirY = this.direction.y;
        
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
            if (dashDistance < 50) {
                dashDistance = 50;
            }
        }
        
        this.x += dirX * dashDistance;
        this.y += dirY * dashDistance;
        
        this.x = Math.max(0, Math.min(1400 - this.width, this.x));
        this.y = Math.max(0, Math.min(900 - this.height, this.y));
        
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
        }

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
        const x = this.x;
        const y = renderY;

        let bodyColor, darkColor, lightColor;
        if (isDayMode) {
            bodyColor = this.colorConfig.medium;
            darkColor = this.colorConfig.dark;
            lightColor = this.colorConfig.light;
        } else {
            bodyColor = this.colorConfig.medium;
            darkColor = this.colorConfig.dark;
            lightColor = this.colorConfig.light;
        }

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + px * 2, y + px * 4, px * 8, px * 8);

        ctx.fillStyle = lightColor;
        ctx.fillRect(x + px * 2, y + px * 4, px * 8, px * 2);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + px * 3, y, px * 6, px * 5);

        ctx.fillStyle = '#00ff88';
        const sensorOffsetX = this.direction.x * px * 2;
        const sensorOffsetY = this.direction.y * px * 1;
        ctx.fillRect(x + px * 5 + sensorOffsetX, y + px * 2 + sensorOffsetY, px * 2, px * 1);

        ctx.fillStyle = darkColor;
        const legOffset = (this.vx !== 0 || this.vy !== 0) ? Math.sin(this.animFrame * Math.PI / 2) * px : 0;
        ctx.fillRect(x + px * 2, y + px * 12, px * 3, px * 4 + legOffset);
        ctx.fillRect(x + px * 7, y + px * 12, px * 3, px * 4 - legOffset);

        ctx.fillStyle = bodyColor;
        if (this.isAttacking && this.attackType === 'melee') {
            const armX = x + px * 5 + this.direction.x * px * 4;
            const armY = y + px * 5 + this.direction.y * px * 2;
            ctx.fillRect(armX, armY, px * 3, px * 4);
        } else {
            ctx.fillRect(x, y + px * 5, px * 2, px * 5);
            ctx.fillRect(x + px * 10, y + px * 5, px * 2, px * 5);
        }

        if (this.isWinner) {
            this.drawCrown(ctx, renderY);
        }
    }

    drawDefeatedMech(ctx) {
        const px = 4;
        const x = this.x;
        const y = this.y + 20;

        const bodyColor = this.getDarkerColor(this.colorConfig.medium, 0.6);
        const darkColor = this.getDarkerColor(this.colorConfig.dark, 0.6);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + px * 2, y + px * 4, px * 8, px * 8);

        ctx.fillStyle = darkColor;
        ctx.fillRect(x + px * 3, y + px, px * 6, px * 4);

        ctx.fillStyle = darkColor;
        ctx.fillRect(x + px * 2, y + px * 12, px * 3, px * 3);
        ctx.fillRect(x + px * 7, y + px * 12, px * 3, px * 3);

        ctx.fillStyle = bodyColor;
        ctx.fillRect(x + px * 10, y + px * 8, px * 2, px * 3);
        ctx.fillRect(x - px * 1, y + px * 8, px * 2, px * 3);

        ctx.fillStyle = '#555';
        ctx.fillRect(x - px * 2, y + px * 10, px * 2, px * 6);
        ctx.fillRect(x + px * 12, y + px * 10, px * 2, px * 6);

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y + px * 12, px * 14, px * 2);
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
        if (this.attackFrame !== 5) return false;

        const attackSize = 40;
        const attackBox = {
            x: this.x + this.width / 2 - attackSize / 2 + this.direction.x * (this.width / 2 + 5),
            y: this.y + this.height / 2 - attackSize / 2 + this.direction.y * (this.height / 2 + 5),
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
    }
}
