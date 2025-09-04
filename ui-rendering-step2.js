// UI Rendering functionality - Step 2 extraction

function renderAgents() {
    console.log('🎭 renderAgents called');
    const agentsContainer = document.getElementById('agents-container');
    const agentsData = window.agentsData; // Get from global scope
    const agents = window.agents || {};
    
    console.log('📦 Agents container found:', !!agentsContainer);
    console.log('📊 Agents data:', agentsData ? agentsData.length : 'undefined');
    
    if (!agentsContainer) {
        console.error('❌ agents-container element not found');
        return;
    }
    
    if (!agentsData || agentsData.length === 0) {
        console.error('❌ No agents data available');
        return;
    }
    
    agentsContainer.innerHTML = '';
    agentsData.forEach((agentData, index) => {
        console.log(`🤖 Creating agent card ${index + 1}: ${agentData.name}`);
        const agent = createAgentCard(agentData);
        agentsContainer.appendChild(agent);
        agents[agentData.id] = agent;
    });
    window.agents = agents; // Update global scope
    
    console.log('✅ renderAgents completed, added', agentsData.length, 'agents');
    requestAnimationFrame(() => { if (window.drawConnections) window.drawConnections(); });
}

function renderTools() {
    console.log('🛠️ renderTools called');
    const toolsContainer = document.getElementById('tools-container');
    const toolsData = window.toolsData; // Get from global scope
    const tools = window.tools || {};
    
    console.log('📦 Tools container found:', !!toolsContainer);
    console.log('📊 Tools data:', toolsData ? toolsData.length : 'undefined');
    
    if (!toolsContainer) {
        console.error('❌ tools-container element not found');
        return;
    }
    
    if (!toolsData || toolsData.length === 0) {
        console.error('❌ No tools data available');
        return;
    }
    
    toolsContainer.innerHTML = '';
    toolsData.forEach((toolData, index) => {
        console.log(`🔧 Creating tool card ${index + 1}: ${toolData.name}`);
        const tool = createToolCard(toolData);
        toolsContainer.appendChild(tool);
        tools[toolData.id] = tool;
    });
    window.tools = tools; // Update global scope
    
    console.log('✅ renderTools completed, added', toolsData.length, 'tools');
    requestAnimationFrame(() => { if (window.drawConnections) window.drawConnections(); });
}

function createAgentCard(agentData) {
    const toolsData = window.toolsData; // Get from global scope
    
    const card = document.createElement('div');
    card.className = 'card agent-card';
    card.id = agentData.id;
    card.style.borderColor = agentData.borderColor;
    
    // Create toggle buttons for all tools
    const toolToggles = toolsData.map(tool => {
        const isActive = agentData.interactions && agentData.interactions.includes(tool.id);
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
    const connectionsSvg = document.getElementById('connections-container');
    const workflowCanvas = document.querySelector('.workflow-canvas');
    const agentsData = window.agentsData;
    const toolsData = window.toolsData;
    
    if (!connectionsSvg || !workflowCanvas) return;
    // Ensure SVG has correct size (in case of dynamic layout changes)
    const canvasRect = workflowCanvas.getBoundingClientRect();
    connectionsSvg.setAttribute('width', canvasRect.width);
    connectionsSvg.setAttribute('height', canvasRect.height);
    
    // Clear existing connections
    connectionsSvg.innerHTML = '';
    
    // Draw connections from each agent to all tools
    agentsData.forEach((agent, agentIndex) => {
        toolsData.forEach((tool, toolIndex) => {
            const isActive = agent.interactions && agent.interactions.includes(tool.id);
            drawConnectionLine(agent.id, tool.id, agentIndex, toolIndex, isActive, agent.borderColor);
        });
    });
}

function drawConnectionLine(agentId, toolId, agentIndex, toolIndex, isActive, agentColor) {
    const connectionsSvg = document.getElementById('connections-container');
    if (!connectionsSvg) {
        console.error("Could not find connections-container");
        return;
    }
    const toolsData = window.toolsData;
    
    const agentCard = document.getElementById(agentId);
    const toolCard = document.getElementById(toolId);
    
    if (!agentCard || !toolCard) {
        console.error(`Card not found. Agent: ${agentId}, Tool: ${toolId}`);
        return;
    }
    
    // Get positions of the cards
    const agentRect = agentCard.getBoundingClientRect();
    const toolRect = toolCard.getBoundingClientRect();
    const workflowCanvas = document.querySelector('.workflow-canvas');
    const containerRect = workflowCanvas.getBoundingClientRect();
    
    // If the container has no size, we can't draw.
    if (containerRect.width === 0 || containerRect.height === 0) {
        console.error("Connections container has no size. Cannot draw lines.");
        return;
    }

    // Calculate offsets for proper line spacing
    const agentLineOffset = (toolIndex - (toolsData.length / 2)) * 6;
    const toolLineOffset = (agentIndex - (window.agentsData.length / 2)) * 6;
    
    // Calculate connection points with offsets
    const startX = agentRect.right - containerRect.left + workflowCanvas.scrollLeft;
    const startY = agentRect.top + (agentRect.height / 2) - containerRect.top + workflowCanvas.scrollTop + agentLineOffset;
    const endX = toolRect.left - containerRect.left + workflowCanvas.scrollLeft;
    const endY = toolRect.top + (toolRect.height / 2) - containerRect.top + workflowCanvas.scrollTop + toolLineOffset;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = startX + (endX - startX) / 2;
    const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    
    path.setAttribute('d', d);
    path.setAttribute('stroke', isActive ? agentColor : '#ddd');
    path.setAttribute('stroke-width', isActive ? '2.5' : '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('class', `connection-path ${isActive ? 'active' : ''}`);
    path.setAttribute('data-agent', agentId);
    path.setAttribute('data-tool', toolId);

    connectionsSvg.appendChild(path);
}

// Make functions globally available
window.renderAgents = renderAgents;
window.renderTools = renderTools;
window.createAgentCard = createAgentCard;
window.createToolCard = createToolCard;
window.drawConnections = drawConnections;
window.drawConnectionLine = drawConnectionLine;
