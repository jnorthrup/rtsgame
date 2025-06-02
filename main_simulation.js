import { WebGL2DRenderer } from './webgl_2d_renderer.js';
import { WebGLRenderer } from './js_rewritten/rendering/webglRenderer.js';
import { TERRAIN_TYPES, TILE_SIZE, GRID_SIZE, WORLD_SIZE } from './js/config/gameConstants.js';

// Constants for 2D WebGL Renderer (for visual consistency with terrain types)
const TERRAIN_COLORS = {
    [TERRAIN_TYPES.WATER]: [0.0, 0.2, 0.5, 1.0],    // Blue
    [TERRAIN_TYPES.LAND]: [0.2, 0.6, 0.2, 1.0],     // Green
    [TERRAIN_TYPES.MOUNTAIN]: [0.4, 0.4, 0.4, 1.0]  // Gray
};

const TEAM_COLORS = {
    'blue': [0.1, 0.1, 0.8, 1.0], // Dark Blue
    'red': [0.8, 0.1, 0.1, 1.0]   // Dark Red
};

const rendererSelect = document.getElementById('renderer-select');
const startButton = document.getElementById('start-simulation');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const gameCanvas = document.getElementById('game-canvas');
const gameSvg = document.getElementById('game-svg');

let currentRenderer = null;
let simulationInterval = null;
let bots = [];
let terrain = [];
let events = [];
let gameTime = 0;
const SIMULATION_DURATION = 10; // 10 seconds

let camera = { x: 0, y: 0, zoom: 1.0 }; // Initial camera state for WebGL 3D
const ZOOM_FACTOR = 1.2; // How much to zoom in/out
const MIN_ZOOM = 0.01; // Roughly "10 miles up" (very zoomed out)
const MAX_ZOOM = 20.0;  // Roughly "1 meter" (very zoomed in)

function initializeTerrain(size) {
    const newTerrain = [];
    for (let x = 0; x < size; x++) {
        newTerrain[x] = [];
        for (let y = 0; y < size; y++) {
            const rand = Math.random();
            if (rand < 0.2) {
                newTerrain[x][y] = TERRAIN_TYPES.WATER;
            } else if (rand < 0.4) {
                newTerrain[x][y] = TERRAIN_TYPES.MOUNTAIN;
            } else {
                newTerrain[x][y] = TERRAIN_TYPES.LAND;
            }
        }
    }
    return newTerrain;
}

function updateBot(bot, currentTerrain, allBots, time, eventLog) {
    const actionChance = Math.random();
    const otherBot = allBots.find(b => b.id !== bot.id);
    const distToOther = Math.sqrt(Math.pow(otherBot.x - bot.x, 2) + Math.pow(otherBot.y - bot.y, 2));

    if (actionChance < 0.3 && distToOther < 3) {
        const damage = Math.floor(Math.random() * 10) + 5;
        otherBot.hp -= damage;
        bot.action = 'attack';
        eventLog.push({
            time,
            message: `Bot ${bot.id} (${bot.team}) attacked Bot ${otherBot.id} for ${damage} damage at (${bot.x},${bot.y})`
        });
    } else if (actionChance < 0.6) {
        const direction = Math.floor(Math.random() * 4);
        let newX = bot.x;
        let newY = bot.y;
        if (direction === 0 && bot.y > 0) newY--;
        else if (direction === 1 && bot.x < currentTerrain.length - 1) newX++;
        else if (direction === 2 && bot.y < currentTerrain.length - 1) newY++;
        else if (direction === 3 && bot.x > 0) newX--;

        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && currentTerrain[newX][newY] !== TERRAIN_TYPES.WATER) {
            bot.x = newX;
            bot.y = newY;
            bot.action = 'move';
            eventLog.push({
                time,
                message: `Bot ${bot.id} (${bot.team}) moved to (${bot.x},${bot.y})`
            });
        } else {
            bot.action = 'idle';
        }
    } else {
        bot.action = 'defend';
        if (Math.random() < 0.5) {
            eventLog.push({
                time,
                message: `Bot ${bot.id} (${bot.team}) defended at (${bot.x},${bot.y})`
            });
        }
    }
}

