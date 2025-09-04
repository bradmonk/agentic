// UI interactions and event handling
class UIInteractions {
    constructor() {
        this.eventListenersSetup = false;
    }

    setupEventListeners() {
        if (this.eventListenersSetup) return;
        
        // Model selection
        const llmProvider = document.getElementById('llm-provider');
        llmProvider.addEventListener('change', () => {
            window.dataModels.updateModelOptions();
        });

        // Workflow controls
        const startWorkflowBtn = document.getElementById('start-workflow');
        const stopWorkflowBtn = document.getElementById('stop-workflow');

        startWorkflowBtn.addEventListener('click', () => {
            const config = {
                provider: llmProvider.value,
                model: document.getElementById('model-name').value
            };
            window.wsManager.sendMessage('start_workflow', config);
        });

        stopWorkflowBtn.addEventListener('click', () => {
            window.wsManager.sendMessage('stop_workflow', {});
        });

        // Task execution controls
        this.setupTaskEventListeners();

        // Content editing
        this.setupPromptEditing();

        // Window resize handler
        window.addEventListener('resize', () => {
            setTimeout(() => window.uiRenderer.drawConnections(), 100);
        });

        this.eventListenersSetup = true;
        console.log('Event listeners setup complete');
    }

    setupTaskEventListeners() {
        const taskDescription = document.getElementById('task-description');
        const runTaskBtn = document.getElementById('run-task');
        const clearTaskBtn = document.getElementById('clear-task');
        const pauseExecutionBtn = document.getElementById('pause-execution');
        const exportResultsBtn = document.getElementById('export-results');
        const clearResultsBtn = document.getElementById('clear-results');
        const closeResultsBtn = document.getElementById('close-results');

        taskDescription.addEventListener('input', () => {
            const hasTask = taskDescription.value.trim().length > 0;
            runTaskBtn.disabled = !hasTask || window.taskExecutor.isTaskRunning || 
                                   !window.wsManager.ws || window.wsManager.ws.readyState !== WebSocket.OPEN;
            
            if (hasTask && !window.taskExecutor.isTaskRunning) {
                document.getElementById('task-status-text').textContent = 'Ready to run';
            } else if (!hasTask) {
                document.getElementById('task-status-text').textContent = 'Enter a task description';
            }
        });

        runTaskBtn.addEventListener('click', () => {
            window.taskExecutor.runTask();
        });

        clearTaskBtn.addEventListener('click', () => {
            window.taskExecutor.clearTask();
        });

        pauseExecutionBtn.addEventListener('click', () => {
            window.taskExecutor.pauseExecution();
        });

        exportResultsBtn.addEventListener('click', () => {
            window.taskExecutor.exportResults();
        });

        clearResultsBtn.addEventListener('click', () => {
            window.taskExecutor.clearResults();
        });

        closeResultsBtn.addEventListener('click', () => {
            window.taskExecutor.hideResults();
        });
    }

    setupPromptEditing() {
        // Use event delegation for dynamic content
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('editable')) {
                this.makeEditable(e.target);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('editing')) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur(); // Finish editing
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelEdit(e.target);
                }
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('editing')) {
                this.finishEdit(e.target);
            }
        }, true);
    }

    makeEditable(element) {
        if (element.classList.contains('editing')) return;

        const originalText = element.textContent;
        element.dataset.originalText = originalText;
        element.classList.add('editing');
        element.contentEditable = true;
        element.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    finishEdit(element) {
        const newText = element.textContent.trim();
        const originalText = element.dataset.originalText;

        element.classList.remove('editing');
        element.contentEditable = false;
        delete element.dataset.originalText;

        if (newText !== originalText && newText.length > 0) {
            this.saveEdit(element, newText);
        } else {
            element.textContent = originalText;
        }
    }

    cancelEdit(element) {
        const originalText = element.dataset.originalText;
        element.textContent = originalText;
        element.classList.remove('editing');
        element.contentEditable = false;
        delete element.dataset.originalText;
    }

    saveEdit(element, newText) {
        const field = element.dataset.field;
        const index = element.dataset.index;
        
        // Find the parent card to determine the ID
        const agentCard = element.closest('.agent-card');
        const toolCard = element.closest('.tool-card');
        
        if (agentCard) {
            const agentId = agentCard.id.replace('agent-', '');
            window.dataModels.updateAgentData(agentId, field, newText, index ? parseInt(index) : null);
            console.log(`Updated agent ${agentId} ${field}:`, newText);
        } else if (toolCard) {
            const toolId = toolCard.id.replace('tool-', '');
            window.dataModels.updateToolData(toolId, field, newText);
            console.log(`Updated tool ${toolId} ${field}:`, newText);
        }

        // Show visual feedback
        element.style.backgroundColor = '#d4edda';
        setTimeout(() => {
            element.style.backgroundColor = '';
        }, 1000);
    }

    // Utility methods for UI state management
    enableWorkflowControls() {
        document.getElementById('start-workflow').disabled = false;
        document.getElementById('run-task').disabled = false;
    }

    disableWorkflowControls() {
        document.getElementById('start-workflow').disabled = true;
        document.getElementById('run-task').disabled = true;
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#c3e6cb' : '#bee5eb'};
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460'};
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Export for global use
window.UIInteractions = UIInteractions;
