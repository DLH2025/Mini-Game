/**
 * Game Constants & Configuration
 * Centralized configuration for all game parameters
 */

const CONFIG = {
    // Canvas & Map Dimensions
    CANVAS: {
        GAME_WIDTH: 1400,
        GAME_HEIGHT: 900,
        COOP_MAP_WIDTH: 2800,
        COOP_MAP_HEIGHT: 1800,
        GRID_SIZE: 50,
        MINIMAP_WIDTH: 180,
        MINIMAP_HEIGHT: 115
    },

    // Player Settings
    PLAYER: {
        DEFAULT_WIDTH: 88,
        DEFAULT_HEIGHT: 88,
        DEFAULT_SPEED: 4,
        DEFAULT_MAX_HEALTH: 200,
        DEFAULT_MELEE_DAMAGE: 15,
        DEFAULT_RANGED_DAMAGE: 10,
        LOCK_RANGE: 600,
        DASH_DISTANCE: 300,
        DASH_DURATION: 10,
        DASH_MIN_DISTANCE: 50
    },

    // Skill Cooldowns (frames at 60fps)
    COOLDOWNS: {
        MELEE: 30,
        RANGED: 20,
        SKILL1: 300,  // Heal
        SKILL2: 180,  // Dash
        SKILL3: 240   // Blast
    },

    // Enemy Settings
    ENEMY: {
        AGGRO_RANGE: 250,
        AGGRO_RELEASE_MULTIPLIER: 2,
        SPAWN_POINTS: [
            { x: 2700, y: 200 },
            { x: 2700, y: 500 },
            { x: 2700, y: 900 },
            { x: 2700, y: 1300 },
            { x: 2700, y: 1600 }
        ]
    },

    // Enemy Type Configurations
    ENEMY_TYPES: {
        basic: {
            speed: 2.5,
            attackDamage: 8,
            maxHealth: 60,
            scoreValue: 100,
            accuracy: 0.5,
            attackFrequency: 0.2,
            decisionInterval: 35,
            idealRange: 80,
            shootRange: 120,
            isMelee: true,
            width: 40,
            height: 52
        },
        ranged: {
            speed: 2,
            attackDamage: 12,
            maxHealth: 50,
            scoreValue: 150,
            accuracy: 0.7,
            attackFrequency: 0.35,
            decisionInterval: 25,
            idealRange: 400,
            shootRange: 500,
            isMelee: false,
            width: 40,
            height: 52
        },
        tank: {
            speed: 1.5,
            attackDamage: 15,
            maxHealth: 150,
            scoreValue: 200,
            accuracy: 0.4,
            attackFrequency: 0.15,
            decisionInterval: 40,
            idealRange: 80,
            shootRange: 120,
            isMelee: true,
            width: 50,
            height: 50
        },
        fast: {
            speed: 4,
            attackDamage: 6,
            maxHealth: 40,
            scoreValue: 120,
            accuracy: 0.6,
            attackFrequency: 0.25,
            decisionInterval: 20,
            idealRange: 100,
            shootRange: 150,
            isMelee: true,
            width: 40,
            height: 52
        },
        elite: {
            speed: 3,
            attackDamage: 20,
            maxHealth: 200,
            scoreValue: 500,
            accuracy: 0.85,
            attackFrequency: 0.5,
            dodgeChance: 0.3,
            decisionInterval: 15,
            idealRange: 300,
            shootRange: 450,
            isMelee: false,
            width: 40,
            height: 52
        },
        boss: {
            speed: 1.8,
            attackDamage: 25,
            maxHealth: 800,
            scoreValue: 2000,
            accuracy: 0.9,
            attackFrequency: 0.6,
            dodgeChance: 0.2,
            decisionInterval: 12,
            idealRange: 350,
            shootRange: 500,
            isMelee: false,
            width: 70,
            height: 70
        }
    },

    // Enemy Colors
    ENEMY_COLORS: {
        basic: { light: '#ff6b6b', medium: '#ee5a5a', dark: '#cc4444' },
        ranged: { light: '#9b59b6', medium: '#8e44ad', dark: '#7d3c98' },
        tank: { light: '#e67e22', medium: '#d35400', dark: '#a04000' },
        fast: { light: '#f1c40f', medium: '#f39c12', dark: '#d68910' },
        elite: { light: '#e74c3c', medium: '#c0392b', dark: '#922b21' },
        boss: { light: '#ff0000', medium: '#cc0000', dark: '#990000' }
    },

    // Upgrade System
    UPGRADE: {
        HEALTH_BONUS: 50,
        ATTACK_MULTIPLIER: 0.2,
        SPEED_MULTIPLIER: 0.1,
        COUNTDOWN_TIME: 10
    },

    // Protect Target (Core)
    CORE: {
        x: 160,
        y: 700,
        width: 120,
        height: 200,
        maxHealth: 500
    },

    // Camera Settings
    CAMERA: {
        LERP_FACTOR: 0.1
    },

    // Physics
    PHYSICS: {
        BULLET_SPEED: 12,
        BULLET_SIZE: 16,
        EXPLOSION_LIFE: 30,
        EXPLOSION_MAX_RADIUS: 40
    },

    // Object Pool Settings
    POOL: {
        BULLET_POOL_SIZE: 200,
        EXPLOSION_POOL_SIZE: 100,
        ENEMY_POOL_SIZE: 100
    },

    // Spatial Partitioning
    SPATIAL: {
        CELL_SIZE: 200,
        MAX_ENTITIES_PER_CELL: 10
    },

    // Performance
    PERFORMANCE: {
        TARGET_FPS: 60,
        MAX_DELTA_TIME: 1000 / 30, // Cap at 30fps minimum
        ENABLE_CULLING: true,
        CULLING_MARGIN: 100
    }
};

// Prevent modifications to CONFIG
Object.freeze(CONFIG);
Object.keys(CONFIG).forEach(key => {
    if (typeof CONFIG[key] === 'object' && CONFIG[key] !== null) {
        Object.freeze(CONFIG[key]);
        Object.keys(CONFIG[key]).forEach(subKey => {
            if (typeof CONFIG[key][subKey] === 'object' && CONFIG[key][subKey] !== null) {
                Object.freeze(CONFIG[key][subKey]);
            }
        });
    }
});

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
