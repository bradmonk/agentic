// Task Execution functionality - Step 3 extraction

function runTask() {
    const taskDescription = document.getElementById('task-description');
    const runTaskBtn = document.getElementById('run-task');
    const taskStatusText = document.getElementById('task-status-text');
    
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
    
    // Initialize progress
    updateProgress(0, 'Initializing workflow...');
    
    // Clear previous results
    clearResults();
    
    // Send task to backend for real LLM processing
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
    } else {
        // Fallback if no backend connection
        addExecutionStep('System', 'No backend connection available', 'Please check WebSocket connection');
        completeTaskExecution();
    }
}

function simulateTaskExecution() {
    const steps = [
        { 
            agent: 'Vision Agent', 
            action: 'Analyzing task requirements and gathering initial preferences',
            details: {
                'Input Analysis': 'Parsed task description and identified key objectives',
                'Stakeholder Requirements': 'Business goals, user needs, technical constraints',
                'Initial Assessment': 'Project scope and complexity evaluation',
                'Success Criteria': 'Clear deliverables and acceptance criteria defined',
                'Risk Factors': 'Timeline, budget, and technical risk assessment'
            }
        },
        { 
            agent: 'Vendor Agent', 
            action: 'Searching for suitable vendors and venues',
            details: {
                'Market Research': 'Identified 15 potential vendors in target categories',
                'Vendor Evaluation': 'Assessed capabilities, pricing, and reliability scores',
                'Qualification Criteria': 'Quality standards, delivery timeline, cost efficiency',
                'Shortlist Created': 'Top 5 vendors selected for detailed proposal requests',
                'Compliance Check': 'Verified certifications and regulatory requirements'
            }
        },
        { 
            agent: 'Budget Agent', 
            action: 'Calculating costs and analyzing budget constraints',
            details: {
                'Cost Breakdown': 'Materials: $25,000, Labor: $45,000, Overhead: $12,000',
                'Budget Analysis': 'Total project cost: $82,000 (within $90,000 limit)',
                'Contingency Fund': '10% buffer allocated for unexpected expenses',
                'Payment Schedule': 'Milestone-based payments to optimize cash flow',
                'ROI Projection': 'Expected 23% return on investment within 18 months'
            }
        },
        { 
            agent: 'Schedule Agent', 
            action: 'Creating timeline and coordinating schedules',
            details: {
                'Project Timeline': '12-week execution plan with defined milestones',
                'Phase 1 (Weeks 1-3)': 'Planning, vendor selection, contract finalization',
                'Phase 2 (Weeks 4-8)': 'Implementation, development, and initial testing',
                'Phase 3 (Weeks 9-12)': 'Final testing, deployment, and handover',
                'Critical Path': 'Vendor approval → Resource allocation → Implementation',
                'Resource Coordination': 'Team schedules aligned with project milestones'
            }
        },
        { 
            agent: 'Vision Agent', 
            action: 'Compiling final recommendations and summary',
            details: {
                'Project Feasibility': 'HIGH - All requirements achievable within constraints',
                'Recommended Vendor': 'TechSolutions Inc. - Best value and reliability score',
                'Implementation Strategy': 'Phased approach with weekly progress reviews',
                'Success Probability': '87% based on historical data and current resources',
                'Key Deliverables': 'Full system deployment, documentation, training materials',
                'Final Recommendation': 'Proceed with project - strong business case confirmed'
            }
        }
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
        addExecutionStep(step.agent, step.action, step.details);
        updateProgress(((stepIndex + 1) / steps.length) * 100, `${step.agent}: ${step.action}`);
        
        stepIndex++;
    }, 3000); // 3 seconds per step to allow reading the details
}

