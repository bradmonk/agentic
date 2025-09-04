// WebSocket functionality - Step 1 extraction
// Global variables that WebSocket functions need
let ws = null;

function updateConnectionStatus(status) {
    const connectionStatus = document.getElementById('connection-status');
    connectionStatus.className = `status-${status}`;
    connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
    }

    updateConnectionStatus('connecting');
    ws = new WebSocket('ws://localhost:8080');

    ws.onopen = function(event) {
        const connectionStatus = document.getElementById('connection-status');
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'status-connected';
        
        // Enable task execution if task is entered
        const taskDescription = document.getElementById('task-description');
        const runTaskBtn = document.getElementById('run-task');
        const hasTask = taskDescription.value.trim().length > 0;
        runTaskBtn.disabled = !hasTask || window.isTaskRunning;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (window.handleMessage) {
                window.handleMessage(data);
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    };

    ws.onclose = () => {
        updateConnectionStatus('disconnected');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
    };
}

function sendMessage(type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
}

function isWebSocketConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
}

// Make functions globally available
window.connectWebSocket = connectWebSocket;
window.sendMessage = sendMessage;
window.updateConnectionStatus = updateConnectionStatus;
window.isWebSocketConnected = isWebSocketConnected;

// Auto-connect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for the main script to initialize
    setTimeout(connectWebSocket, 100);
});
