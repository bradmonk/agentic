document.addEventListener('DOMContentLoaded', () => {
    const agentsContainer = document.getElementById('agents-container');
    const toolsContainer = document.getElementById('tools-container');
    const blackboard = document.getElementById('blackboard');
    const connectionStatus = document.getElementById('connection-status');
    const llmProvider = document.getElementById('llm-provider');
    const modelName = document.getElementById('model-name');
    const startWorkflowBtn = document.getElementById('start-workflow');
    const stopWorkflowBtn = document.getElementById('stop-workflow');
    const connectionsSvg = document.getElementById('connections-container');

    let agents = {};
    let tools = {};
    let ws = null;
    let isWorkflowRunning = false;
    let agentsData = [];
    let toolsData = [];
    let eventListenersSetup = false; // Flag to prevent duplicate event listeners

    // Task execution elements
    const taskDescription = document.getElementById('task-description');
    const runTaskBtn = document.getElementById('run-task');
    const clearTaskBtn = document.getElementById('clear-task');
    const taskStatusText = document.getElementById('task-status-text');
    const executionProgress = document.getElementById('execution-progress');
    const currentAgentName = document.getElementById('current-agent-name');
    const progressFill = document.getElementById('progress-fill');
    const executionLog = document.getElementById('execution-log');
    const pauseExecutionBtn = document.getElementById('pause-execution');
    const resultsPanel = document.getElementById('results-panel');
    const finalOutputContent = document.getElementById('final-output-content');
    const intermediateResultsContent = document.getElementById('intermediate-results-content');
    const exportResultsBtn = document.getElementById('export-results');
    const clearResultsBtn = document.getElementById('clear-results');
    const closeResultsBtn = document.getElementById('close-results');

    // Task execution state
    let currentTask = null;
    let taskExecutionId = null;
    let executionSteps = [];
    let currentStepIndex = 0;
    let isTaskRunning = false;
    let taskResults = {
        finalOutput: '',
        agentOutputs: [],
        executionTime: 0,
        tokensUsed: 0
    };

    // Model configurations
    const modelConfigs = {
        openai: [
            { value: 'gpt-4', text: 'GPT-4' },
            { value: 'gpt-4-turbo', text: 'GPT-4 Turbo' },
            { value: 'gpt-3.5-turbo', text: 'GPT-3.5 Turbo' }
        ],
        ollama: [
            { value: 'llama3.1', text: 'Llama 3.1' },
            { value: 'llama3.1:8b', text: 'Llama 3.1 8B' },
            { value: 'llama3.1:70b', text: 'Llama 3.1 70B' },
            { value: 'mistral', text: 'Mistral' },
            { value: 'codellama', text: 'Code Llama' }
        ]
    };

    function updateModelOptions() {
        const provider = llmProvider.value;
        const models = modelConfigs[provider];
        
        modelName.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.text;
            modelName.appendChild(option);
        });
    }

    function updateConnectionStatus(status) {
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
            connectionStatus.textContent = 'Connected';
            connectionStatus.className = 'status-connected';
            
            // Enable task execution if task is entered
            const hasTask = taskDescription.value.trim().length > 0;
            runTaskBtn.disabled = !hasTask || isTaskRunning;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
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

    function handleMessage(data) {
        switch (data.type) {
            case 'init':
                initializeUI(data.payload);
                break;
            case 'agent_update':
                updateAgentCard(data.payload.name, data.payload);
                break;
            case 'tool_update':
                updateToolCard(data.payload.name, data.payload);
                break;
            case 'blackboard_update':
                updateBlackboard(data.payload);
                break;
            case 'workflow_status':
                updateWorkflowStatus(data.payload);
                break;
        }
    }

    function initializeUI(payload) {
        // Always use sample data for demo purposes
        initializeSampleData();
        return;
        
        // Server data initialization (disabled for demo)
        if (!payload) {
            initializeSampleData();
            return;
        }

        // Clear existing content
        agentsContainer.innerHTML = '';
        toolsContainer.innerHTML = '';

        payload.agents.forEach(agentData => {
            const agent = createAgentCard(agentData);
            agentsContainer.appendChild(agent);
            agents[agentData.id] = agent;
        });

        payload.tools.forEach(toolData => {
            const tool = createToolCard(toolData);
            toolsContainer.appendChild(tool);
            tools[toolData.id] = tool;
        });

        drawConnections();
    }

    function initializeSampleData() {
        // Agentic AI Tutorial - Sample agents data (editable names and workflows)
        console.log('Setting up agents and tools data...');
        agentsData = [
            {
                id: 'agent-1',
                name: 'Vision Agent',
                status: 'idle',
                prompt: 'You elicit wedding preferences including theme, style, guest count, budget constraints, and special requirements from couples.',
                context: 'Ready to understand your dream wedding vision and preferences.',
                interactions: ['web-search', 'image-generator'],
                borderColor: '#e91e63'
            },
            {
                id: 'agent-2', 
                name: 'Vendor Agent',
                status: 'idle',
                prompt: 'You search and evaluate wedding vendors including venues, caterers, photographers, florists, and entertainment options.',
                context: 'Ready to find and recommend the perfect vendors for your wedding.',
                interactions: ['web-search', 'calculator'],
                borderColor: '#2196f3'
            },
            {
                id: 'agent-3',
                name: 'Budget Agent', 
                status: 'idle',
                prompt: 'You analyze wedding costs against budget constraints and suggest smart tradeoffs and cost-saving alternatives.',
                context: 'Ready to help optimize your wedding budget and expenses.',
                interactions: ['calculator'],
                borderColor: '#4caf50'
            },
            {
                id: 'agent-4',
                name: 'Schedule Agent', 
                status: 'idle',
                prompt: 'You create detailed wedding day timelines and manage lead-up planning tasks and vendor coordination schedules.',
                context: 'Ready to organize your wedding timeline and task management.',
                interactions: ['calendar', 'weather-forecast'],
                borderColor: '#ff9800'
            }
        ];
        
        // Wedding Planning Concierge - Tools data (5 tools)
        toolsData = [
            {
                id: 'web-search',
                name: 'Web Search & Scrape',
                description: 'Search and extract information from wedding vendor websites',
                inputs: ['search_query', 'location', 'budget_range'],
                outputs: ['vendor_listings', 'reviews', 'contact_info']
            },
            {
                id: 'calculator',
                name: 'Calculator',
                description: 'Perform budget calculations and cost analysis',
                inputs: ['amounts', 'operation', 'tax_rate'],
                outputs: ['total_cost', 'breakdown', 'recommendations']
            },
            {
                id: 'calendar',
                name: 'Calendar',
                description: 'Manage wedding timeline and scheduling tasks',
                inputs: ['event_date', 'tasks', 'deadlines'],
                outputs: ['schedule', 'reminders', 'timeline']
            },
            {
                id: 'weather-forecast',
                name: 'Weather Forecast',
                description: 'Get weather predictions for wedding planning',
                inputs: ['location', 'date', 'time_range'],
                outputs: ['forecast', 'temperature', 'precipitation']
            },
            {
                id: 'image-generator',
                name: 'Image Generator',
                description: 'Create visual inspiration and mood boards',
                inputs: ['style_description', 'color_palette', 'theme'],
                outputs: ['inspiration_images', 'mood_board', 'visual_concepts']
            }
        ];
        
        // Render agents and tools
        console.log('Containers exist?', 'agents:', !!agentsContainer, 'tools:', !!toolsContainer);
        console.log('Data arrays length:', 'agents:', agentsData.length, 'tools:', toolsData.length);
        renderAgents();
        renderTools();
        
        
        // Draw connections
        setTimeout(() => {
            drawConnections();
            // Add scroll event listener after DOM is ready
            const workflowCanvas = document.querySelector('.workflow-canvas');
            if (workflowCanvas) {
                workflowCanvas.addEventListener('scroll', () => {
                    drawConnections();
                });
            }
            // Add event listeners for prompt editing
            setupPromptEditing();
        }, 100); // Allow DOM to update
    }

    function renderAgents() {
        agentsContainer.innerHTML = '';
        agentsData.forEach((agentData, index) => {
            const agent = createAgentCard(agentData);
            agent.style.top = `${index * (200 + 20)}px`; // card height + spacing
            agentsContainer.appendChild(agent);
            agents[agentData.id] = agent;
        });
    }

    function renderTools() {
        toolsContainer.innerHTML = '';
        toolsData.forEach((toolData, index) => {
            const tool = createToolCard(toolData);
            tool.style.top = `${index * (140 + 20)}px`; // card height + spacing
            toolsContainer.appendChild(tool);
            tools[toolData.id] = tool;
        });
    }

    function createAgentCard(agentData) {
        const card = document.createElement('div');
        card.className = 'card agent-card';
        card.id = agentData.id;
        card.style.borderColor = agentData.borderColor;
        
        // Create toggle buttons for all tools
        const toolToggles = toolsData.map(tool => {
            const isActive = agentData.interactions.includes(tool.id);
            return `<button class="tool-toggle ${isActive ? 'active' : ''}" 
                           data-agent-id="${agentData.id}" 
                           data-tool-id="${tool.id}"
                           data-agent-color="${agentData.borderColor}">
                        ${tool.name}
                    </button>`;
        }).join('');
        
        card.innerHTML = `
            <h3 class="agent-name-container">
                <span class="agent-name-editable" 
                      contenteditable="true" 
                      data-agent-id="${agentData.id}"
                      spellcheck="false">${agentData.name}</span>
            </h3>
            <p class="context-window-label">System Prompt:</p>
            <div class="system-prompt-container">
                <textarea class="system-prompt-editor" data-agent-id="${agentData.id}" rows="3">${agentData.prompt}</textarea>
                <button class="save-prompt-btn" data-agent-id="${agentData.id}">Save</button>
            </div>
            <p class="context-window-label">Context Window:</p>
            <div class="context-window">${agentData.context}</div>
            <div class="interactions">
                <div class="interactions-label">Tool Access:</div>
                <div class="tool-toggles">
                    ${toolToggles}
                </div>
            </div>
        `;
        
        // Set custom colors for active buttons
        const toggleButtons = card.querySelectorAll('.tool-toggle.active');
        toggleButtons.forEach(button => {
            button.style.backgroundColor = agentData.borderColor + '20'; // 20% opacity
            button.style.borderColor = agentData.borderColor;
            button.style.color = agentData.borderColor;
        });
        
        return card;
    }

    function createToolCard(toolData) {
        const card = document.createElement('div');
        card.className = 'card tool-card';
        card.id = toolData.id;
        card.innerHTML = `
            <h3>${toolData.name}</h3>
            <div class="tool-description">${toolData.description}</div>
            <div class="io-section">
                <div class="io-label">Inputs:</div>
                <div class="io-list">
                    ${toolData.inputs.map(input => 
                        `<span class="io-item">${input}</span>`
                    ).join('')}
                </div>
            </div>
            <div class="io-section">
                <div class="io-label">Outputs:</div>
                <div class="io-list">
                    ${toolData.outputs.map(output => 
                        `<span class="io-item output">${output}</span>`
                    ).join('')}
                </div>
            </div>
        `;
        return card;
    }

    function drawConnections() {
        if (!connectionsSvg) return;
        
        // Clear existing connections
        connectionsSvg.innerHTML = '';
        
        // Draw connections from each agent to all tools
        agentsData.forEach((agent, agentIndex) => {
            toolsData.forEach((tool, toolIndex) => {
                const isActive = agent.interactions.includes(tool.id);
                drawConnectionLine(agent.id, tool.id, agentIndex, toolIndex, isActive, agent.borderColor);
            });
        });
    }

    function drawConnectionLine(agentId, toolId, agentIndex, toolIndex, isActive, agentColor) {
        const agentCard = document.getElementById(agentId);
        const toolCard = document.getElementById(toolId);
        
        if (!agentCard || !toolCard) return;
        
        // Get positions of the cards
        const agentRect = agentCard.getBoundingClientRect();
        const toolRect = toolCard.getBoundingClientRect();
        const containerRect = connectionsSvg.getBoundingClientRect();
        
        // Calculate offsets for proper line spacing
        const agentLineOffset = toolIndex * 5; // 5px offset per tool coming from agent
        const toolLineOffset = agentIndex * 5; // 5px offset per agent going into tool
        
        // Calculate connection points with offsets
        const startX = agentRect.right - containerRect.left;
        const startY = agentRect.top + (agentRect.height / 2) - containerRect.top + agentLineOffset;
        const endX = toolRect.left - containerRect.left;
        const endY = toolRect.top + (toolRect.height / 2) - containerRect.top + toolLineOffset;
        
        // Create horizontal line from agent (with agent-specific spacing)
        const line = document.createElement('div');
        line.className = `connection-line horizontal ${isActive ? 'active' : ''}`;
        line.style.left = startX + 'px';
        line.style.top = startY + 'px';
        line.style.backgroundColor = isActive ? agentColor : '#ddd';
        line.setAttribute('data-agent', agentId);
        line.setAttribute('data-tool', toolId);
        
        connectionsSvg.appendChild(line);
        
        // Calculate midpoint with unique positioning for each agent-tool combination
        const midX = startX + (endX - startX) / 2 + (agentIndex * toolsData.length + toolIndex) * 5;
        
        // Set the width of the first horizontal line to reach the midpoint
        line.style.width = (midX - startX) + 'px';
        
        // Create vertical line with unique positioning
        const verticalLine = document.createElement('div');
        verticalLine.className = `connection-line vertical ${isActive ? 'active' : ''}`;
        verticalLine.style.left = midX + 'px';
        verticalLine.style.top = Math.min(startY, endY) + 'px';
        verticalLine.style.height = (Math.abs(endY - startY) + 1) + 'px'; // Add 1px to bottom end
        verticalLine.style.backgroundColor = isActive ? agentColor : '#ddd';
        connectionsSvg.appendChild(verticalLine);
        
        // Create horizontal line from midpoint to tool (with tool-specific spacing)
        const horizontalLine2 = document.createElement('div');
        horizontalLine2.className = `connection-line horizontal ${isActive ? 'active' : ''}`;
        horizontalLine2.style.left = midX + 'px';
        horizontalLine2.style.top = endY + 'px';
        horizontalLine2.style.width = (endX - midX) + 'px';
        horizontalLine2.style.backgroundColor = isActive ? agentColor : '#ddd';
        connectionsSvg.appendChild(horizontalLine2);
    }

    function updateAgentCard(agentId, data) {
        const card = agents[agentId];
        if (!card) return;
        
        // Update status class
        card.className = `card agent-card ${data.status}`;
        
        // Update context window
        const contextWindow = card.querySelectorAll('.context-window')[1];
        if (contextWindow && data.context) {
            contextWindow.textContent = data.context;
        }
        
        // Update connections based on status
        updateConnectionsForAgent(agentId, data.status);
    }

    function updateToolCard(toolId, data) {
        const card = tools[toolId];
        if (!card) return;
        
        card.className = `card tool-card ${data.status || ''}`;
    }

    function updateConnectionsForAgent(agentId, status) {
        const connections = connectionsSvg.querySelectorAll(`[data-agent="${agentId}"]`);
        connections.forEach(connection => {
            if (status === 'active') {
                connection.classList.add('active');
            } else if (status === 'connected') {
                connection.classList.add('highlighted');
                connection.classList.remove('active');
            } else {
                connection.classList.remove('active', 'highlighted');
            }
        });
    }

    function updateBlackboard(data) {
        const entry = document.createElement('div');
        entry.className = 'blackboard-entry';
        entry.innerHTML = `
            <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
            <span class="${data.type}-message">${data.source}:</span> ${data.message}
        `;
        blackboard.appendChild(entry);
        blackboard.scrollTop = blackboard.scrollHeight;
    }

    function updateWorkflowStatus(data) {
        isWorkflowRunning = data.running;
        startWorkflowBtn.disabled = isWorkflowRunning;
        stopWorkflowBtn.disabled = !isWorkflowRunning;
    }

    function setupPromptEditing() {
        // Prevent duplicate event listener setup
        if (eventListenersSetup) {
            return;
        }
        eventListenersSetup = true;
        
        // Add event listeners for save buttons and tool toggles
        document.addEventListener('click', (e) => {
            // Handle clicking on agent names to select text for editing
            if (e.target.classList.contains('agent-name-editable')) {
                // Select all text when clicking on the name
                const range = document.createRange();
                range.selectNodeContents(e.target);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                return; // Exit early to avoid other click handlers
            }

            if (e.target.classList.contains('save-prompt-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const textarea = document.querySelector(`.system-prompt-editor[data-agent-id="${agentId}"]`);
                const newPrompt = textarea.value;
                
                // Update the agent data
                const agent = agentsData.find(a => a.id === agentId);
                if (agent) {
                    agent.prompt = newPrompt;
                    
                    // Send update to server if connected
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        sendMessage('update_agent_prompt', {
                            agentId: agentId,
                            prompt: newPrompt
                        });
                    }
                    
                    // Visual feedback
                    e.target.classList.add('saved');
                    e.target.textContent = 'Saved!';
                    setTimeout(() => {
                        e.target.classList.remove('saved');
                        e.target.textContent = 'Save';
                    }, 2000);
                }
            }
            
            // Handle tool toggle clicks
            if (e.target.classList.contains('tool-toggle')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const toolId = e.target.getAttribute('data-tool-id');
                const agentColor = e.target.getAttribute('data-agent-color');
                const agent = agentsData.find(a => a.id === agentId);
                
                if (agent) {
                    const isCurrentlyActive = agent.interactions.includes(toolId);
                    
                    if (isCurrentlyActive) {
                        // Remove tool from interactions
                        agent.interactions = agent.interactions.filter(id => id !== toolId);
                        e.target.classList.remove('active');
                        // Reset to default styling
                        e.target.style.cssText = '';
                    } else {
                        // Add tool to interactions
                        agent.interactions.push(toolId);
                        e.target.classList.add('active');
                        // Apply agent color styling with !important to override CSS
                        e.target.style.cssText = `
                            background-color: ${agentColor}20 !important;
                            border-color: ${agentColor} !important;
                            color: ${agentColor} !important;
                        `;
                    }
                    
                    // Redraw connections with new state
                    drawConnections();
                    
                    // Send update to server if connected
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        sendMessage('update_agent_tools', {
                            agentId: agentId,
                            interactions: agent.interactions
                        });
                    }
                }
            }
        });

        // Auto-resize textareas
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('system-prompt-editor')) {
                e.target.style.height = 'auto';
                e.target.style.height = Math.max(60, e.target.scrollHeight) + 'px';
            }
        });

        // Handle agent name editing
        document.addEventListener('focusout', (e) => {
            if (e.target.classList.contains('agent-name-editable')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const newName = e.target.textContent.trim();
                
                // Update the agent data
                const agent = agentsData.find(a => a.id === agentId);
                if (agent && newName) {
                    agent.name = newName;
                    
                    // Send update to server if connected
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        sendMessage('update_agent_name', {
                            agentId: agentId,
                            name: newName
                        });
                    }
                } else if (agent && !newName) {
                    // Revert to original name if empty
                    e.target.textContent = agent.name;
                }
            }
        });

        // Prevent line breaks in agent names
        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('agent-name-editable')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); // Finish editing
                }
            }
        });
    }

    // Event listeners setup
    llmProvider.addEventListener('change', updateModelOptions);
    
    startWorkflowBtn.addEventListener('click', () => {
        const config = {
            provider: llmProvider.value,
            model: modelName.value
        };
        sendMessage('start_workflow', config);
    });

    stopWorkflowBtn.addEventListener('click', () => {
        sendMessage('stop_workflow', {});
    });

    // Task execution event listeners
    taskDescription.addEventListener('input', () => {
        const hasTask = taskDescription.value.trim().length > 0;
        runTaskBtn.disabled = !hasTask || isTaskRunning || !ws || ws.readyState !== WebSocket.OPEN;
        
        if (hasTask && !isTaskRunning) {
            taskStatusText.textContent = 'Ready to run';
        } else if (!hasTask) {
            taskStatusText.textContent = 'Enter a task description';
        }
    });

    runTaskBtn.addEventListener('click', () => {
        runTask();
    });

    clearTaskBtn.addEventListener('click', () => {
        clearTask();
    });

    pauseExecutionBtn.addEventListener('click', () => {
        pauseExecution();
    });

    exportResultsBtn.addEventListener('click', () => {
        exportResults();
    });

    clearResultsBtn.addEventListener('click', () => {
        clearResults();
    });

    closeResultsBtn.addEventListener('click', () => {
        hideResults();
    });

    // Handle window resize to redraw connections
    window.addEventListener('resize', () => {
        setTimeout(drawConnections, 100);
    });

    // Initialize

    // Task execution functions
    function runTask() {
        const task = taskDescription.value.trim();
        if (!task || isTaskRunning) return;

        // Start task execution
        isTaskRunning = true;
        currentTask = task;
        taskExecutionId = Date.now().toString();
        executionSteps = [];
        currentStepIndex = 0;
        
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
        
        // Send task to backend
        sendMessage('run_task', {
            task: task,
            executionId: taskExecutionId,
            agents: agentsData.map(agent => ({
                id: agent.id,
                name: agent.name,
                prompt: agent.prompt,
                tools: agent.interactions
            })),
            tools: toolsData.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description
            }))
        });
        
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
            if (stepIndex >= steps.length || !isTaskRunning) {
                clearInterval(stepInterval);
                if (isTaskRunning) {
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
        const activeAgent = agentsData.find(agent => agent.name === agentName);
        if (activeAgent) {
            const agentCard = document.getElementById(activeAgent.id);
            if (agentCard) {
                agentCard.classList.add('agent-active');
            }
        }
    }

    function updateProgress(percentage, currentAction) {
        progressFill.style.width = `${percentage}%`;
        currentAgentName.textContent = currentAction;
    }

    function completeTaskExecution() {
        // Generate mock results
        taskResults = {
            finalOutput: generateMockResults(),
            agentOutputs: generateMockAgentOutputs(),
            executionTime: Math.floor(Math.random() * 30) + 10, // 10-40 seconds
            tokensUsed: Math.floor(Math.random() * 5000) + 2000 // 2000-7000 tokens
        };
        
        // Update UI
        isTaskRunning = false;
        runTaskBtn.querySelector('.btn-text').style.display = 'inline';
        runTaskBtn.querySelector('.btn-loading').style.display = 'none';
        runTaskBtn.disabled = false;
        taskStatusText.textContent = 'Task completed successfully';
        
        updateProgress(100, 'Task completed successfully');
        
        // Remove agent highlights
        document.querySelectorAll('.agent-card').forEach(card => {
            card.classList.remove('agent-active');
        });
        
        // Show results
        displayResults();
    }

    function generateMockResults() {
        return `# Wedding Planning Recommendations

Based on your requirements for a wedding with 150 people and a $25,000 budget in San Francisco, here's our comprehensive plan:

## Venue Recommendation
**Golden Gate Park Pavilion** - $3,500
- Capacity: 150+ guests
- Beautiful outdoor setting with indoor backup
- Includes tables, chairs, and basic lighting

## Catering Package
**Farm-to-Table Catering Co.** - $8,000
- $53 per person for plated dinner service
- Includes appetizers, salad, entree, dessert
- Local, organic ingredients

## Photography
**Bay Area Wedding Photography** - $2,800
- 8-hour coverage
- 500+ edited photos
- Online gallery included

## Music & Entertainment
**DJ Premier Events** - $1,200
- Professional DJ with MC services
- Sound system and microphones
- Dance floor lighting

## Flowers & Decorations
**Bloom & Blossom Florals** - $2,500
- Bridal bouquet and boutonnieres
- Centerpieces for 15 tables
- Ceremony arch decoration

## Estimated Total: $18,000
**Remaining Budget: $7,000** for additional items like:
- Wedding dress and attire
- Transportation
- Wedding cake
- Miscellaneous expenses

This plan provides excellent value while staying well within your budget!`;
    }

    function generateMockAgentOutputs() {
        return [
            {
                agent: 'Vision Agent',
                output: 'Identified key preferences: 150 guests, $25,000 budget, San Francisco location. Recommended elegant outdoor ceremony with indoor reception backup. Focus on natural, romantic aesthetic.'
            },
            {
                agent: 'Vendor Agent',
                output: 'Found 12 suitable venues, 8 catering options, 15 photographers, and 10 DJ services. Filtered based on budget and availability. Top recommendations selected for quality and value.'
            },
            {
                agent: 'Budget Agent',
                output: 'Allocated budget: Venue (15%), Catering (35%), Photography (12%), Music (5%), Flowers (10%), Buffer (23%). Total projected cost: $18,000, leaving $7,000 cushion.'
            },
            {
                agent: 'Schedule Agent',
                output: 'Created 6-month planning timeline. Key milestones: Venue booking (6 months), Catering confirmation (4 months), Photography booking (3 months), Final headcount (1 month).'
            }
        ];
    }

    function displayResults() {
        // Show results panel
        resultsPanel.style.display = 'flex';
        
        // Display final output
        finalOutputContent.textContent = taskResults.finalOutput;
        
        // Display agent outputs
        intermediateResultsContent.innerHTML = '';
        taskResults.agentOutputs.forEach(result => {
            const outputElement = document.createElement('div');
            outputElement.className = 'agent-output';
            outputElement.innerHTML = `
                <div class="agent-output-header">${result.agent}</div>
                <div class="agent-output-content">${result.output}</div>
            `;
            intermediateResultsContent.appendChild(outputElement);
        });
    }

    function clearTask() {
        if (isTaskRunning) {
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
        isTaskRunning = false;
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
        if (!taskResults.finalOutput) return;
        
        const exportData = {
            task: currentTask,
            timestamp: new Date().toISOString(),
            results: taskResults,
            configuration: {
                agents: agentsData.map(agent => ({
                    name: agent.name,
                    prompt: agent.prompt,
                    tools: agent.interactions
                })),
                tools: toolsData.map(tool => ({
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
        taskResults = {
            finalOutput: '',
            agentOutputs: [],
            executionTime: 0,
            tokensUsed: 0
        };
        finalOutputContent.textContent = '';
        intermediateResultsContent.innerHTML = '';
    }

    function hideResults() {
        resultsPanel.style.display = 'none';
    }

    function hideExecutionProgress() {
        executionProgress.style.display = 'none';
        executionLog.innerHTML = '';
        progressFill.style.width = '0%';
    }

    // Initialize
    updateModelOptions();
    connectWebSocket();
    
    // Always initialize with sample data on page load
    console.log('Initializing sample data...');
    initializeSampleData();
    console.log('Sample data initialized.');
});
