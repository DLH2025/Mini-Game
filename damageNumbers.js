/**
 * Damage Numbers and Screen Shake System
 * Visual feedback for combat
 */
class DamageNumber {
    constructor(x, y, damage, isCritical = false, isHeal = false) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.isCritical = isCritical;
        this.isHeal = isHeal;
        this.life = 60; // frames
        this.maxLife = 60;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -2 - Math.random() * 2;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // gravity
        this.life--;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        const scale = 1 + (1 - alpha) * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        const text = this.isHeal ? `+${this.damage}` : `${this.damage}`;
        const fontSize = this.isCritical ? 24 : this.isHeal ? 18 : 16;
        const color = this.isHeal ? '#00ff88' : this.isCritical ? '#ff4444' : '#ffffff';
        const strokeColor = this.isCritical ? '#ff0000' : '#000000';

        ctx.font = `bold ${fontSize}px Courier New`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeText(text, 0, 0);
        ctx.fillStyle = color;
        ctx.fillText(text, 0, 0);

        if (this.isCritical) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 12px Courier New';
            ctx.fillText('CRIT!', 0, -fontSize - 5);
        }

        ctx.restore();
    }
}

class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.timer = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    shake(intensity, duration) {
        this.intensity = Math.max(this.intensity, intensity);
        this.duration = Math.max(this.duration, duration);
        this.timer = this.duration;
    }

    update() {
        if (this.timer > 0) {
            const progress = this.timer / this.duration;
            const currentIntensity = this.intensity * progress;
            
            this.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
            this.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
            
            this.timer--;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.intensity = 0;
            this.duration = 0;
        }
    }

    apply(ctx) {
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            ctx.translate(this.offsetX, this.offsetY);
        }
    }

    reset() {
        this.intensity = 0;
        this.duration = 0;
        this.timer = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }
}

class DamageNumberManager {
    constructor() {
        this.damageNumbers = [];
        this.pool = [];
        this.poolSize = 50;

        // Pre-populate pool
        for (let i = 0; i < this.poolSize; i++) {
            this.pool.push(new DamageNumber(0, 0, 0));
        }
    }

    spawn(x, y, damage, isCritical = false, isHeal = false) {
        let number;
        if (this.pool.length > 0) {
            number = this.pool.pop();
            number.x = x;
            number.y = y;
            number.damage = damage;
            number.isCritical = isCritical;
            number.isHeal = isHeal;
            number.life = 60;
            number.maxLife = 60;
            number.vx = (Math.random() - 0.5) * 2;
            number.vy = -2 - Math.random() * 2;
            number.active = true;
        } else {
            number = new DamageNumber(x, y, damage, isCritical, isHeal);
        }
        this.damageNumbers.push(number);
    }

    update() {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const number = this.damageNumbers[i];
            number.update();
            if (!number.active) {
                this.pool.push(number);
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    render(ctx) {
        this.damageNumbers.forEach(number => number.render(ctx));
    }

    clear() {
        this.damageNumbers.forEach(number => this.pool.push(number));
        this.damageNumbers = [];
    }
}

// Global instances
const damageNumberManager = new DamageNumberManager();
const screenShake = new ScreenShake();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DamageNumber, ScreenShake, DamageNumberManager, damageNumberManager, screenShake };
}
