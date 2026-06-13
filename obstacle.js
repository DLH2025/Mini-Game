class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHealth = 250;
        this.health = this.maxHealth;
        this.damageFlash = 0;
        this.destroyed = false;
        this.debris = [];
    }

    takeDamage(amount) {
        if (this.destroyed) return false;
        
        this.health -= amount;
        this.damageFlash = 10;
        
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
            this.generateDebris();
            // 标记障碍物缓存为脏，需要重新渲染
            offscreenCache.markDirty('obstacles_day_' + this.constructor.obstacleCount);
            offscreenCache.markDirty('obstacles_night_' + this.constructor.obstacleCount);
            return true;
        }
        return false;
    }

    generateDebris() {
        const debrisCount = 8;
        for (let i = 0; i < debrisCount; i++) {
            const angle = (Math.PI * 2 / debrisCount) * i + Math.random() * 0.5;
            const speed = 2 + Math.random() * 3;
            this.debris.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8 + Math.random() * 8,
                life: 60,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }
    }

    updateDebris() {
        this.debris = this.debris.filter(d => {
            d.x += d.vx;
            d.y += d.vy;
            d.vy += 0.2;
            d.rotation += d.rotationSpeed;
            d.life--;
            return d.life > 0;
        });
    }

    checkCollision(obj) {
        if (this.destroyed) return false;
        return obj.x < this.x + this.width &&
               obj.x + obj.width > this.x &&
               obj.y < this.y + this.height &&
               obj.y + obj.height > this.y;
    }

    render(ctx, isDayMode = false) {
        if (this.destroyed) {
            this.updateDebris();
            this.debris.forEach(d => {
                ctx.save();
                ctx.translate(d.x, d.y);
                ctx.rotate(d.rotation);
                ctx.globalAlpha = d.life / 60;
                ctx.fillStyle = isDayMode ? '#999' : '#5a5a6a';
                ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
                ctx.restore();
            });
            return;
        }

        const healthPercent = this.health / this.maxHealth;
        
        if (this.damageFlash > 0) {
            this.damageFlash--;
        }
        
        let baseColor, lightColor, darkColor;
        
        if (this.damageFlash > 0) {
            baseColor = '#ff6b6b';
            lightColor = '#ffaaaa';
            darkColor = '#aa3333';
        } else if (healthPercent > 0.6) {
            baseColor = isDayMode ? '#8ab4f8' : '#4a4a5a';
            lightColor = isDayMode ? '#a8cfff' : '#6a6a7a';
            darkColor = isDayMode ? '#5a8fd8' : '#3a3a4a';
        } else if (healthPercent > 0.3) {
            baseColor = isDayMode ? '#e6a0a0' : '#5a4a4a';
            lightColor = isDayMode ? '#ffc0c0' : '#7a6a6a';
            darkColor = isDayMode ? '#cc7070' : '#4a3a3a';
        } else {
            baseColor = isDayMode ? '#e08080' : '#6a3a3a';
            lightColor = isDayMode ? '#f0a0a0' : '#8a5a5a';
            darkColor = isDayMode ? '#c06060' : '#5a2a2a';
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        if (healthPercent > 0.3) {
            ctx.fillStyle = lightColor;
            ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 4);
            ctx.fillRect(this.x + 2, this.y + 2, 4, this.height - 4);
            
            ctx.fillStyle = darkColor;
            ctx.fillRect(this.x + this.width - 6, this.y + 2, 4, this.height - 4);
            ctx.fillRect(this.x + 2, this.y + this.height - 6, this.width - 4, 4);
        }
        
        ctx.fillStyle = healthPercent > 0.5 ? baseColor : darkColor;
        ctx.fillRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12);
        
        if (healthPercent > 0.6) {
            ctx.fillStyle = lightColor;
            ctx.fillRect(this.x + 8, this.y + 8, 8, 8);
            ctx.fillRect(this.x + this.width - 16, this.y + this.height - 16, 8, 8);
        }
        
        if (healthPercent <= 0.6 && healthPercent > 0.3) {
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(this.x + 20, this.y + 20, this.width - 40, this.height - 40);
        }
        
        if (healthPercent <= 0.3) {
            ctx.strokeStyle = '#1a1a2a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x + 10, this.y + 10);
            ctx.lineTo(this.x + this.width - 10, this.y + this.height - 10);
            ctx.moveTo(this.x + this.width - 10, this.y + 10);
            ctx.lineTo(this.x + 10, this.y + this.height - 10);
            ctx.stroke();
        }
        
        ctx.fillStyle = healthPercent <= 0.6 ? darkColor : '#3a3a4a';
        ctx.fillRect(this.x + 6, this.y + 6, this.width - 12, this.height - 12);
        
        const barWidth = this.width;
        const barHeight = 6;
        const barY = this.y - 12;
        
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(this.x, barY, barWidth, barHeight);
        
        let healthColor;
        if (healthPercent > 0.6) {
            healthColor = '#4CAF50';
        } else if (healthPercent > 0.3) {
            healthColor = '#FFC107';
        } else {
            healthColor = '#F44336';
        }
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = '#0a0a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, barY, barWidth, barHeight);
    }

    resolveCollision(player, prevX, prevY) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const obsCenterX = this.x + this.width / 2;
        const obsCenterY = this.y + this.height / 2;
        
        const dx = playerCenterX - obsCenterX;
        const dy = playerCenterY - obsCenterY;
        
        const overlapX = (player.width / 2 + this.width / 2) - Math.abs(dx);
        const overlapY = (player.height / 2 + this.height / 2) - Math.abs(dy);
        
        if (overlapX < overlapY) {
            if (dx > 0) {
                player.x = this.x + this.width + 1;
            } else {
                player.x = this.x - player.width - 1;
            }
            player.vx = 0;
        } else {
            if (dy > 0) {
                player.y = this.y + this.height + 1;
            } else {
                player.y = this.y - player.height - 1;
            }
            player.vy = 0;
        }
    }
}

