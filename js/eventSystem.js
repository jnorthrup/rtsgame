import { gameState, camera } from './gameState.js';
import { formatTime } from './utils.js';

// Event system
export function addEvent(type, message, importance = 1) {
    const event = {
        type: type,
        message: message,
        time: gameState.gameTime,
        importance: importance
        // position will be added dynamically by the caller if needed
    };

    gameState.events.unshift(event);
    if (gameState.events.length > 10) {
        gameState.events.pop();
    }

    // Update event log UI
    // This direct DOM manipulation might be problematic if called before DOM is fully ready
    // or if ui.js is intended to be the sole owner of event log rendering.
    // For now, replicating original behavior.
    const eventLog = document.getElementById('events');
    if (eventLog) {
        const eventDiv = document.createElement('div');
        eventDiv.className = `event event-${type}`;
        eventDiv.textContent = `[${formatTime(gameState.gameTime)}] ${message}`;
        eventLog.insertBefore(eventDiv, eventLog.firstChild);

        if (eventLog.children.length > 10) {
            eventLog.removeChild(eventLog.lastChild);
        }
    } else {
        // console.warn("Event log DOM element not found when trying to add event:", message);
    }

    // Set camera target for important events
    if (importance >= 2 && camera.autoCamera && event.position) { // event.position must be set by caller
        camera.cameraTarget = event.position;
        camera.cameraTimer = 180; // 3 seconds
    }

    return event;
}