function renderScene(currentTerrain, currentBots, rendererType) {
    if (rendererType === 'svg') {
        // Clear SVG
        while (gameSvg.firstChild) {
            gameSvg.removeChild(gameSvg.firstChild);
        }

        // Render terrain
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', x * TILE_SIZE);
                rect.setAttribute('y', y * TILE_SIZE);
                rect.setAttribute('width', TILE_SIZE);
                rect.setAttribute('height', TILE_SIZE);
                rect.classList.add('terrain-cell');
                // Map numerical terrain type to class name for CSS styling
                switch (currentTerrain[x][y]) {
                    case TERRAIN_TYPES.WATER: rect.classList.add('water'); break;
                    case TERRAIN_TYPES.LAND: rect.classList.add('land'); break;
                    case TERRAIN_TYPES.MOUNTAIN: rect.classList.add('mountain'); break;
                }
                gameSvg.appendChild(rect);
            }
        }

        // Render bots
        currentBots.forEach(bot => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('id', `bot-${bot.id}`);
            circle.setAttribute('cx', bot.x * TILE_SIZE + TILE_SIZE / 2);
            circle.setAttribute('cy', bot.y * TILE_SIZE + TILE_SIZE / 2);
            circle.setAttribute('r', TILE_SIZE / 3);
            circle.classList.add('bot');
            circle.classList.add(`team-${bot.team === 'blue' ? 0 : 1}`);
            gameSvg.appendChild(circle);
        });

    } else if (rendererType === 'canvas2d') {
        const ctx = gameCanvas.getContext('2d');
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height); // Clear canvas

        // Render terrain
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const terrainType = currentTerrain[x][y];
                let color;
                switch (terrainType) {
                    case TERRAIN_TYPES.WATER: color = 'rgba(0, 51, 128, 1.0)'; break; // Blue
                    case TERRAIN_TYPES.LAND: color = 'rgba(51, 153, 51, 1.0)'; break;  // Green
                    case TERRAIN_TYPES.MOUNTAIN: color = 'rgba(102, 102, 102, 1.0)'; break; // Gray
                    default: color = 'rgba(0, 0, 0, 1.0)'; // Black
                }
                ctx.fillStyle = color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }

        // Render bots
        currentBots.forEach(bot => {
            const botSize = TILE_SIZE * 0.6;
            const botColor = bot.team === 'blue' ? 'rgba(25, 25, 204, 1.0)' : 'rgba(204, 25, 25, 1.0)'; // Darker colors
            const centerX = bot.x * TILE_SIZE + TILE_SIZE / 2;
            const centerY = bot.y * TILE_SIZE + TILE_SIZE / 2;

            ctx.fillStyle = botColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, botSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

    } else if (rendererType === 'webgl2d') {
        currentRenderer.clear();

        // Render terrain
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const terrainType = currentTerrain[x][y];
                const color = TERRAIN_COLORS[terrainType];
                currentRenderer.drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, color);
            }
        }

        // Render bots (as squares for simplicity in 2D WebGL)
        currentBots.forEach(bot => {
            const botSize = TILE_SIZE * 0.6;
            const botColor = TEAM_COLORS[bot.team];
            const centerX = bot.x * TILE_SIZE + TILE_SIZE / 2;
            const centerY = bot.y * TILE_SIZE + TILE_SIZE / 2;
            currentRenderer.drawRect(centerX - botSize / 2, centerY - botSize / 2, botSize, botSize, botColor);
        });
    } else if (rendererType === 'webgl3d') {
        const gameContext = {
            terrain: currentTerrain,
            units: currentBots,
            buildings: []
        };
        currentRenderer.render(gameContext);
    }
}

function startSimulation() {
    clearInterval(simulationInterval); // Clear any existing simulation

    gameTime = 0;
    events = [];
    terrain = initializeTerrain(GRID_SIZE);
    bots = [
        { id: 1, team: 'blue', x: 2, y: 2, hp: 100, action: 'idle', type: {name: 'bot'} },
        { id: 2, team: 'red', x: 7, y: 7, hp: 100, action: 'idle', type: {name: 'bot'} }
    ];

    const selectedRenderer = rendererSelect.value;

    // Hide/show canvas/svg based on selection
    if (selectedRenderer === 'svg') {
        gameCanvas.style.display = 'none';
        gameSvg.style.display = 'block';
        currentRenderer = null; // No specific renderer class for SVG DOM manipulation
    } else {
        gameCanvas.style.display = 'block';
        gameSvg.style.display = 'none';
        if (selectedRenderer === 'webgl2d') {
            currentRenderer = new WebGL2DRenderer(gameCanvas);
        } else if (selectedRenderer === 'webgl3d') {
            currentRenderer = new WebGLRenderer(gameCanvas);
            // Initialize camera for 3D renderer with initial centered view
            camera.x = GRID_SIZE * TILE_SIZE / 2;
            camera.y = GRID_SIZE * TILE_SIZE / 2;
            camera.zoom = gameCanvas.width / (GRID_SIZE * TILE_SIZE); // Fit grid to canvas
            currentRenderer.updateCamera({
                x: camera.x,
                y: camera.y,
                zoom: camera.zoom,
                canvasWidth: gameCanvas.width,
                canvasHeight: gameCanvas.height
            });
        }
    }

    renderScene(terrain, bots, selectedRenderer); // Initial render

    simulationInterval = setInterval(() => {
        if (gameTime >= SIMULATION_DURATION) {
            clearInterval(simulationInterval);
            console.log('Simulation finished.');
            return;
        }

        gameTime += 1;
        for (const bot of bots) {
            updateBot(bot, terrain, bots, gameTime, events);
        }

        renderScene(terrain, bots, selectedRenderer); // Re-render with updated positions

        const timeEvents = events.filter(e => e.time === gameTime);
        for (const event of timeEvents) {
            console.log(`Time ${gameTime}s: ${event.message}`);
        }
    }, 1000); // 1 second per iteration
}

startButton.addEventListener('click', startSimulation);
zoomInButton.addEventListener('click', () => adjustZoom(ZOOM_FACTOR));
zoomOutButton.addEventListener('click', () => adjustZoom(1 / ZOOM_FACTOR));

function adjustZoom(factor) {
    if (currentRenderer && rendererSelect.value === 'webgl3d') {
        const newZoom = camera.zoom * factor;
        if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
            camera.zoom = newZoom;
            currentRenderer.updateCamera({
                x: camera.x,
                y: camera.y,
                zoom: camera.zoom,
                canvasWidth: gameCanvas.width,
                canvasHeight: gameCanvas.height
            });
            renderScene(terrain, bots, rendererSelect.value); // Re-render after zoom
        }
    }
}

// Initial setup on page load
startSimulation();