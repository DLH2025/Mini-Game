/**
 * Pathfinding System - Optimized for grid-based obstacle avoidance
 * Provides waypoint-based pathfinding with obstacle detection and smoothing
 */
class Pathfinder {
    constructor(cellSize = 50) {
        this.cellSize = cellSize;
        this.pathCache = new Map();
        this.cacheTimeout = 500; // 缓存500ms
        this.maxCacheSize = 100;
    }

    // 将世界坐标转换为网格坐标
    worldToGrid(x, y) {
        return {
            x: Math.floor(x / this.cellSize),
            y: Math.floor(y / this.cellSize)
        };
    }

    // 将网格坐标转换为世界坐标（中心点）
    gridToWorld(gx, gy) {
        return {
            x: gx * this.cellSize + this.cellSize / 2,
            y: gy * this.cellSize + this.cellSize / 2
        };
    }

    // 检查网格是否被障碍物阻挡
    isBlocked(gx, gy, obstacles, entityWidth, entityHeight) {
        const worldPos = this.gridToWorld(gx, gy);
        const testRect = {
            x: worldPos.x - entityWidth / 2,
            y: worldPos.y - entityHeight / 2,
            width: entityWidth,
            height: entityHeight
        };

        for (const obs of obstacles) {
            if (obs.destroyed) continue;
            if (this.rectCollision(testRect, obs)) {
                return true;
            }
        }
        return false;
    }

    rectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    // 简单的A*寻路（简化版，适用于短距离）
    findPath(startX, startY, endX, endY, obstacles, entityWidth, entityHeight, mapWidth, mapHeight) {
        const start = this.worldToGrid(startX, startY);
        const end = this.worldToGrid(endX, endY);

        // 如果起点和终点相同，直接返回
        if (start.x === end.x && start.y === end.y) {
            return [{ x: endX, y: endY }];
        }

        // 检查缓存
        const cacheKey = `${start.x},${start.y}-${end.x},${end.y}`;
        const cached = this.pathCache.get(cacheKey);
        if (cached && Date.now() - cached.time < this.cacheTimeout) {
            return cached.path;
        }

        // 使用BFS寻找路径（A*的简化版，适合小地图）
        const path = this.bfs(start, end, obstacles, entityWidth, entityHeight, mapWidth, mapHeight);

        // 缓存结果
        if (path && this.pathCache.size < this.maxCacheSize) {
            this.pathCache.set(cacheKey, { path, time: Date.now() });
        }

        return path;
    }

