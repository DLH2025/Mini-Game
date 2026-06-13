/**
 * Enemy Renderer - Fine-tuned enemy visual models
 * Provides detailed rendering for different enemy types with animations and effects
 */
class EnemyRenderer {
    constructor() {
        // Enemy type render configurations
        this.renderConfigs = {
            basic: {
                bodyShape: 'rect',
                hasWeapon: false,
                glowIntensity: 0.3,
                detailLevel: 1
            },
            ranged: {
                bodyShape: 'rect',
                hasWeapon: true,
                weaponType: 'gun',
                glowIntensity: 0.5,
                detailLevel: 2
            },
            tank: {
                bodyShape: 'round',
                hasWeapon: false,
                glowIntensity: 0.4,
                detailLevel: 2,
                armorPlates: true
            },
            fast: {
                bodyShape: 'triangular',
                hasWeapon: false,
                glowIntensity: 0.6,
                detailLevel: 1,
                trailEffect: true
            },
            elite: {
                bodyShape: 'rect',
                hasWeapon: true,
                weaponType: 'rifle',
                glowIntensity: 0.8,
                detailLevel: 3,
                auraEffect: true
            },
            boss: {
                bodyShape: 'round',
                hasWeapon: true,
                weaponType: 'cannon',
                glowIntensity: 1.0,
                detailLevel: 3,
                auraEffect: true,
                armorPlates: true
            }
        };
    }

    render(ctx, enemy, isDayMode = false) {
        const config = this.renderConfigs[enemy.enemyType] || this.renderConfigs.basic;
        const colorConfig = enemy.colorConfig || { light: '#ff6b6b', medium: '#ee5a5a', dark: '#cc4444' };
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        
        ctx.save();
        
        // Apply glow effect
        if (config.glowIntensity > 0) {
            ctx.shadowColor = colorConfig.medium;
            ctx.shadowBlur = 10 * config.glowIntensity;
        }
        
        // Draw trail effect for fast enemies
        if (config.trailEffect && enemy.vx !== 0 && enemy.vy !== 0) {
            this.drawTrail(ctx, enemy, colorConfig);
        }
        
        // Draw aura for elite/boss
        if (config.auraEffect) {
            this.drawAura(ctx, centerX, centerY, enemy.width, colorConfig);
        }
        
        // Draw body based on shape
        switch (config.bodyShape) {
            case 'round':
                this.drawRoundBody(ctx, enemy, colorConfig, config);
                break;
            case 'triangular':
                this.drawTriangularBody(ctx, enemy, colorConfig, config);
                break;
            default:
                this.drawRectBody(ctx, enemy, colorConfig, config);
        }
        
        // Draw weapon
        if (config.hasWeapon) {
            this.drawWeapon(ctx, enemy, colorConfig, config);
        }
        
        // Draw armor plates
        if (config.armorPlates) {
            this.drawArmorPlates(ctx, enemy, colorConfig);
        }
        
        // Draw eyes (all enemies have eyes)
        this.drawEyes(ctx, enemy, colorConfig, isDayMode);
        
        // Draw health bar
        this.drawHealthBar(ctx, enemy);
        
        // Draw direction indicator
        this.drawDirectionIndicator(ctx, enemy, colorConfig);
        
        ctx.restore();
    }

