/**
 * Spatial Partitioning System (Uniform Grid)
 * Optimizes collision detection by dividing space into cells
 */

class SpatialGrid {
    constructor(cellSize = CONFIG.SPATIAL.CELL_SIZE) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this.entities = new Map();
    }

    clear() {
        this.cells.clear();
        this.entities.clear();
    }

    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    insert(entity) {
        if (!entity || entity.x === undefined || entity.y === undefined) return;

        const key = this.getCellKey(entity.x, entity.y);
        
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        
        this.cells.get(key).push(entity);
        this.entities.set(entity, key);
    }

    remove(entity) {
        const key = this.entities.get(entity);
        if (key && this.cells.has(key)) {
            const cell = this.cells.get(key);
            const index = cell.indexOf(entity);
            if (index !== -1) {
                cell.splice(index, 1);
                if (cell.length === 0) {
                    this.cells.delete(key);
                }
            }
        }
        this.entities.delete(entity);
    }

    update(entity) {
        this.remove(entity);
        this.insert(entity);
    }

    // Get all entities in cells that could potentially collide with the given entity
    queryNearby(entity, radius = 0) {
        const nearby = [];
        const minX = Math.floor((entity.x - radius) / this.cellSize);
        const maxX = Math.floor((entity.x + entity.width + radius) / this.cellSize);
        const minY = Math.floor((entity.y - radius) / this.cellSize);
        const maxY = Math.floor((entity.y + entity.height + radius) / this.cellSize);

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                if (this.cells.has(key)) {
                    nearby.push(...this.cells.get(key));
                }
            }
        }

        return nearby;
    }

    // Query entities in a rectangular area
    queryRect(x, y, width, height) {
        const nearby = [];
        const minX = Math.floor(x / this.cellSize);
        const maxX = Math.floor((x + width) / this.cellSize);
        const minY = Math.floor(y / this.cellSize);
        const maxY = Math.floor((y + height) / this.cellSize);

        for (let cx = minX; cx <= maxX; cx++) {
            for (let cy = minY; cy <= maxY; cy++) {
                const key = `${cx},${cy}`;
                if (this.cells.has(key)) {
                    nearby.push(...this.cells.get(key));
                }
            }
        }

        return nearby;
    }

    // Query entities in a circular area
    queryCircle(cx, cy, radius) {
        const nearby = [];
        const minX = Math.floor((cx - radius) / this.cellSize);
        const maxX = Math.floor((cx + radius) / this.cellSize);
        const minY = Math.floor((cy - radius) / this.cellSize);
        const maxY = Math.floor((cy + radius) / this.cellSize);

        const radiusSq = radius * radius;

        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                if (this.cells.has(key)) {
                    for (const entity of this.cells.get(key)) {
                        const dx = (entity.x + entity.width / 2) - cx;
                        const dy = (entity.y + entity.height / 2) - cy;
                        if (dx * dx + dy * dy <= radiusSq) {
                            nearby.push(entity);
                        }
                    }
                }
            }
        }

        return nearby;
    }

    getStats() {
        let totalEntities = 0;
        let maxPerCell = 0;
        
        this.cells.forEach(cell => {
            totalEntities += cell.length;
            maxPerCell = Math.max(maxPerCell, cell.length);
        });

        return {
            cellCount: this.cells.size,
            totalEntities,
            maxPerCell,
            averagePerCell: this.cells.size > 0 ? (totalEntities / this.cells.size).toFixed(2) : 0
        };
    }
}

// Collision detection utilities
const CollisionUtils = {
    // AABB collision check
    rectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },

    // Circle collision check
    circleCollision(a, b, radiusA, radiusB) {
        const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
        const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
        const distSq = dx * dx + dy * dy;
        const radiusSum = radiusA + radiusB;
        return distSq <= radiusSum * radiusSum;
    },

    // Point in rectangle
    pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.width &&
               py >= rect.y && py <= rect.y + rect.height;
    },

    // Line-rectangle intersection (for line of sight)
    lineIntersectsRect(x1, y1, x2, y2, rect) {
        const left = rect.x;
        const right = rect.x + rect.width;
        const top = rect.y;
        const bottom = rect.y + rect.height;

        if ((x1 < left && x2 < left) || (x1 > right && x2 > right) ||
            (y1 < top && y2 < top) || (y1 > bottom && y2 > bottom)) {
            return false;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;

        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
            return this.pointInRect(x1, y1, rect);
        }

        const t1 = dx !== 0 ? (left - x1) / dx : -Infinity;
        const t2 = dx !== 0 ? (right - x1) / dx : Infinity;
        const t3 = dy !== 0 ? (top - y1) / dy : -Infinity;
        const t4 = dy !== 0 ? (bottom - y1) / dy : Infinity;

        const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

        return tmax >= 0 && tmin <= 1 && tmin <= tmax;
    },

    // Distance squared (faster than distance when comparing)
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpatialGrid, CollisionUtils };
}
