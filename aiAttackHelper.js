    // 处理AI玩家的攻击 - 简化版本
    processAIAttacks() {
        if (!this.players[1] || !this.players[1].isAI) return;
        
        const ai = this.players[1];
        
        // 检查是否要射击
        if (ai.wantsToShoot) {
            const attack = ai.wantsToShoot;
            this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, ai.colorConfig));
            ai.wantsToShoot = null;
        }
        
        // 检查是否要治疗
        if (ai.wantsToHeal) {
            this.createHealingEffect(ai);
            ai.wantsToHeal = false;
        }
        
        // 检查是否要冲刺
        if (ai.wantsToDash) {
            this.createDashEffect(ai);
            ai.wantsToDash = false;
        }
        
        // 检查是否要爆发
        if (ai.wantsToBlast) {
            const blast = ai.wantsToBlast;
            this.createBlastEffect(ai);
            this.processBlast(blast, this.players[0], ai);
            ai.wantsToBlast = null;
        }
    }
