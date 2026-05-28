    // 处理AI玩家的攻击 - 简化且直接的版本
    processAIAttacks() {
        if (!this.players[1] || !this.players[1].isAI) return;
        
        const ai = this.players[1];
        const player = this.players[0];
        
        // 检查AI是否想射击
        if (ai.wantsToShoot) {
            const attack = ai.wantsToShoot;
            this.bullets.push(new Bullet(attack.x, attack.y, attack.direction, attack.damage, attack.owner, ai.colorConfig));
            ai.wantsToShoot = null;
        }
        
        // 检查AI是否想治疗
        if (ai.wantsToHeal) {
            this.createHealingEffect(ai);
            ai.wantsToHeal = false;
        }
        
        // 检查AI是否想冲刺
        if (ai.wantsToDash) {
            this.createDashEffect(ai);
            ai.wantsToDash = false;
        }
        
        // 检查AI是否想爆发
        if (ai.wantsToBlast) {
            const blast = ai.wantsToBlast;
            this.createBlastEffect(ai);
            this.processBlast(blast, player, ai);
            ai.wantsToBlast = null;
        }
    }
