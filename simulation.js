const SVG_WIDTH = 800;
const SVG_HEIGHT = 600;
const GRID_SIZE = 10;
const CELL_SIZE = Math.min(SVG_WIDTH, SVG_HEIGHT) / GRID_SIZE;

const svg = document.getElementById('game-svg');

function initializeTerrain(size) {
    const terrain = [];
    for (let x = 0; x < size; x++) {
        terrain[x] = [];
        for (let y = 0; y < size; y++) {
            const rand = Math.random();
            if (rand < 0.2) {
                terrain[x][y] = 'water';
            } else if (rand < 0.4) {
                terrain[x][y] = 'mountain';
            } else {
                terrain[x][y] = 'land';
            }
        }
    }
    return terrain;
}

function renderTerrain(terrain) {
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x * CELL_SIZE);
            rect.setAttribute('y', y * CELL_SIZE);
            rect.setAttribute('width', CELL_SIZE);
            rect.setAttribute('height', CELL_SIZE);
            rect.classList.add('terrain-cell');
            rect.classList.add(terrain[x][y]);
            svg.appendChild(rect);
        }
    }
}

function renderBots(bots) {
    bots.forEach(bot => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('id', `bot-${bot.id}`);
        circle.setAttribute('cx', bot.x * CELL_SIZE + CELL_SIZE / 2);
        circle.setAttribute('cy', bot.y * CELL_SIZE + CELL_SIZE / 2);
        circle.setAttribute('r', CELL_SIZE / 3);
        circle.classList.add('bot');
        circle.classList.add(`team-${bot.team === 'blue' ? 0 : 1}`);
        svg.appendChild(circle);
    });
}

function updateBotGraphics(bot) {
    const circle = document.getElementById(`bot-${bot.id}`);
    if (circle) {
        circle.setAttribute('cx', bot.x * CELL_SIZE + CELL_SIZE / 2);
        circle.setAttribute('cy', bot.y * CELL_SIZE + CELL_SIZE / 2);
    }
}

function updateBot(bot, terrain, bots, time, events) {
    const actionChance = Math.random();
    const otherBot = bots.find(b => b.id !== bot.id);
    const distToOther = Math.sqrt(Math.pow(otherBot.x - bot.x, 2) + Math.pow(otherBot.y - bot.y, 2));

    if (actionChance < 0.3 && distToOther < 3) {
        const damage = Math.floor(Math.random() * 10) + 5;
        otherBot.hp -= damage;
        bot.action = 'attack';
        events.push({
            time,
            message: `Bot ${bot.id} (${bot.team}) attacked Bot ${otherBot.id} for ${damage} damage at (${bot.x},${bot.y})`
        });
    } else if (actionChance < 0.6) {
        const direction = Math.floor(Math.random() * 4);
        let newX = bot.x;
        let newY = bot.y;
        if (direction === 0 && bot.y > 0) newY--;
        else if (direction === 1 && bot.x < terrain.length - 1) newX++;
        else if (direction === 2 && bot.y < terrain.length - 1) newY++;
        else if (direction === 3 && bot.x > 0) newX--;

        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && terrain[newX][newY] !== 'water') {
            bot.x = newX;
            bot.y = newY;
            bot.action = 'move';
            events.push({
                time,
                message: `Bot ${bot.id} (${bot.team}) moved to (${bot.x},${bot.y})`
            });
        } else {
            bot.action = 'idle';
        }
    } else {
        bot.action = 'defend';
        if (Math.random() < 0.5) {
            events.push({
                time,
                message: `Bot ${bot.id} (${bot.team}) defended at (${bot.x},${bot.y})`
            });
        }
    }
}

function simulateMatch(duration) {
    let gameTime = 0;
    const events = [];
    const terrain = initializeTerrain(GRID_SIZE);
    const bots = [
        { id: 1, team: 'blue', x: 2, y: 2, hp: 100, action: 'idle' },
        { id: 2, team: 'red', x: 7, y: 7, hp: 100, action: 'idle' }
    ];

    renderTerrain(terrain);
    renderBots(bots);

    const simulationInterval = setInterval(() => {
        if (gameTime >= duration) {
            clearInterval(simulationInterval);
            console.log('Simulation finished.');
            return;
        }

        gameTime += 1;
        for (const bot of bots) {
            updateBot(bot, terrain, bots, gameTime, events);
            updateBotGraphics(bot);
        }

        const timeEvents = events.filter(e => e.time === gameTime);
        for (const event of timeEvents) {
            console.log(`Time ${gameTime}s: ${event.message}`);
        }
    }, 1000); // 1 second per iteration
}

// Run the simulation for 10 seconds
simulateMatch(10);