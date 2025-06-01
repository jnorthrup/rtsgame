const BUILDING_TYPES = {
    landFactory: {
        name: 'Land Factory',
        size: 40,
        maxHp: 500,
        produces: [UNIT_TYPES.tank, UNIT_TYPES.bot, UNIT_TYPES.artillery, UNIT_TYPES.engineer, UNIT_TYPES.shieldGenerator],
        color: '#840',
        cost: { mass: 200, energy: 100 }
    },
    advancedLandFactory: {
        name: 'Advanced Land Factory',
        size: 50,
        maxHp: 700,
        produces: [UNIT_TYPES.artillery, UNIT_TYPES.shieldGenerator, UNIT_TYPES.experimental],
        color: '#a60',
        cost: { mass: 400, energy: 300 }
    },
    airFactory: {
        name: 'Air Factory',
        size: 40,
        maxHp: 400,
        produces: [UNIT_TYPES.fighter, UNIT_TYPES.bomber, UNIT_TYPES.gunship],
        color: '#888',
        cost: { mass: 150, energy: 120 }
    },
    navalFactory: {
        name: 'Naval Factory',
        size: 50,
        maxHp: 600,
        produces: [UNIT_TYPES.battleship, UNIT_TYPES.submarine],
        color: '#048',
        cost: { mass: 250, energy: 150 }
    },
    massExtractor: {
        name: 'Mass Extractor',
        size: 20,
        maxHp: 200,
        produces: null,
        color: '#888',
        resourceGeneration: { type: 'mass', amount: 2 },
        cost: { mass: 50, energy: 25 }
    },
    energyExtractor: {
        name: 'Energy Plant',
        size: 20,
        maxHp: 150,
        produces: null,
        color: '#ff0',
        resourceGeneration: { type: 'energy', amount: 3 },
        cost: { mass: 30, energy: 20 }
    }
};

export { BUILDING_TYPES };
