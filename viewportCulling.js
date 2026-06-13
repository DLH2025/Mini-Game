/**
 * Viewport Culling System
 * Only renders entities visible on screen
 */
class ViewportCulling {
    constructor(margin = CONFIG.PERFORMANCE.CULLING_MARGIN) {
        this.margin = margin;
        this.visibleCount = 0;
        this.culledCount = 0;
    }

    isVisible(entity, cameraX, cameraY, viewWidth, viewHeight) {
        return entity.x + entity.width + this.margin >= cameraX &&
               entity.x - this.margin <= cameraX + viewWidth &&
               entity.y + entity.height + this.margin >= cameraY &&
               entity.y - this.margin <= cameraY + viewHeight;
    }

    // Filter array to only visible entities
    filterVisible(entities, cameraX, cameraY, viewWidth, viewHeight) {
        this.visibleCount = 0;
        this.culledCount = 0;
        
        return entities.filter(entity => {
            const visible = this.isVisible(entity, cameraX, cameraY, viewWidth, viewHeight);
            if (visible) {
                this.visibleCount++;
            } else {
                this.culledCount++;
            }
            return visible;
        });
    }

    // ForEach with culling (avoids array allocation)
    forEachVisible(entities, cameraX, cameraY, viewWidth, viewHeight, callback) {
        this.visibleCount = 0;
        this.culledCount = 0;
        
        for (const entity of entities) {
            if (this.isVisible(entity, cameraX, cameraY, viewWidth, viewHeight)) {
                this.visibleCount++;
                callback(entity);
            } else {
                this.culledCount++;
            }
        }
    }

    getStats() {
        return {
            visible: this.visibleCount,
            culled: this.culledCount,
            cullingRate: this.visibleCount + this.culledCount > 0 
                ? (this.culledCount / (this.visibleCount + this.culledCount) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

// Performance Monitor
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.frameTime = 16.67;
        this.avgFrameTime = 16.67;
        this.maxFrameTime = 0;
        this.minFrameTime = Infinity;
        
        // Object pool stats
        this.poolStats = {};
        
        // Spatial grid stats
        this.spatialStats = {};
        
        // Culling stats
        this.cullingStats = {};
        
        // Entity counts
        this.entityCounts = {
            bullets: 0,
            explosions: 0,
            enemies: 0,
            obstacles: 0
        };
        
        this.isVisible = false;
        this.debugElement = null;
    }

    startFrame() {
        this.frameStartTime = performance.now();
    }

    endFrame() {
        const now = performance.now();
        this.frameTime = now - this.frameStartTime;
        this.frameCount++;
        
        if (this.frameTime > this.maxFrameTime) this.maxFrameTime = this.frameTime;
        if (this.frameTime < this.minFrameTime) this.minFrameTime = this.frameTime;
        
        // Update FPS every second
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / (now - this.lastTime));
            this.avgFrameTime = (now - this.lastTime) / this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.maxFrameTime = 0;
            this.minFrameTime = Infinity;
            
            if (this.isVisible) {
                this.updateDisplay();
            }
        }
    }

    updatePoolStats(name, stats) {
        this.poolStats[name] = stats;
    }

    updateSpatialStats(stats) {
        this.spatialStats = stats;
    }

    updateCullingStats(stats) {
        this.cullingStats = stats;
    }

    updateEntityCounts(counts) {
        this.entityCounts = { ...this.entityCounts, ...counts };
    }

    createDebugOverlay() {
        if (this.debugElement) return;
        
        this.debugElement = document.createElement('div');
        this.debugElement.id = 'performanceDebug';
        this.debugElement.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            padding: 10px;
            border-radius: 4px;
            z-index: 10000;
            pointer-events: none;
            line-height: 1.5;
            min-width: 200px;
        `;
        document.body.appendChild(this.debugElement);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.createDebugOverlay();
            this.debugElement.style.display = 'block';
        } else if (this.debugElement) {
            this.debugElement.style.display = 'none';
        }
    }

    updateDisplay() {
        if (!this.debugElement || !this.isVisible) return;
        
        const fpsColor = this.fps >= 55 ? '#00ff00' : this.fps >= 30 ? '#ffff00' : '#ff0000';
        const frameTimeColor = this.avgFrameTime < 20 ? '#00ff00' : this.avgFrameTime < 35 ? '#ffff00' : '#ff0000';
        
        let html = `
            <div style="color: ${fpsColor}">FPS: ${this.fps}</div>
            <div style="color: ${frameTimeColor}">Frame: ${this.avgFrameTime.toFixed(2)}ms</div>
            <div>Entities: B=${this.entityCounts.bullets} E=${this.entityCounts.explosions} N=${this.entityCounts.enemies}</div>
        `;
        
        // Pool stats
        Object.entries(this.poolStats).forEach(([name, stats]) => {
            html += `<div>${name}: ${stats.activeCount}/${stats.poolSize + stats.activeCount} (${stats.reuseRate})</div>`;
        });
        
        // Spatial grid stats
        if (this.spatialStats.cellCount) {
            html += `<div>Grid: ${this.spatialStats.cellCount} cells, ${this.spatialStats.totalEntities} entities</div>`;
        }
        
        // Culling stats
        if (this.cullingStats.culled !== undefined) {
            html += `<div>Culling: ${this.cullingStats.culled} culled (${this.cullingStats.cullingRate})</div>`;
        }
        
        this.debugElement.innerHTML = html;
    }

    destroy() {
        if (this.debugElement) {
            this.debugElement.remove();
            this.debugElement = null;
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ViewportCulling, PerformanceMonitor };
}
