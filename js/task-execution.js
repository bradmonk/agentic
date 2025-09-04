// Task execution system
class TaskExecutor {
    constructor() {
        this.taskDescription = document.getElementById('task-description');
        this.runTaskBtn = document.getElementById('run-task');
        this.clearTaskBtn = document.getElementById('clear-task');
        this.taskStatusText = document.getElementById('task-status-text');
        this.executionProgress = document.getElementById('execution-progress');
        this.currentAgentName = document.getElementById('current-agent-name');
        this.progressFill = document.getElementById('progress-fill');
        this.executionLog = document.getElementById('execution-log');
        this.pauseExecutionBtn = document.getElementById('pause-execution');
        this.resultsPanel = document.getElementById('results-panel');
        this.finalOutputContent = document.getElementById('final-output-content');
        this.intermediateResultsContent = document.getElementById('intermediate-results-content');
        this.exportResultsBtn = document.getElementById('export-results');
        this.clearResultsBtn = document.getElementById('clear-results');
        this.closeResultsBtn = document.getElementById('close-results');

        // Task execution state
        this.currentTask = null;
        this.taskExecutionId = null;
        this.executionSteps = [];
        this.currentStepIndex = 0;
        this.isTaskRunning = false;
        this.taskResults = {
            finalOutput: '',
            agentOutputs: [],
            executionTime: 0,
            tokensUsed: 0
        };
    }

    runTask() {
        const description = this.taskDescription.value.trim();
        if (!description) {
            alert('Please enter a task description');
            return;
        }

        if (!window.wsManager.ws || window.wsManager.ws.readyState !== WebSocket.OPEN) {
            alert('WebSocket connection not available');
            return;
        }

        this.isTaskRunning = true;
        this.currentTask = {
            description: description,
            startTime: Date.now()
        };

        // Update UI
        this.taskStatusText.textContent = 'Starting task execution...';
        this.runTaskBtn.disabled = true;
        this.clearTaskBtn.disabled = true;
        this.pauseExecutionBtn.disabled = false;
        this.executionProgress.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.executionLog.innerHTML = '';

        // Start simulation for now (replace with real WebSocket call later)
        this.simulateTaskExecution();
    }

