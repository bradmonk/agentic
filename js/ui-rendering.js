// UI rendering and visual management
class UIRenderer {
    constructor() {
        this.agentsContainer = document.getElementById('agents-container');
        this.toolsContainer = document.getElementById('tools-container');
        this.blackboard = document.getElementById('blackboard');
        this.connectionsSvg = document.getElementById('connections-container');
        
        this.agents = {};
        this.tools = {};
        this.agentsData = [];
        this.toolsData = [];
    }

    initializeUI(payload) {
        console.log('Initializing UI with payload:', payload);
        // Don't reinitialize data if it's already loaded
        if (!window.dataModels.agentsData || window.dataModels.agentsData.length === 0) {
            window.dataModels.initializeSampleData();
        }
        this.renderAgents();
        this.renderTools();
        this.drawConnections();
    }

    renderAgents() {
        this.agentsContainer.innerHTML = '';
        if (!window.dataModels || !window.dataModels.agentsData) {
            console.error('Data models not available for renderAgents');
            return;
        }
        window.dataModels.agentsData.forEach((agentData, index) => {
            const agentCard = this.createAgentCard(agentData);
            this.agentsContainer.appendChild(agentCard);
        });
    }

    renderTools() {
        this.toolsContainer.innerHTML = '';
        if (!window.dataModels || !window.dataModels.toolsData) {
            console.error('Data models not available for renderTools');
            return;
        }
        window.dataModels.toolsData.forEach((toolData, index) => {
            const toolCard = this.createToolCard(toolData);
            this.toolsContainer.appendChild(toolCard);
        });
    }

    createAgentCard(agentData) {
        const card = document.createElement('div');
        card.className = 'agent-card';
        card.id = `agent-${agentData.id}`;
        card.style.borderColor = agentData.color;
        
        card.innerHTML = `
            <div class="card-header" style="background-color: ${agentData.color}20; border-bottom: 1px solid ${agentData.color};">
                <h3 class="agent-name editable" data-field="name">${agentData.name}</h3>
                <div class="agent-status" style="background-color: ${agentData.color};">idle</div>
            </div>
            <div class="card-body">
                <p class="agent-description editable" data-field="description">${agentData.description}</p>
                <div class="workflow-section">
                    <h4>Workflow:</h4>
                    <div class="workflow-steps">
                        ${agentData.workflow.map((step, index) => 
                            `<div class="workflow-step editable" data-field="workflow" data-index="${index}">${index + 1}. ${step}</div>`
                        ).join('')}
                    </div>
                </div>
                <div class="agent-tools">
                    <strong>Tools:</strong> ${agentData.tools.join(', ')}
                </div>
            </div>
        `;
        
        return card;
    }

    createToolCard(toolData) {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.id = `tool-${toolData.id}`;
        
        card.innerHTML = `
            <div class="card-header">
                <h3 class="tool-name editable" data-field="name">${toolData.name}</h3>
                <div class="tool-status">available</div>
            </div>
            <div class="card-body">
                <p class="tool-description editable" data-field="description">${toolData.description}</p>
                <div class="tool-parameters">
                    <strong>Parameters:</strong> ${toolData.parameters.join(', ')}
                </div>
            </div>
        `;
        
        return card;
    }

    drawConnections() {
        this.connectionsSvg.innerHTML = '';
        
        if (!window.dataModels || !window.dataModels.agentsData || !window.dataModels.toolsData) {
            console.error('Data models not available for drawConnections');
            return;
        }
        
        window.dataModels.agentsData.forEach((agent, agentIndex) => {
            agent.tools.forEach(toolName => {
                const toolIndex = window.dataModels.toolsData.findIndex(tool => tool.name === toolName);
                if (toolIndex !== -1) {
                    const tool = window.dataModels.toolsData[toolIndex];
                    this.drawConnectionLine(agent.id, tool.id, agentIndex, toolIndex, false, agent.color);
                }
            });
        });
    }

    drawConnectionLine(agentId, toolId, agentIndex, toolIndex, isActive, agentColor) {
        const agentCard = document.getElementById(`agent-${agentId}`);
        const toolCard = document.getElementById(`tool-${toolId}`);
        
        if (!agentCard || !toolCard) return;
        
        const agentRect = agentCard.getBoundingClientRect();
        const toolRect = toolCard.getBoundingClientRect();
        const svgRect = this.connectionsSvg.getBoundingClientRect();
        
        const startX = agentRect.right - svgRect.left;
        const startY = agentRect.top + agentRect.height / 2 - svgRect.top;
        const endX = toolRect.left - svgRect.left;
        const endY = toolRect.top + toolRect.height / 2 - svgRect.top;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const controlX1 = startX + (endX - startX) * 0.5;
        const controlX2 = startX + (endX - startX) * 0.5;
        
        const pathData = `M ${startX} ${startY} C ${controlX1} ${startY} ${controlX2} ${endY} ${endX} ${endY}`;
        
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', agentColor);
        path.setAttribute('stroke-width', isActive ? '3' : '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', isActive ? '1' : '0.6');
        path.setAttribute('class', `connection agent-${agentId} tool-${toolId}`);
        
        if (isActive) {
            path.setAttribute('stroke-dasharray', '5,5');
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'stroke-dashoffset');
            animate.setAttribute('values', '10;0');
            animate.setAttribute('dur', '1s');
            animate.setAttribute('repeatCount', 'indefinite');
            path.appendChild(animate);
        }
        
        this.connectionsSvg.appendChild(path);
    }

    updateAgentCard(agentId, data) {
        const agentCard = document.getElementById(`agent-${agentId}`);
        if (!agentCard) return;
        
        const statusElement = agentCard.querySelector('.agent-status');
        if (statusElement) {
            statusElement.textContent = data.status || 'idle';
            statusElement.className = `agent-status ${data.status || 'idle'}`;
        }
        
        if (data.status === 'active') {
            agentCard.classList.add('agent-active');
        } else {
            agentCard.classList.remove('agent-active');
        }
        
        this.updateConnectionsForAgent(agentId, data.status);
    }

    updateToolCard(toolId, data) {
        const toolCard = document.getElementById(`tool-${toolId}`);
        if (!toolCard) return;
        
        const statusElement = toolCard.querySelector('.tool-status');
        if (statusElement) {
            statusElement.textContent = data.status || 'available';
        }
    }

    updateConnectionsForAgent(agentId, status) {
        const connections = this.connectionsSvg.querySelectorAll(`.agent-${agentId}`);
        connections.forEach(connection => {
            if (status === 'active') {
                connection.setAttribute('stroke-width', '3');
                connection.setAttribute('opacity', '1');
            } else {
                connection.setAttribute('stroke-width', '2');
                connection.setAttribute('opacity', '0.6');
            }
        });
    }

    updateBlackboard(data) {
        this.blackboard.innerHTML = '';
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(message => {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'blackboard-message';
                messageDiv.innerHTML = `
                    <div class="message-header">
                        <span class="message-agent">${message.agent}</span>
                        <span class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="message-content">${message.content}</div>
                `;
                this.blackboard.appendChild(messageDiv);
            });
            
            this.blackboard.scrollTop = this.blackboard.scrollHeight;
        }
    }

    updateWorkflowStatus(data) {
        const startBtn = document.getElementById('start-workflow');
        const stopBtn = document.getElementById('stop-workflow');
        
        if (data.status === 'running') {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            this.isWorkflowRunning = true;
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            this.isWorkflowRunning = false;
        }
    }
}

// Export for global use
window.UIRenderer = UIRenderer;
