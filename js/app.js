// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Agentic AI Tutorial application...');

    // Initialize all managers and systems
    window.dataModels = new DataModels();
    window.wsManager = new WebSocketManager();
    window.uiRenderer = new UIRenderer();
    window.taskExecutor = new TaskExecutor();
    window.uiInteractions = new UIInteractions();

    // Setup event listeners
    window.uiInteractions.setupEventListeners();

    // Initialize model options
    window.dataModels.updateModelOptions();

    // Connect to WebSocket
    window.wsManager.connectWebSocket();

    // Initialize with sample data
    console.log('Initializing sample data...');
    window.dataModels.initializeSampleData();
    
    // Render UI components
    console.log('Rendering UI components...');
    window.uiRenderer.renderAgents();
    window.uiRenderer.renderTools();
    
    // Draw connections after a short delay to ensure DOM is ready
    setTimeout(() => {
        window.uiRenderer.drawConnections();
    }, 100);
    
    console.log('Sample data initialized.');

    console.log('Application initialization complete.');
});

// Global utility functions (if needed)
window.AgenticApp = {
    // Export configuration
    exportConfiguration: () => {
        const config = window.dataModels.exportData();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agentic-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Import configuration
    importConfiguration: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                window.dataModels.importData(config);
                window.uiRenderer.renderAgents();
                window.uiRenderer.renderTools();
                window.uiRenderer.drawConnections();
                window.uiInteractions.showNotification('Configuration imported successfully', 'success');
            } catch (error) {
                window.uiInteractions.showNotification('Error importing configuration', 'error');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    },

    // Reset to defaults
    resetToDefaults: () => {
        if (confirm('Reset all agents and tools to default configuration?')) {
            window.dataModels.initializeSampleData();
            window.uiRenderer.renderAgents();
            window.uiRenderer.renderTools();
            window.uiRenderer.drawConnections();
            window.uiInteractions.showNotification('Reset to default configuration', 'success');
        }
    }
};
