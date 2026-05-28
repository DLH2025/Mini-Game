class Bullet {
    constructor(x, y, direction, damage, owner, colorConfig) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.speed = 8;
        this.direction = direction;
        this.damage = damage;
        this.owner = owner;
        this.colorConfig = colorConfig;
        this.active = true;
        this.animFrame = 0;
    }

    update() {
        this.x += this.speed * this.direction.x;
        this.y += this.speed * this.direction.y;
        this.animFrame++;
        
        if (this.x < -20 || this.x > 1420 || this.y < -20 || this.y > 920) {
            this.active = false;
        }
    }

    render(ctx, isDayMode = false) {
        ctx.save();
        
        const glowColor = this.colorConfig.light;
        const mainColor = this.colorConfig.medium;
        
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = mainColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.fillStyle = glowColor;
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, this.height - 4);
        
        ctx.restore();
    }

    checkCollision(target) {
        return this.x < target.x + target.width &&
               this.x + this.width > target.x &&
               this.y < target.y + target.height &&
               this.y + this.height > target.y;
    }
}

class Explosion {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.life = 20;
        this.maxLife = 20;
        this.color = color;
        this.particles = [];
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                size: 6
            });
        }
    }

    update() {
        this.life--;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.size *= 0.9;
        });
    }

    render(ctx, isDayMode = false) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        
        let renderColor = this.color;
        if (isDayMode) {
            if (this.color === '#e94560') renderColor = '#f05050';
            if (this.color === '#ff6b8a') renderColor = '#ff7070';
            if (this.color === '#4a9eff') renderColor = '#5090f0';
            if (this.color === '#7ac4ff') renderColor = '#70b0ff';
            if (this.color === '#888888') renderColor = '#999999';
        }
        
        ctx.fillStyle = renderColor;
        this.particles.forEach(p => {
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
        
        ctx.restore();
    }

    get dead() {
        return this.life <= 0;
    }
}
