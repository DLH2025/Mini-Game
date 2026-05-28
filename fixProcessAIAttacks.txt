    // 处理AI玩家的攻击 - 超简化版本
    processAIAttacks() {
        if (!this.players[1] || !this.players[1].isAI) return;
        
        const ai = this.players[1];
        
        // 检查AI是否需要射击
        if (ai.needsToShoot) {
            const attack = ai.rangedAttack();
            if (attack) {
                this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, ai.colorConfig));
            }
            ai.needsToShoot = false;
        }
    }
