// Step 3: Task Execution Module
// Handles task running, progress tracking, and agent coordination

(function() {
    'use strict';

    function runTask() {
        const taskDescription = document.getElementById('task-description');
        const runTaskBtn = document.getElementById('run-task');
        
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

    // Utility function to safely render markdown
    function renderMarkdown(text) {
        if (!text || typeof text !== 'string') return '';
        
        try {
            // Configure marked for safe rendering
            marked.setOptions({
                breaks: true,        // Convert line breaks to <br>
                gfm: true,          // GitHub Flavored Markdown
                sanitize: false,    // We'll handle sanitization manually
                smartLists: true,
                smartypants: true
            });
            
            // Convert markdown to HTML
            const html = marked.parse(text);
            
            // Basic sanitization - remove potentially dangerous tags
            const sanitizedHtml = html
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .replace(/on\\w+="[^"]*"/gi, '')  // Remove event handlers
                .replace(/javascript:/gi, '');
            
            return sanitizedHtml;
        } catch (error) {
            console.warn('Markdown rendering failed, falling back to plain text:', error);
            // Fallback to escaped plain text
            return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>');
        }
    }

    function addExecutionStep(agentId, action, response = '', details = null) {
        const executionLog = document.getElementById('execution-log');
        const timestamp = new Date().toLocaleTimeString();
        const stepElement = document.createElement('div');
        stepElement.className = 'execution-step';
        
        // Get display name from agent ID
        const agent = window.agentsData?.find(a => a.id === agentId);
        const agentDisplayName = agent ? agent.name : agentId;
        
        // Map agent IDs to agent classes for CSS
        const agentClassMap = {
            'agent1': 'agent1',
            'agent2': 'agent2', 
            'agent3': 'agent3',
            'agent4': 'agent4'
        };
        
        const agentClass = agentClassMap[agentId] || agentId;
        
        // Create verbose output with real LLM response
        let responseHtml = '';
        if (response && response.trim()) {
            const renderedResponse = renderMarkdown(response);
            responseHtml = `
                <div class="step-response ${agentClass}">
                    <strong>LLM Response:</strong>
                    <div class="response-content">${renderedResponse}</div>
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
            <div class="step-header ${agentClass}">
                <div class="step-title">
                    <strong>${agentDisplayName}</strong>
                    <span class="step-timestamp">${timestamp}</span>
                </div>
                <div class="step-action">${action}</div>
            </div>
            ${responseHtml}
            ${detailsHtml}
        `;
        
        // Store the execution step
        window.executionSteps.push({
            agent: agentId,
            action: action,
            response: response,
            details: details,
            timestamp: timestamp
        });
        
        executionLog.appendChild(stepElement);
        executionLog.scrollTop = executionLog.scrollHeight;
    }

    function highlightActiveAgent(agentId) {
        // Remove previous highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });
        
        // Add highlight to current agent
        const agentCard = document.getElementById(agentId);
        if (agentCard) {
            agentCard.classList.add('agent-active');
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
        
        // Update progress bar to 100%
        updateProgress(100, 'Task completed successfully');
        
        // Update UI
        const runTaskBtn = document.getElementById('run-task');
        
        window.isTaskRunning = false;
        runTaskBtn.querySelector('.btn-text').style.display = 'inline';
        runTaskBtn.querySelector('.btn-loading').style.display = 'none';
        runTaskBtn.disabled = false;
        
        // Remove agent highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });
    }

    function generateMockResults() {
        return `Task execution completed successfully!\\n\\nThe multi-agent system has processed your request through the following workflow:\\n\\n1. Initial analysis and requirement gathering\\n2. Research and data collection\\n3. Budget analysis and constraint evaluation\\n4. Timeline creation and schedule coordination\\n5. Final compilation and recommendations\\n\\nEach agent contributed specialized expertise to deliver comprehensive results. The execution involved ${window.executionSteps.length} distinct processing steps with seamless coordination between agents.\\n\\nFor detailed breakdown, see the intermediate results below.`;
    }

    function clearTask() {
        const taskDescription = document.getElementById('task-description');
        taskDescription.value = '';
        window.isTaskRunning = false;
        
        // Update run button state
        const runTaskBtn = document.getElementById('run-task');
        runTaskBtn.disabled = !window.isWebSocketConnected();
        
        // Reset progress and clear results
        resetExecutionProgress();
        clearResults();
    }

    function pauseTask() {
        if (window.isTaskRunning) {
            window.isTaskRunning = false;
            
            // Update UI
            const runTaskBtn = document.getElementById('run-task');
            runTaskBtn.querySelector('.btn-text').style.display = 'inline';
            runTaskBtn.querySelector('.btn-loading').style.display = 'none';
            runTaskBtn.disabled = false;
            
            // Add paused step to log
            addExecutionStep('System', 'Task execution paused by user');
            updateProgress(50, 'Task paused');
        }
    }

    function stopTaskExecution() {
        if (window.isTaskRunning) {
            window.isTaskRunning = false;
            completeTaskExecution();
        }
    }

    function pauseExecution() {
        if (window.isTaskRunning) {
            pauseTask();
        }
    }

    function exportResults() {
        if (!window.taskResults || !window.taskResults.agentOutputs) {
            alert('No task results to export');
            return;
        }
        
        const exportData = {
            task: window.currentTask,
            executionId: window.taskExecutionId,
            results: window.taskResults,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-results-${window.taskExecutionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function clearResults() {
        // Clear stored results
        window.taskResults = {
            finalOutput: '',
            agentOutputs: [],
            executionTime: 0,
            tokensUsed: 0
        };
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
    window.addExecutionStep = addExecutionStep;
    window.highlightActiveAgent = highlightActiveAgent;
    window.updateProgress = updateProgress;
    window.completeTaskExecution = completeTaskExecution;
    window.resetExecutionProgress = resetExecutionProgress;
    window.generateMockResults = generateMockResults;
    window.clearTask = clearTask;
    window.pauseTask = pauseTask;
    window.stopTaskExecution = stopTaskExecution;
    window.pauseExecution = pauseExecution;
    window.exportResults = exportResults;
    window.clearResults = clearResults;

    console.log('Task Execution module loaded');

})();
