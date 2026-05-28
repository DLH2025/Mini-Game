    update() {
        if (this.gameState !== 'playing') {
            if (this.gameState === 'victory') {
                this.render();
            }
            return;
        }
        
        // 更新玩家
        this.players.forEach(player => {
            const prevX = player.x;
            const prevY = player.y;
            
            // 如果是AI玩家，更新AI决策
            if (this.gameMode === 'single' && player.id === 2) {
                player.setBullets(this.bullets);
                player.setObstacles(this.obstacleManager.obstacles);
                player.updateAI(); // 先调用updateAI更新决策
                player.update(); // 再调用update进行移动
            } else {
                // 人类玩家
                player.update(this.keys);
            }
            
            this.obstacleManager.checkCollisions(player, prevX, prevY);
        });
        
        // 处理AI玩家的攻击
        if (this.gameMode === 'single') {
            this.processAIAttacks();
        }
        
        if (this.players[0].checkMeleeHit(this.players[1])) {
            this.players[1].takeDamage(this.players[0].meleeDamage);
            this.createExplosion(this.players[1].x + this.players[1].width/2, this.players[1].y + this.players[1].height/2, this.players[0].colorConfig.medium);
        }
        
        if (this.players[1].checkMeleeHit(this.players[0])) {
            this.players[0].takeDamage(this.players[1].meleeDamage);
            this.createExplosion(this.players[0].x + this.players[0].width/2, this.players[0].y + this.players[0].height/2, this.players[1].colorConfig.medium);
        }
        
        if (this.players[0].isMeleeAttacking) {
            const meleeResult1 = this.obstacleManager.damageFromMelee(this.players[0]);
            if (meleeResult1.hit) {
                this.createExplosion(meleeResult1.x, meleeResult1.y, '#888888');
            }
        }
        
        if (this.players[1].isMeleeAttacking) {
            const meleeResult2 = this.obstacleManager.damageFromMelee(this.players[1]);
            if (meleeResult2.hit) {
                this.createExplosion(meleeResult2.x, meleeResult2.y, '#888888');
            }
        }
        
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            
            const obsResult = this.obstacleManager.damageFromBullet(bullet);
            if (obsResult.hit) {
                if (obsResult.destroyed) {
                    this.createExplosion(obsResult.x, obsResult.y, '#ffaa00');
                } else {
                    this.createExplosion(bullet.x, bullet.y, '#888888');
                }
                return false;
            }
            
            if (bullet.owner === 1 && bullet.checkCollision(this.players[1])) {
                this.players[1].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[0].colorConfig.medium);
                return false;
            }
            
            if (bullet.owner === 2 && bullet.checkCollision(this.players[0])) {
                this.players[0].takeDamage(bullet.damage);
                this.createExplosion(bullet.x, bullet.y, this.players[1].colorConfig.medium);
                return false;
            }
            
            return bullet.active;
        });
        
        this.explosions = this.explosions.filter(exp => {
            exp.update();
            return !exp.dead;
        });
        
        this.obstacleManager.obstacles.forEach(obs => {
            if (obs.destroyed) {
                obs.updateDebris();
            }
        });
        
        this.checkGameOver();
        this.updateUI();
    }