    drawRectBody(ctx, enemy, colorConfig, config) {
        const w = enemy.width;
        const h = enemy.height;
        
        // Main body
        ctx.fillStyle = colorConfig.medium;
        ctx.fillRect(enemy.x, enemy.y, w, h);
        
        // Highlight
        ctx.fillStyle = colorConfig.light;
        ctx.fillRect(enemy.x + 2, enemy.y + 2, w - 4, h * 0.3);
        
        // Shadow
        ctx.fillStyle = colorConfig.dark;
        ctx.fillRect(enemy.x + 2, enemy.y + h * 0.7, w - 4, h * 0.3 - 2);
        
        // Border
        ctx.strokeStyle = colorConfig.dark;
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x, enemy.y, w, h);
    }

    drawRoundBody(ctx, enemy, colorConfig, config) {
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const radius = Math.min(enemy.width, enemy.height) / 2;
        
        // Main body
        ctx.fillStyle = colorConfig.medium;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = colorConfig.light;
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = colorConfig.dark;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawTriangularBody(ctx, enemy, colorConfig, config) {
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const w = enemy.width;
        const h = enemy.height;
        
        // Triangle pointing in direction
        const dirX = enemy.direction.x || 1;
        const dirY = enemy.direction.y || 0;
        
        ctx.fillStyle = colorConfig.medium;
        ctx.beginPath();
        
        if (Math.abs(dirX) > Math.abs(dirY)) {
            // Horizontal
            if (dirX > 0) {
                ctx.moveTo(enemy.x + w, centerY);
                ctx.lineTo(enemy.x, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + h);
            } else {
                ctx.moveTo(enemy.x, centerY);
                ctx.lineTo(enemy.x + w, enemy.y);
                ctx.lineTo(enemy.x + w, enemy.y + h);
            }
        } else {
            // Vertical
            if (dirY > 0) {
                ctx.moveTo(centerX, enemy.y + h);
                ctx.lineTo(enemy.x, enemy.y);
                ctx.lineTo(enemy.x + w, enemy.y);
            } else {
                ctx.moveTo(centerX, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + h);
                ctx.lineTo(enemy.x + w, enemy.y + h);
            }
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = colorConfig.light;
        ctx.beginPath();
        ctx.arc(centerX, centerY, w * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = colorConfig.dark;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawWeapon(ctx, enemy, colorConfig, config) {
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const dirX = enemy.direction.x || 1;
        const dirY = enemy.direction.y || 0;
        
        const weaponLength = enemy.width * 0.6;
        const weaponWidth = enemy.height * 0.15;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.atan2(dirY, dirX));
        
        // Weapon body
        ctx.fillStyle = '#555';
        ctx.fillRect(0, -weaponWidth / 2, weaponLength, weaponWidth);
        
        // Weapon detail based on type
        if (config.weaponType === 'gun') {
            ctx.fillStyle = '#777';
            ctx.fillRect(weaponLength * 0.3, -weaponWidth * 0.8, weaponLength * 0.4, weaponWidth * 0.3);
        } else if (config.weaponType === 'rifle') {
            ctx.fillStyle = '#777';
            ctx.fillRect(weaponLength * 0.2, -weaponWidth * 0.8, weaponLength * 0.6, weaponWidth * 0.3);
            // Scope
            ctx.fillStyle = '#333';
            ctx.fillRect(weaponLength * 0.5, -weaponWidth * 1.2, weaponLength * 0.15, weaponWidth * 0.4);
        } else if (config.weaponType === 'cannon') {
            ctx.fillStyle = '#666';
            ctx.fillRect(weaponLength * 0.2, -weaponWidth * 1.5, weaponLength * 0.8, weaponWidth * 3);
            ctx.fillStyle = '#444';
            ctx.fillRect(weaponLength * 0.5, -weaponWidth * 1.2, weaponLength * 0.3, weaponWidth * 2.4);
        }
        
        ctx.restore();
    }

    drawArmorPlates(ctx, enemy, colorConfig) {
        const w = enemy.width;
        const h = enemy.height;
        
        ctx.fillStyle = colorConfig.dark;
        
        // Shoulder pads
        ctx.fillRect(enemy.x - 2, enemy.y, 6, 8);
        ctx.fillRect(enemy.x + w - 4, enemy.y, 6, 8);
        
        // Chest plate
        ctx.fillRect(enemy.x + w * 0.2, enemy.y + h * 0.2, w * 0.6, h * 0.3);
        
        // Knee pads
        ctx.fillRect(enemy.x, enemy.y + h - 6, 8, 6);
        ctx.fillRect(enemy.x + w - 8, enemy.y + h - 6, 8, 6);
    }

    drawEyes(ctx, enemy, colorConfig, isDayMode) {
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const eyeColor = isDayMode ? '#fff' : '#ff4444';
        
        // Eye glow
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 5;
        
        // Left eye
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(centerX - enemy.width * 0.15, centerY - enemy.height * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.arc(centerX + enemy.width * 0.15, centerY - enemy.height * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
    }

    drawHealthBar(ctx, enemy) {
        if (enemy.health >= enemy.maxHealth) return;
        
        const healthPercent = enemy.health / enemy.maxHealth;
        const barWidth = enemy.width;
        const barHeight = 4;
        const barY = enemy.y - 10;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(enemy.x, barY, barWidth, barHeight);
        
        // Health
        const healthColor = healthPercent > 0.5 ? '#00ff88' : healthPercent > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillStyle = healthColor;
        ctx.fillRect(enemy.x, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(enemy.x, barY, barWidth, barHeight);
    }

    drawDirectionIndicator(ctx, enemy, colorConfig) {
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const dirX = enemy.direction.x || 1;
        const dirY = enemy.direction.y || 0;
        
        ctx.fillStyle = colorConfig.light;
        ctx.beginPath();
        ctx.arc(centerX + dirX * enemy.width * 0.4, centerY + dirY * enemy.height * 0.4, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTrail(ctx, enemy, colorConfig) {
        const trailLength = 5;
        const alpha = 0.3;
        
        for (let i = 1; i <= trailLength; i++) {
            ctx.fillStyle = colorConfig.medium;
            ctx.globalAlpha = alpha * (1 - i / trailLength);
            ctx.fillRect(
                enemy.x - enemy.vx * i * 0.5,
                enemy.y - enemy.vy * i * 0.5,
                enemy.width,
                enemy.height
            );
        }
        ctx.globalAlpha = 1;
    }

    drawAura(ctx, centerX, centerY, size, colorConfig) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.2 + 0.8;
        
        ctx.fillStyle = colorConfig.medium;
        ctx.globalAlpha = 0.2 * pulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 0.1 * pulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
}

// Global renderer instance
const enemyRenderer = new EnemyRenderer();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnemyRenderer, enemyRenderer };
}
