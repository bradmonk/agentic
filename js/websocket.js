// WebSocket connection and messaging functionality
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.isWorkflowRunning = false;
        this.connectionStatus = document.getElementById('connection-status');
    }

    updateConnectionStatus(status) {
        this.connectionStatus.className = `status-${status}`;
        this.connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    connectWebSocket() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.updateConnectionStatus('connecting');
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = (event) => {
            console.log('Connected to WebSocket');
            this.updateConnectionStatus('Connected');
            
            // Enable UI elements
            document.getElementById('start-workflow').disabled = false;
            document.getElementById('run-task').disabled = false;
            
            // Request initial UI state
            this.sendMessage('get_ui_state', {});
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            this.handleMessage(data);
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket connection closed');
            this.updateConnectionStatus('Disconnected');
            
            // Disable UI elements
            document.getElementById('start-workflow').disabled = true;
            document.getElementById('run-task').disabled = true;
            
            // Try to reconnect after 3 seconds
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('Error');
        };
    }

    sendMessage(type, payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({type, payload}));
        }
    }

    handleMessage(data) {
        switch(data.type) {
            case 'ui_state':
                window.uiRenderer.initializeUI(data.payload);
                break;
            case 'agent_update':
                window.uiRenderer.updateAgentCard(data.payload.agent_id, data.payload);
                break;
            case 'tool_update':
                window.uiRenderer.updateToolCard(data.payload.tool_id, data.payload);
                break;
            case 'blackboard_update':
                window.uiRenderer.updateBlackboard(data.payload);
                break;
            case 'workflow_status':
                window.uiRenderer.updateWorkflowStatus(data.payload);
                break;
            case 'task_progress':
                window.taskExecutor.handleTaskProgress(data.payload);
                break;
            case 'task_complete':
                window.taskExecutor.handleTaskComplete(data.payload);
                break;
            case 'task_error':
                window.taskExecutor.handleTaskError(data.payload);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }
}

// Export for global use
window.WebSocketManager = WebSocketManager;