class ObstacleManager {
    constructor() {
        this.obstacles = [];
    }

    generateObstacles(level, mapId = null, mapWidth = 1400, mapHeight = 900) {
        if (mapId && MAPS[mapId - 1]) {
            this.generateFromMap(MAPS[mapId - 1]);
        } else {
            this.generateRandom(level, mapWidth, mapHeight);
        }
    }

    generateFromMap(mapData) {
        this.obstacles = [];
        mapData.obstacles.forEach(obs => {
            this.obstacles.push(new Obstacle(obs.x, obs.y, obs.w, obs.h));
        });
    }

    generateRandom(level, mapWidth = 1400, mapHeight = 900) {
        this.obstacles = [];
        
        const gridSize = 100;
        const cols = Math.floor(mapWidth / gridSize);
        const rows = Math.floor(mapHeight / gridSize);
        
        const centerCol = Math.floor(cols / 2);
        const centerRow = Math.floor(rows / 2);
        
        const safeZoneCols = 1;
        const safeZoneRows = 2;
        
        // 玩家出生安全区域 - 根据地图尺寸动态计算
        // 玩家1出生在左侧 (mapWidth * 0.18, mapHeight * 0.39)
        // 玩家2出生在左侧 (mapWidth * 0.18, mapHeight * 0.61)
        const playerSafeZoneLeft = 0;
        const playerSafeZoneRight = mapWidth * 0.4;
        const playerSafeZoneTop = mapHeight * 0.3;
        const playerSafeZoneBottom = mapHeight * 0.7;
        
        let grid = [];
        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c <= centerCol; c++) {
                const gridX = c * gridSize;
                const gridY = r * gridSize;
                
                let inPlayerSafeZone = (gridX + gridSize > 50 && gridX < playerSafeZoneRight && 
                                        gridY + gridSize > playerSafeZoneTop && gridY < playerSafeZoneBottom);
                
                if (inPlayerSafeZone) {
                    grid[r][c] = false;
                } else {
                    const distFromCenterCol = Math.abs(c - centerCol);
                    const distFromCenterRow = Math.abs(r - centerRow);
                    const distFromCenter = Math.max(distFromCenterCol, distFromCenterRow);
                    
                    let probability = 0.3;
                    
                    if (distFromCenter === 0) {
                        probability = 0.95;
                    } else if (distFromCenter === 1) {
                        probability = 0.7;
                    } else if (distFromCenter === 2) {
                        probability = 0.5;
                    } else if (distFromCenter <= 4) {
                        probability = 0.35;
                    } else {
                        probability = 0.2;
                    }
                    
                    if (distFromCenterCol < safeZoneCols && distFromCenterRow < safeZoneRows) {
                        probability = 0;
                    } else if (distFromCenterCol < safeZoneCols || distFromCenterRow < safeZoneRows) {
                        probability = Math.min(probability, 0.3);
                    }
                    
                    grid[r][c] = Math.random() < probability;
                }
                
                const mirroredCol = cols - 1 - c;
                const mirroredRow = rows - 1 - r;
                
                if (!grid[mirroredRow]) {
                    grid[mirroredRow] = [];
                }
                grid[mirroredRow][mirroredCol] = grid[r][c];
            }
        }
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= centerCol; c++) {
                const mirroredRow = rows - 1 - r;
                if (grid[r][c] !== grid[mirroredRow][cols - 1 - c]) {
                    grid[mirroredRow][cols - 1 - c] = grid[r][c];
                }
            }
        }
        
        // 确保每行至少有一个通行缺口（至少2个连续的false格子）
        for (let r = 0; r < rows; r++) {
            let hasGap = false;
            let consecutiveEmpty = 0;
            
            // 检查当前行是否已有至少2个连续的空格
            for (let c = 0; c < cols; c++) {
                if (!grid[r][c]) {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= 2) {
                        hasGap = true;
                        break;
                    }
                } else {
                    consecutiveEmpty = 0;
                }
            }
            
            // 如果没有缺口，强制创建一个
            if (!hasGap) {
                // 优先在远离中心的位置创建缺口（避免破坏中心战斗区域）
                // 尝试在左侧或右侧边缘创建缺口
                const gapPositions = [];
                
                // 收集左侧可能的缺口位置（远离中心）
                for (let c = 0; c < centerCol - 2; c++) {
                    if (!grid[r][c]) {
                        gapPositions.push(c);
                    }
                }
                
                // 收集右侧可能的缺口位置
                for (let c = centerCol + 2; c < cols; c++) {
                    if (!grid[r][c]) {
                        gapPositions.push(c);
                    }
                }
                
                // 如果有单个空格，尝试在其旁边再创建一个
                if (gapPositions.length > 0) {
                    const pos = gapPositions[Math.floor(Math.random() * gapPositions.length)];
                    // 在相邻位置创建另一个空格
                    const neighbor = pos > 0 && !grid[r][pos - 1] ? pos + 1 : pos - 1;
                    if (neighbor >= 0 && neighbor < cols) {
                        grid[r][neighbor] = false;
                    }
                } else {
                    // 完全没有空格，强制在左侧边缘创建2个连续空格
                    const gapStart = Math.floor(Math.random() * Math.max(1, centerCol - 3));
                    grid[r][gapStart] = false;
                    if (gapStart + 1 < cols) {
                        grid[r][gapStart + 1] = false;
                    }
                }
                
                // 同步镜像行
                const mirroredRow = rows - 1 - r;
                for (let c = 0; c < cols; c++) {
                    grid[mirroredRow][cols - 1 - c] = grid[r][c];
                }
            }
        }
        
        // 同样确保每列也有一个通行缺口（防止完全垂直封锁）
        for (let c = 0; c < cols; c++) {
            let hasGap = false;
            let consecutiveEmpty = 0;
            
            for (let r = 0; r < rows; r++) {
                if (!grid[r][c]) {
                    consecutiveEmpty++;
                    if (consecutiveEmpty >= 2) {
                        hasGap = true;
                        break;
                    }
                } else {
                    consecutiveEmpty = 0;
                }
            }
            
            if (!hasGap) {
                // 强制创建垂直缺口
                const gapStart = Math.floor(Math.random() * Math.max(1, rows - 2));
                grid[gapStart][c] = false;
                if (gapStart + 1 < rows) {
                    grid[gapStart + 1][c] = false;
                }
            }
        }
        
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c]) {
                    const x = c * gridSize + 6;
                    const y = r * gridSize + 6;
                    const width = gridSize - 12;
                    const height = gridSize - 12;
                    
                    const exists = this.obstacles.some(obs => 
                        Math.abs(obs.x - x) < 15 && 
                        Math.abs(obs.y - y) < 15
                    );
                    
                    if (!exists) {
                        this.obstacles.push(new Obstacle(x, y, width, height));
                    }
                }
            }
        }
        
        const centerX = mapWidth / 2;
        const centerY = mapHeight / 2;
        const centerCheckRadius = 150;
        
        const hasCenterObstacle = this.obstacles.some(obs => {
            const obsCenterX = obs.x + obs.width / 2;
            const obsCenterY = obs.y + obs.height / 2;
            const distX = Math.abs(obsCenterX - centerX);
            const distY = Math.abs(obsCenterY - centerY);
            return distX < centerCheckRadius && distY < centerCheckRadius;
        });
        
        if (!hasCenterObstacle) {
            this.obstacles.push(new Obstacle(centerX - 44, centerY - 44, 88, 88));
        }
    }

    checkObstacleOverlap(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    render(ctx) {
        this.obstacles.forEach(obs => obs.render(ctx));
    }

    checkCollisions(player, prevX, prevY) {
        if (player.isDashing) return;
        for (const obs of this.obstacles) {
            if (obs.checkCollision(player)) {
                obs.resolveCollision(player, prevX, prevY);
            }
        }
    }

    damageFromBullet(bullet) {
        for (const obs of this.obstacles) {
            if (!obs.destroyed && bullet.checkCollision(obs)) {
                const damage = Math.ceil(obs.maxHealth * 0.1);
                const destroyed = obs.takeDamage(damage);
                return {
                    hit: true,
                    destroyed: destroyed,
                    x: bullet.x,
                    y: bullet.y,
                    obs: obs
                };
            }
        }
        return { hit: false };
    }

    damageFromMelee(attacker) {
        const attackRange = 50;
        const attackCenterX = attacker.x + attacker.width / 2 + attacker.direction.x * attackRange;
        const attackCenterY = attacker.y + attacker.height / 2 + attacker.direction.y * attackRange;
        
        for (const obs of this.obstacles) {
            if (!obs.destroyed) {
                const obsCenterX = obs.x + obs.width / 2;
                const obsCenterY = obs.y + obs.height / 2;
                
                const dist = Math.sqrt(
                    Math.pow(obsCenterX - attackCenterX, 2) + 
                    Math.pow(obsCenterY - attackCenterY, 2)
                );
                
                if (dist < attackRange + Math.max(obs.width, obs.height) / 2) {
                    const damage = Math.ceil(obs.maxHealth * 0.2);
                    const destroyed = obs.takeDamage(damage);
                    return {
                        hit: true,
                        destroyed: destroyed,
                        x: obsCenterX,
                        y: obsCenterY
                    };
                }
            }
        }
        return { hit: false };
    }
}
