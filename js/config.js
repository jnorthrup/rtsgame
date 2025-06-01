// Game constants
export const WORLD_SIZE = 5000;
export const TILE_SIZE = 50;
export const GRID_SIZE = WORLD_SIZE / TILE_SIZE;

export const TERRAIN_TYPES = {
    WATER: 0,
    LAND: 1,
    MOUNTAIN: 2
};

// Unit types
export const UNIT_TYPES = {
    tank: { name: 'Tank', domain: 'land', size: 10, speed: 1, maxHp: 100, damage: 20, range: 150, attackSpeed: 30, buildTime: 60, color: '#888', effectColor: '#ff0', cost: { mass: 100, energy: 50 }, tier: 1 },
    bot: { name: 'Bot', domain: 'land', size: 6, speed: 2, maxHp: 50, damage: 10, range: 100, attackSpeed: 20, buildTime: 30, color: '#aaa', effectColor: '#f80', cost: { mass: 50, energy: 25 }, tier: 1 },
    artillery: { name: 'Artillery', domain: 'land', size: 12, speed: 0.5, maxHp: 80, damage: 50, range: 300, attackSpeed: 60, buildTime: 90, color: '#666', effectColor: '#f00', cost: { mass: 150, energy: 100 }, tier: 2 },
    battleship: { name: 'Battleship', domain: 'sea', size: 20, speed: 0.8, maxHp: 200, damage: 40, range: 250, attackSpeed: 40, buildTime: 120, color: '#048', effectColor: '#0ff', cost: { mass: 200, energy: 150 }, tier: 2 },
    submarine: { name: 'Submarine', domain: 'sea', size: 15, speed: 1.2, maxHp: 120, damage: 30, range: 200, attackSpeed: 35, buildTime: 80, color: '#026', effectColor: '#088', cost: { mass: 120, energy: 80 }, tier: 1 },
    fighter: { name: 'Fighter', domain: 'air', size: 8, speed: 4, maxHp: 60, damage: 15, range: 150, attackSpeed: 15, buildTime: 50, color: '#ccc', effectColor: '#fff', cost: { mass: 80, energy: 60 }, tier: 1 },
    bomber: { name: 'Bomber', domain: 'air', size: 12, speed: 2, maxHp: 100, damage: 60, range: 100, attackSpeed: 50, buildTime: 100, color: '#999', effectColor: '#ff8', cost: { mass: 150, energy: 120 }, tier: 2 },
    gunship: { name: 'Gunship', domain: 'air', size: 10, speed: 3, maxHp: 80, damage: 25, range: 120, attackSpeed: 20, buildTime: 70, color: '#bbb', effectColor: '#f8f', cost: { mass: 100, energy: 80 }, tier: 1 },
    engineer: { name: 'Engineer', domain: 'land', size: 8, speed: 1.5, maxHp: 60, damage: 0, range: 0, attackSpeed: 0, buildTime: 40, color: '#0f0', effectColor: '#0f0', cost: { mass: 80, energy: 40 }, support: true, tier: 1 },
    shieldGenerator: { name: 'Shield Generator', domain: 'land', size: 14, speed: 0.7, maxHp: 150, damage: 0, range: 0, attackSpeed: 0, buildTime: 80, color: '#0ff', effectColor: '#0ff', cost: { mass: 120, energy: 200 }, support: true, shields: 100, shieldRegen: 2, tier: 2 },
    experimental: { name: 'Experimental', domain: 'land', size: 25, speed: 0.5, maxHp: 500, damage: 100, range: 200, attackSpeed: 40, buildTime: 300, color: '#f0f', effectColor: '#f0f', cost: { mass: 500, energy: 400 }, shields: 200, shieldRegen: 5, tier: 3 }
};

export const BUILDING_TYPES = {
    commander: { name: 'Commander', size: 30, maxHp: 1000, produces: null, color: '#ff0', resourceGeneration: { type: 'mass', amount: 1 } },
    landFactory: { name: 'Land Factory', size: 40, maxHp: 500, produces: [UNIT_TYPES.tank, UNIT_TYPES.bot, UNIT_TYPES.artillery, UNIT_TYPES.engineer, UNIT_TYPES.shieldGenerator], color: '#840', cost: { mass: 200, energy: 100 } },
    advancedLandFactory: { name: 'Advanced Land Factory', size: 50, maxHp: 700, produces: [UNIT_TYPES.artillery, UNIT_TYPES.shieldGenerator, UNIT_TYPES.experimental], color: '#a60', cost: { mass: 400, energy: 300 } },
    airFactory: { name: 'Air Factory', size: 40, maxHp: 400, produces: [UNIT_TYPES.fighter, UNIT_TYPES.bomber, UNIT_TYPES.gunship], color: '#888', cost: { mass: 150, energy: 120 } },
    navalFactory: { name: 'Naval Factory', size: 50, maxHp: 600, produces: [UNIT_TYPES.battleship, UNIT_TYPES.submarine], color: '#048', cost: { mass: 250, energy: 150 } },
    massExtractor: { name: 'Mass Extractor', size: 20, maxHp: 200, produces: null, color: '#888', resourceGeneration: { type: 'mass', amount: 2 }, cost: { mass: 50, energy: 25 } },
    energyExtractor: { name: 'Energy Plant', size: 20, maxHp: 150, produces: null, color: '#ff0', resourceGeneration: { type: 'energy', amount: 3 }, cost: { mass: 30, energy: 20 } }
};
