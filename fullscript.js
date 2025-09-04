// Main Script Coordinator
// Minimal coordinator that runs after all modules are loaded

document.addEventListener('DOMContentLoaded', () => {
    console.log('Main coordinator loaded - all modules should be initialized');
    
    // Verify that all modules have loaded
    const modules = [
        'WebSocket',
        'UI Rendering', 
        'Task Execution',
        'Hamburger Menu',
        'UI Interactions',
        'App Initialization'
    ];
    
    const moduleChecks = [
        window.connectWebSocket,
        window.renderAgents,
        window.runTask,
        window.hamburgerMenu,
        window.uiInteractions,
        window.app
    ];
    
    console.log('Module status:');
    modules.forEach((module, index) => {
        const status = moduleChecks[index] ? '✅' : '❌';
        console.log(`${status} ${module}: ${moduleChecks[index] ? 'Loaded' : 'Missing'}`);
    });
    
    // Set up global message handler bridge
    if (window.setupMessageHandler && window.handleMessage) {
        window.setupMessageHandler(window.handleMessage);
    }
    
    console.log('Agentic AI Tutorial - All modules loaded and coordinated');
});