function addExecutionStep(agentName, action, response = '', details = null) {
    const executionLog = document.getElementById('execution-log');
    const timestamp = new Date().toLocaleTimeString();
    const stepElement = document.createElement('div');
    stepElement.className = 'execution-step';
    
    // Map agent names to agent IDs for CSS classes
    const agentClassMap = {
        'Vision Agent': 'agent-vision',
        'Vendor Agent': 'agent-vendor', 
        'Budget Agent': 'agent-budget',
        'Schedule Agent': 'agent-schedule'
    };
    
    const agentClass = agentClassMap[agentName] || '';
    
    // Create verbose output with real LLM response
    let responseHtml = '';
    if (response && response.trim()) {
        responseHtml = `
            <div class="step-response ${agentClass}">
                <strong>LLM Response:</strong>
                <div class="response-content">${response}</div>
            </div>
        `;
    }
    
    let detailsHtml = '';
    if (details) {
        detailsHtml = `
            <div class="step-details ${agentClass}">
                ${typeof details === 'object' ? 
                    Object.entries(details).map(([key, value]) => 
                        `<div class="detail-item"><strong>${key}:</strong> ${value}</div>`
                    ).join('') : 
                    `<div class="detail-content">${details}</div>`
                }
            </div>
        `;
    }
    
    stepElement.innerHTML = `
        <div class="step-header">
            <span class="step-timestamp">${timestamp}</span>
            <span class="step-agent ${agentClass}">${agentName}</span>
        </div>
        <div class="step-action">${action}</div>
        ${responseHtml}
        ${detailsHtml}
    `;
    
    executionLog.appendChild(stepElement);
    executionLog.scrollTop = executionLog.scrollHeight;
    
    // Store detailed step info
    if (window.executionSteps) {
        window.executionSteps.push({
            timestamp,
            agent: agentName,
            action,
            response,
            details,
            id: window.executionSteps.length
        });
    }
    
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
    
    // Results panel removed - task completion shows only in progress blackboard
}

function generateMockResults() {
    return `Task execution completed successfully!\n\nThe multi-agent system has processed your request through the following workflow:\n\n1. Initial analysis and requirement gathering\n2. Research and data collection\n3. Budget analysis and constraint evaluation\n4. Timeline creation and schedule coordination\n5. Final compilation and recommendations\n\nEach agent contributed specialized expertise to deliver comprehensive results. The execution involved ${window.executionSteps.length} distinct processing steps with seamless coordination between agents.\n\nFor detailed breakdown, see the intermediate results below.`;
}

// Results panel functionality removed - task completion now shows only in progress blackboard
// function displayResults() {
//     const resultsPanel = document.getElementById('results-panel');
//     const finalOutputContent = document.getElementById('final-output-content');
//     const intermediateResultsContent = document.getElementById('intermediate-results-content');
//     
//     // Show final output
//     finalOutputContent.textContent = window.taskResults.finalOutput;
//     
//     // Show intermediate results
//     intermediateResultsContent.innerHTML = '';
//     window.taskResults.agentOutputs.forEach(step => {
//         const stepDiv = document.createElement('div');
//         stepDiv.className = 'result-step';
//         stepDiv.innerHTML = `
//             <h4>${step.agent}</h4>
//             <p>${step.action}</p>
//             <small>Completed at ${step.timestamp}</small>
//         `;
//         intermediateResultsContent.appendChild(stepDiv);
//     });
//     
//     // Show results panel
//     resultsPanel.style.display = 'block';
// }

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
    resetExecutionProgress();
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
    // Results panel elements may not exist since panel was removed
    const finalOutputContent = document.getElementById('final-output-content');
    const intermediateResultsContent = document.getElementById('intermediate-results-content');
    
    window.taskResults = {
        finalOutput: '',
        agentOutputs: [],
        executionTime: 0,
        tokensUsed: 0
    };
    
    // Only update elements if they exist
    if (finalOutputContent) {
        finalOutputContent.textContent = '';
    }
    if (intermediateResultsContent) {
        intermediateResultsContent.innerHTML = '';
    }
}

function hideResults() {
    // Results panel may not exist since it was removed
    const resultsPanel = document.getElementById('results-panel');
    if (resultsPanel) {
        resultsPanel.style.display = 'none';
    }
}

function resetExecutionProgress() {
    const progressFill = document.getElementById('progress-fill');
    const currentAgentName = document.getElementById('current-agent-name');
    progressFill.style.width = '0%';
    currentAgentName.textContent = 'Ready';
    
    // Clear execution log
    const executionLog = document.getElementById('execution-log');
    if (executionLog) {
        executionLog.innerHTML = `
            <div class="welcome-message">
                💬 <strong>Progress Blackboard</strong><br>
                Real-time agent interactions and progress will appear here...<br>
                <em>Start a task to see detailed execution steps</em>
            </div>
        `;
    }
}

// Make functions globally available
window.runTask = runTask;
window.simulateTaskExecution = simulateTaskExecution;
window.addExecutionStep = addExecutionStep;
window.highlightActiveAgent = highlightActiveAgent;
window.updateProgress = updateProgress;
window.completeTaskExecution = completeTaskExecution;
window.resetExecutionProgress = resetExecutionProgress;
window.generateMockResults = generateMockResults;
window.displayResults = displayResults;
window.clearTask = clearTask;
window.stopTaskExecution = stopTaskExecution;
window.pauseExecution = pauseExecution;
window.exportResults = exportResults;
window.clearResults = clearResults;
window.hideResults = hideResults;
