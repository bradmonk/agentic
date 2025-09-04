// Task Execution functionality - Step 3 extraction

function runTask() {
    const taskDescription = document.getElementById('task-description');
    const runTaskBtn = document.getElementById('run-task');
    const taskStatusText = document.getElementById('task-status-text');
    const executionProgress = document.getElementById('execution-progress');
    
    const task = taskDescription.value.trim();
    if (!task || window.isTaskRunning) return;

    // Start task execution
    window.isTaskRunning = true;
    window.currentTask = task;
    window.taskExecutionId = Date.now().toString();
    window.executionSteps = [];
    window.currentStepIndex = 0;
    
    // Update UI
    runTaskBtn.querySelector('.btn-text').style.display = 'none';
    runTaskBtn.querySelector('.btn-loading').style.display = 'inline';
    runTaskBtn.disabled = true;
    taskStatusText.textContent = 'Running...';
    
    // Show execution progress
    executionProgress.style.display = 'block';
    updateProgress(0, 'Initializing workflow...');
    
    // Clear previous results
    clearResults();
    
    // Send task to backend if connected
    if (window.sendMessage) {
        window.sendMessage('run_task', {
            task: task,
            executionId: window.taskExecutionId,
            agents: window.agentsData.map(agent => ({
                id: agent.id,
                name: agent.name,
                prompt: agent.prompt,
                tools: agent.interactions
            })),
            tools: window.toolsData.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description
            }))
        });
    }
    
    // Simulate execution steps for demo
    simulateTaskExecution();
}

function simulateTaskExecution() {
    const steps = [
        { agent: 'Vision Agent', action: 'Analyzing task requirements and gathering initial preferences' },
        { agent: 'Vendor Agent', action: 'Searching for suitable vendors and venues' },
        { agent: 'Budget Agent', action: 'Calculating costs and analyzing budget constraints' },
        { agent: 'Schedule Agent', action: 'Creating timeline and coordinating schedules' },
        { agent: 'Vision Agent', action: 'Compiling final recommendations and summary' }
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex >= steps.length || !window.isTaskRunning) {
            clearInterval(stepInterval);
            if (window.isTaskRunning) {
                completeTaskExecution();
            }
            return;
        }
        
        const step = steps[stepIndex];
        addExecutionStep(step.agent, step.action);
        updateProgress(((stepIndex + 1) / steps.length) * 100, `${step.agent}: ${step.action}`);
        
        stepIndex++;
    }, 2000); // 2 seconds per step
}

function addExecutionStep(agentName, action) {
    const executionLog = document.getElementById('execution-log');
    const timestamp = new Date().toLocaleTimeString();
    const stepElement = document.createElement('div');
    stepElement.className = 'execution-step';
    stepElement.innerHTML = `
        <span class="step-timestamp">${timestamp}</span>
        <span class="step-agent">${agentName}</span>
        <span class="step-action">${action}</span>
    `;
    
    executionLog.appendChild(stepElement);
    executionLog.scrollTop = executionLog.scrollHeight;
    
    // Highlight current agent
    highlightActiveAgent(agentName);
}

function highlightActiveAgent(agentName) {
    // Remove previous highlights
    document.querySelectorAll('.agent-card').forEach(card => {
        card.classList.remove('agent-active');
    });
    
    // Highlight current agent
    const activeAgent = window.agentsData.find(agent => agent.name === agentName);
    if (activeAgent) {
        const agentCard = document.getElementById(activeAgent.id);
        if (agentCard) {
            agentCard.classList.add('agent-active');
        }
    }
}

function updateProgress(percentage, currentAction) {
    const progressFill = document.getElementById('progress-fill');
    const currentAgentName = document.getElementById('current-agent-name');
    progressFill.style.width = `${percentage}%`;
    currentAgentName.textContent = currentAction;
}

function completeTaskExecution() {
    // Generate mock results
    window.taskResults = {
        finalOutput: generateMockResults(),
        agentOutputs: window.executionSteps,
        executionTime: Date.now() - parseInt(window.taskExecutionId),
        tokensUsed: Math.floor(Math.random() * 5000) + 1000
    };
    
    // Update UI
    const runTaskBtn = document.getElementById('run-task');
    const taskStatusText = document.getElementById('task-status-text');
    
    window.isTaskRunning = false;
    runTaskBtn.querySelector('.btn-text').style.display = 'inline';
    runTaskBtn.querySelector('.btn-loading').style.display = 'none';
    runTaskBtn.disabled = false;
    taskStatusText.textContent = 'Task completed successfully';
    
    // Remove agent highlights
    document.querySelectorAll('.agent-card').forEach(card => {
        card.classList.remove('agent-active');
    });
    
    // Show results
    displayResults();
}