    simulateTaskExecution() {
        const steps = [
            { agent: 'Coordinator', action: 'Analyzing task requirements', duration: 1000 },
            { agent: 'Researcher', action: 'Gathering relevant information', duration: 2000 },
            { agent: 'Analyzer', action: 'Processing collected data', duration: 1500 },
            { agent: 'Generator', action: 'Creating solution framework', duration: 2500 },
            { agent: 'Reviewer', action: 'Validating and refining output', duration: 1000 }
        ];

        this.executionSteps = steps;
        this.currentStepIndex = 0;

        const executeStep = (stepIndex) => {
            if (stepIndex >= steps.length) {
                this.completeTask();
                return;
            }

            const step = steps[stepIndex];
            this.currentStepIndex = stepIndex;

            // Update current agent
            this.currentAgentName.textContent = step.agent;

            // Add log entry
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                <span class="log-agent">${step.agent}</span>
                <span class="log-action">${step.action}</span>
            `;
            this.executionLog.appendChild(logEntry);
            this.executionLog.scrollTop = this.executionLog.scrollHeight;

            // Update progress
            const progress = ((stepIndex + 1) / steps.length) * 100;
            this.progressFill.style.width = `${progress}%`;

            // Highlight active agent
            this.highlightActiveAgent(step.agent);

            // Schedule next step
            setTimeout(() => {
                executeStep(stepIndex + 1);
            }, step.duration);
        };

        executeStep(0);
    }

    highlightActiveAgent(agentName) {
        // Remove previous highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });

        // Find and highlight current agent
        const agentData = window.dataModels.agentsData.find(agent => agent.name === agentName);
        if (agentData) {
            const agentCard = document.getElementById(`agent-${agentData.id}`);
            if (agentCard) {
                agentCard.classList.add('agent-active');
            }
        }
    }

    completeTask() {
        const executionTime = Date.now() - this.currentTask.startTime;
        
        this.taskResults = {
            finalOutput: `Task completed successfully: "${this.currentTask.description}"\n\nThe task has been processed through our multi-agent workflow involving coordination, research, analysis, generation, and review phases. Each agent contributed their specialized capabilities to deliver a comprehensive solution.`,
            agentOutputs: this.executionSteps.map((step, index) => ({
                agent: step.agent,
                action: step.action,
                output: `${step.agent} completed: ${step.action}`,
                timestamp: new Date(this.currentTask.startTime + (index * 1000)).toISOString()
            })),
            executionTime: executionTime,
            tokensUsed: Math.floor(Math.random() * 5000) + 1000
        };

        // Update UI
        this.taskStatusText.textContent = 'Task completed successfully';
        this.currentAgentName.textContent = 'Completed';
        this.progressFill.style.width = '100%';
        this.runTaskBtn.disabled = false;
        this.clearTaskBtn.disabled = false;
        this.pauseExecutionBtn.disabled = true;
        this.isTaskRunning = false;

        // Remove agent highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });

        // Show results
        this.displayResults();
    }

    displayResults() {
        // Populate final output
        this.finalOutputContent.textContent = this.taskResults.finalOutput;

        // Populate intermediate results
        this.intermediateResultsContent.innerHTML = '';
        this.taskResults.agentOutputs.forEach(output => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'intermediate-result';
            resultDiv.innerHTML = `
                <div class="result-header">
                    <span class="result-agent">${output.agent}</span>
                    <span class="result-timestamp">${new Date(output.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="result-content">${output.output}</div>
            `;
            this.intermediateResultsContent.appendChild(resultDiv);
        });

        // Show results panel with slide-up animation
        this.resultsPanel.style.display = 'block';
        setTimeout(() => {
            this.resultsPanel.classList.add('show');
        }, 10);
    }

    clearTask() {
        this.taskDescription.value = '';
        this.taskStatusText.textContent = 'Enter a task description';
        this.executionProgress.style.display = 'none';
        this.progressFill.style.width = '0%';
        this.executionLog.innerHTML = '';
        this.currentAgentName.textContent = '';
        this.runTaskBtn.disabled = true;

        // Remove agent highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });
    }

    pauseExecution() {
        // TODO: Implement pause functionality
        console.log('Pause execution requested');
    }

    exportResults() {
        if (!this.taskResults.finalOutput) {
            alert('No results to export');
            return;
        }

        const exportData = {
            task: this.currentTask.description,
            executionTime: this.taskResults.executionTime,
            tokensUsed: this.taskResults.tokensUsed,
            finalOutput: this.taskResults.finalOutput,
            agentOutputs: this.taskResults.agentOutputs,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-results-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    clearResults() {
        this.taskResults = {
            finalOutput: '',
            agentOutputs: [],
            executionTime: 0,
            tokensUsed: 0
        };
        this.finalOutputContent.textContent = '';
        this.intermediateResultsContent.innerHTML = '';
    }

    hideResults() {
        this.resultsPanel.classList.remove('show');
        setTimeout(() => {
            this.resultsPanel.style.display = 'none';
        }, 300);
    }

    // WebSocket message handlers
    handleTaskProgress(data) {
        // Handle real task progress updates from WebSocket
        console.log('Task progress:', data);
    }

    handleTaskComplete(data) {
        // Handle task completion from WebSocket
        console.log('Task complete:', data);
    }

    handleTaskError(data) {
        // Handle task execution errors
        console.log('Task error:', data);
        this.taskStatusText.textContent = `Error: ${data.message}`;
        this.isTaskRunning = false;
        this.runTaskBtn.disabled = false;
        this.pauseExecutionBtn.disabled = true;
    }
}

// Export for global use
window.TaskExecutor = TaskExecutor;
