/**
 * Flocking Behavior System (Boids Algorithm)
 * Provides group movement behaviors for enemies
 */
class FlockingBehavior {
    constructor(separationRadius = 50, alignmentRadius = 100, cohesionRadius = 100) {
        this.separationRadius = separationRadius;
        this.alignmentRadius = alignmentRadius;
        this.cohesionRadius = cohesionRadius;
        
        // Weights for each behavior
        this.separationWeight = 1.5;
        this.alignmentWeight = 1.0;
        this.cohesionWeight = 1.0;
        this.targetWeight = 2.0;
        this.obstacleAvoidWeight = 3.0;
    }

    // Calculate flocking forces for an entity
    calculateForces(entity, neighbors, target, obstacles) {
        const separation = this.separation(entity, neighbors);
        const alignment = this.alignment(entity, neighbors);
        const cohesion = this.cohesion(entity, neighbors);
        const targetForce = this.seekTarget(entity, target);
        const obstacleAvoid = this.avoidObstacles(entity, obstacles);

        return {
            x: separation.x * this.separationWeight +
               alignment.x * this.alignmentWeight +
               cohesion.x * this.cohesionWeight +
               targetForce.x * this.targetWeight +
               obstacleAvoid.x * this.obstacleAvoidWeight,
            y: separation.y * this.separationWeight +
               alignment.y * this.alignmentWeight +
               cohesion.y * this.cohesionWeight +
               targetForce.y * this.targetWeight +
               obstacleAvoid.y * this.obstacleAvoidWeight
        };
    }

    // Separation: avoid crowding neighbors
    separation(entity, neighbors) {
        let steerX = 0;
        let steerY = 0;
        let count = 0;

        const entityCenterX = entity.x + entity.width / 2;
        const entityCenterY = entity.y + entity.height / 2;

        for (const neighbor of neighbors) {
            if (neighbor === entity) continue;
            if (neighbor.health <= 0) continue;

            const neighborCenterX = neighbor.x + neighbor.width / 2;
            const neighborCenterY = neighbor.y + neighbor.height / 2;

            const dx = entityCenterX - neighborCenterX;
            const dy = entityCenterY - neighborCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.separationRadius) {
                // Normalize and weight by distance
                const force = 1.0 - (dist / this.separationRadius);
                steerX += (dx / dist) * force;
                steerY += (dy / dist) * force;
                count++;
            }
        }

        if (count > 0) {
            steerX /= count;
            steerY /= count;
        }

        return { x: steerX, y: steerY };
    }

    // Alignment: steer towards average heading of neighbors
    alignment(entity, neighbors) {
        let avgVx = 0;
        let avgVy = 0;
        let count = 0;

        for (const neighbor of neighbors) {
            if (neighbor === entity) continue;
            if (neighbor.health <= 0) continue;

            const neighborCenterX = neighbor.x + neighbor.width / 2;
            const neighborCenterY = neighbor.y + neighbor.height / 2;
            const entityCenterX = entity.x + entity.width / 2;
            const entityCenterY = entity.y + entity.height / 2;

            const dx = neighborCenterX - entityCenterX;
            const dy = neighborCenterY - entityCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.alignmentRadius) {
                // Use neighbor's velocity if available, otherwise use direction
                const vx = neighbor.vx || neighbor.direction?.x * neighbor.speed || 0;
                const vy = neighbor.vy || neighbor.direction?.y * neighbor.speed || 0;
                avgVx += vx;
                avgVy += vy;
                count++;
            }
        }

        if (count > 0) {
            avgVx /= count;
            avgVy /= count;
            
            // Normalize
            const mag = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
            if (mag > 0) {
                avgVx /= mag;
                avgVy /= mag;
            }
        }

        return { x: avgVx, y: avgVy };
    }

    // Cohesion: steer towards center of neighbors
    cohesion(entity, neighbors) {
        let centerX = 0;
        let centerY = 0;
        let count = 0;

        for (const neighbor of neighbors) {
            if (neighbor === entity) continue;
            if (neighbor.health <= 0) continue;

            const neighborCenterX = neighbor.x + neighbor.width / 2;
            const neighborCenterY = neighbor.y + neighbor.height / 2;
            const entityCenterX = entity.x + entity.width / 2;
            const entityCenterY = entity.y + entity.height / 2;

            const dx = neighborCenterX - entityCenterX;
            const dy = neighborCenterY - entityCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0 && dist < this.cohesionRadius) {
                centerX += neighborCenterX;
                centerY += neighborCenterY;
                count++;
            }
        }

        if (count > 0) {
            centerX /= count;
            centerY /= count;
            
            // Steer towards center
            const entityCenterX = entity.x + entity.width / 2;
            const entityCenterY = entity.y + entity.height / 2;
            const dx = centerX - entityCenterX;
            const dy = centerY - entityCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                return { x: dx / dist, y: dy / dist };
            }
        }

        return { x: 0, y: 0 };
    }

    // Seek target (player or core)
    seekTarget(entity, target) {
        if (!target || target.health <= 0) return { x: 0, y: 0 };

        const entityCenterX = entity.x + entity.width / 2;
        const entityCenterY = entity.y + entity.height / 2;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;

        const dx = targetCenterX - entityCenterX;
        const dy = targetCenterY - entityCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            return { x: dx / dist, y: dy / dist };
        }

        return { x: 0, y: 0 };
    }

    // Avoid obstacles
    avoidObstacles(entity, obstacles) {
        let steerX = 0;
        let steerY = 0;
        let count = 0;

        const entityCenterX = entity.x + entity.width / 2;
        const entityCenterY = entity.y + entity.height / 2;
        const avoidRadius = 80;

        for (const obs of obstacles) {
            if (obs.destroyed) continue;

            const obsCenterX = obs.x + obs.width / 2;
            const obsCenterY = obs.y + obs.height / 2;

            const dx = entityCenterX - obsCenterX;
            const dy = entityCenterY - obsCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Use bounding box for more accurate distance
            const closestX = Math.max(obs.x, Math.min(entityCenterX, obs.x + obs.width));
            const closestY = Math.max(obs.y, Math.min(entityCenterY, obs.y + obs.height));
            const distToEdge = Math.sqrt(
                Math.pow(entityCenterX - closestX, 2) + 
                Math.pow(entityCenterY - closestY, 2)
            );

            if (distToEdge < avoidRadius) {
                const force = 1.0 - (distToEdge / avoidRadius);
                
                // Steer away from closest point
                const awayX = entityCenterX - closestX;
                const awayY = entityCenterY - closestY;
                const awayDist = Math.sqrt(awayX * awayX + awayY * awayY);
                
                if (awayDist > 0) {
                    steerX += (awayX / awayDist) * force;
                    steerY += (awayY / awayDist) * force;
                    count++;
                }
            }
        }

        if (count > 0) {
            steerX /= count;
            steerY /= count;
        }

        return { x: steerX, y: steerY };
    }

    // Apply flocking forces to entity's move direction
    applyToEntity(entity, neighbors, target, obstacles) {
        const forces = this.calculateForces(entity, neighbors, target, obstacles);
        
        // Normalize final force
        const mag = Math.sqrt(forces.x * forces.x + forces.y * forces.y);
        if (mag > 0) {
            entity.moveDir = {
                x: forces.x / mag,
                y: forces.y / mag
            };
        }
    }
}

// Global instance
const flockingBehavior = new FlockingBehavior();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FlockingBehavior, flockingBehavior };
}
