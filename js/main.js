 
import { startGame } from './gameLoop.js';

// Wait for the DOM to be fully loaded before trying to access canvas elements
document.addEventListener('DOMContentLoaded', () => {
    const gameCanvas = document.getElementById('gameCanvas');
    const minimapCanvas = document.getElementById('minimap');

    if (gameCanvas && minimapCanvas) {
        // Initialize canvas dimensions based on window size (as in original script)
        // This should ideally be handled consistently, perhaps renderer or gameLoop resizes initially.
        // For now, set it here before starting the game.
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
        minimapCanvas.width = 200; // As per original fixed size
        minimapCanvas.height = 200;

        startGame(gameCanvas, minimapCanvas);
    } else {
        let errorMsg = "Failed to find required canvas elements. Game cannot start.";
        if (!gameCanvas) errorMsg += " Missing 'gameCanvas'.";
        if (!minimapCanvas) errorMsg += " Missing 'minimap'.";
        console.error(errorMsg);
        // Optionally display this error to the user in the HTML
        const body = document.querySelector('body');
        if (body) {
            const errorDiv = document.createElement('div');
            errorDiv.textContent = errorMsg;
            errorDiv.style.color = 'red';
            errorDiv.style.fontSize = '20px';
            errorDiv.style.padding = '20px';
            body.prepend(errorDiv);
        }
    }
});
 