    bfs(start, end, obstacles, entityWidth, entityHeight, mapWidth, mapHeight) {
        const maxGridX = Math.ceil(mapWidth / this.cellSize);
        const maxGridY = Math.ceil(mapHeight / this.cellSize);

        const queue = [{ x: start.x, y: start.y, path: [] }];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        const directions = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: -1, y: -1 }, { x: 1, y: -1 },
            { x: -1, y: 1 }, { x: 1, y: 1 }
        ];

        let iterations = 0;
        const maxIterations = 200; // 限制搜索步数，保证性能

        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const current = queue.shift();

            // 到达终点
            if (Math.abs(current.x - end.x) <= 1 && Math.abs(current.y - end.y) <= 1) {
                const path = [...current.path, { x: endX, y: endY }];
                return this.smoothPath(path);
            }

            for (const dir of directions) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const key = `${nx},${ny}`;

                if (nx < 0 || nx >= maxGridX || ny < 0 || ny >= maxGridY) continue;
                if (visited.has(key)) continue;
                if (this.isBlocked(nx, ny, obstacles, entityWidth, entityHeight)) continue;

                visited.add(key);
                const worldPos = this.gridToWorld(nx, ny);
                queue.push({
                    x: nx,
                    y: ny,
                    path: [...current.path, { x: worldPos.x, y: worldPos.y }]
                });
            }
        }

        // 如果没找到完整路径，返回直线路径（让碰撞系统处理）
        return null;
    }

    // 路径平滑 - 移除不必要的中间点
    smoothPath(path) {
        if (path.length <= 2) return path;

        const smoothed = [path[0]];
        let i = 0;

        while (i < path.length - 1) {
            let furthest = i + 1;
            // 尝试找到最远的可以直接到达的点
            for (let j = path.length - 1; j > i + 1; j--) {
                if (this.canWalkDirectly(path[i], path[j])) {
                    furthest = j;
                    break;
                }
            }
            smoothed.push(path[furthest]);
            i = furthest;
        }

        return smoothed;
    }

    // 检查两点之间是否可以直线行走（简化版）
    canWalkDirectly(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.cellSize * 2; // 简化：短距离认为可以直接走
    }

    // 清理过期缓存
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.pathCache) {
            if (now - value.time > this.cacheTimeout) {
                this.pathCache.delete(key);
            }
        }
    }

    // 获取移动方向，考虑障碍物绕行
    getMoveDirection(entity, targetX, targetY, obstacles, mapWidth, mapHeight) {
        // 1. 首先尝试直接走向目标
        const dx = targetX - entity.x;
        const dy = targetY - entity.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return { x: 0, y: 0 };

        const directDir = { x: dx / dist, y: dy / dist };

        // 2. 预测下一步是否会撞墙
        const nextX = entity.x + directDir.x * entity.speed * 2;
        const nextY = entity.y + directDir.y * entity.speed * 2;

        if (!this.willCollide(nextX, nextY, entity.width, entity.height, obstacles)) {
            return directDir;
        }

        // 3. 需要绕行 - 使用寻路或简单的绕行算法
        return this.findDetourDirection(entity, targetX, targetY, obstacles, directDir);
    }

    // 简单的绕行方向计算
    findDetourDirection(entity, targetX, targetY, obstacles, originalDir) {
        // 尝试多个角度偏移
        const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI * 3 / 4, -Math.PI * 3 / 4];
        
        for (const angle of angles) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // 旋转方向向量
            const newDirX = originalDir.x * cos - originalDir.y * sin;
            const newDirY = originalDir.x * sin + originalDir.y * cos;
            
            // 检查新方向是否可行
            const testX = entity.x + newDirX * entity.speed * 3;
            const testY = entity.y + newDirY * entity.speed * 3;
            
            if (!this.willCollide(testX, testY, entity.width, entity.height, obstacles)) {
                return { x: newDirX, y: newDirY };
            }
        }

        // 如果都不行，尝试沿墙滑动
        return this.slideAlongWall(entity, obstacles, originalDir);
    }

    // 沿墙滑动
    slideAlongWall(entity, obstacles, originalDir) {
        // 尝试只沿X轴或Y轴移动
        const testX = entity.x + originalDir.x * entity.speed * 2;
        const testY = entity.y + originalDir.y * entity.speed * 2;

        const collideX = this.willCollide(testX, entity.y, entity.width, entity.height, obstacles);
        const collideY = this.willCollide(entity.x, testY, entity.width, entity.height, obstacles);

        if (!collideX && collideY) {
            return { x: originalDir.x, y: 0 };
        } else if (collideX && !collideY) {
            return { x: 0, y: originalDir.y };
        } else if (!collideX && !collideY) {
            return { x: originalDir.x * 0.7, y: originalDir.y * 0.7 };
        }

        // 都撞了，尝试反向
        return { x: -originalDir.x * 0.5, y: -originalDir.y * 0.5 };
    }

    // 检查指定位置是否会碰撞
    willCollide(x, y, width, height, obstacles) {
        const testRect = { x, y, width, height };
        for (const obs of obstacles) {
            if (obs.destroyed) continue;
            if (this.rectCollision(testRect, obs)) {
                return true;
            }
        }
        return false;
    }
}

// 全局路径查找器实例
const pathfinder = new Pathfinder(50);

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Pathfinder, pathfinder };
}