function generateMockResults() {
    return `Task execution completed successfully!\n\nThe multi-agent system has processed your request through the following workflow:\n\n1. Initial analysis and requirement gathering\n2. Research and data collection\n3. Budget analysis and constraint evaluation\n4. Timeline creation and schedule coordination\n5. Final compilation and recommendations\n\nEach agent contributed specialized expertise to deliver comprehensive results. The execution involved ${window.executionSteps.length} distinct processing steps with seamless coordination between agents.\n\nFor detailed breakdown, see the intermediate results below.`;
}

function displayResults() {
    const resultsPanel = document.getElementById('results-panel');
    const finalOutputContent = document.getElementById('final-output-content');
    const intermediateResultsContent = document.getElementById('intermediate-results-content');
    
    // Show final output
    finalOutputContent.textContent = window.taskResults.finalOutput;
    
    // Show intermediate results
    intermediateResultsContent.innerHTML = '';
    window.taskResults.agentOutputs.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'result-step';
        stepDiv.innerHTML = `
            <h4>${step.agent}</h4>
            <p>${step.action}</p>
            <small>Completed at ${step.timestamp}</small>
        `;
        intermediateResultsContent.appendChild(stepDiv);
    });
    
    // Show results panel
    resultsPanel.style.display = 'block';
}

function clearTask() {
    const taskDescription = document.getElementById('task-description');
    const taskStatusText = document.getElementById('task-status-text');
    const runTaskBtn = document.getElementById('run-task');
    
    if (window.isTaskRunning) {
        if (confirm('Are you sure you want to stop the current task?')) {
            stopTaskExecution();
        }
        return;
    }
    
    taskDescription.value = '';
    taskStatusText.textContent = 'Enter a task description';
    runTaskBtn.disabled = true;
    hideExecutionProgress();
    hideResults();
}

function stopTaskExecution() {
    const runTaskBtn = document.getElementById('run-task');
    const taskStatusText = document.getElementById('task-status-text');
    
    window.isTaskRunning = false;
    runTaskBtn.querySelector('.btn-text').style.display = 'inline';
    runTaskBtn.querySelector('.btn-loading').style.display = 'none';
    runTaskBtn.disabled = false;
    taskStatusText.textContent = 'Task stopped';
    
    // Remove agent highlights
    document.querySelectorAll('.agent-card').forEach(card => {
        card.classList.remove('agent-active');
    });
}

function pauseExecution() {
    // TODO: Implement pause functionality
    alert('Pause functionality will be implemented in the next version');
}

function exportResults() {
    if (!window.taskResults || !window.taskResults.finalOutput) return;
    
    const exportData = {
        task: window.currentTask,
        timestamp: new Date().toISOString(),
        results: window.taskResults,
        configuration: {
            agents: window.agentsData.map(agent => ({
                name: agent.name,
                prompt: agent.prompt,
                tools: agent.interactions
            })),
            tools: window.toolsData.map(tool => ({
                name: tool.name,
                description: tool.description
            }))
        }
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

function clearResults() {
    const finalOutputContent = document.getElementById('final-output-content');
    const intermediateResultsContent = document.getElementById('intermediate-results-content');
    
    window.taskResults = {
        finalOutput: '',
        agentOutputs: [],
        executionTime: 0,
        tokensUsed: 0
    };
    finalOutputContent.textContent = '';
    intermediateResultsContent.innerHTML = '';
}

function hideResults() {
    const resultsPanel = document.getElementById('results-panel');
    resultsPanel.style.display = 'none';
}

function hideExecutionProgress() {
    const executionProgress = document.getElementById('execution-progress');
    executionProgress.style.display = 'none';
    const progressFill = document.getElementById('progress-fill');
    const currentAgentName = document.getElementById('current-agent-name');
    progressFill.style.width = '0%';
    currentAgentName.textContent = '';
}

// Make functions globally available
window.runTask = runTask;
window.simulateTaskExecution = simulateTaskExecution;
window.addExecutionStep = addExecutionStep;
window.highlightActiveAgent = highlightActiveAgent;
window.updateProgress = updateProgress;
window.completeTaskExecution = completeTaskExecution;
window.generateMockResults = generateMockResults;
window.displayResults = displayResults;
window.clearTask = clearTask;
window.stopTaskExecution = stopTaskExecution;
window.pauseExecution = pauseExecution;
window.exportResults = exportResults;
window.clearResults = clearResults;
window.hideResults = hideResults;
window.hideExecutionProgress = hideExecutionProgress;
