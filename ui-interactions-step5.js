// Step 5: UI Interactions Module
// Handles all user interface interactions and event listeners

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('UI interactions module loaded');

        // Get UI elements
        const llmProvider = document.getElementById('llm-provider');
        const modelName = document.getElementById('model-name');
        const startWorkflowBtn = document.getElementById('start-workflow');
        const stopWorkflowBtn = document.getElementById('stop-workflow');
        const taskDescription = document.getElementById('task-description');
        const runTaskBtn = document.getElementById('run-task');
        const clearTaskBtn = document.getElementById('clear-task');
        const pauseExecutionBtn = document.getElementById('pause-execution');
        const exportResultsBtn = document.getElementById('export-results');
        const clearResultsBtn = document.getElementById('clear-results');
        const closeResultsBtn = document.getElementById('close-results');
        const workflowCanvas = document.getElementById('workflow-canvas');

        // Model configuration updates
        function updateModelOptions() {
            const provider = llmProvider.value;
            modelName.innerHTML = ''; // Clear existing options
            
            if (provider === 'openai') {
                const models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model.toUpperCase();
                    modelName.appendChild(option);
                });
            } else if (provider === 'ollama') {
                // Default Ollama models - will be updated from server
                const models = ['llama2', 'codellama', 'mistral'];
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model.charAt(0).toUpperCase() + model.slice(1);
                    modelName.appendChild(option);
                });
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // Model provider change
            if (llmProvider) {
                llmProvider.addEventListener('change', updateModelOptions);
            }

            // Workflow controls
            if (startWorkflowBtn) {
                startWorkflowBtn.addEventListener('click', function() {
                    const config = {
                        provider: llmProvider.value,
                        model: modelName.value
                    };
                    if (window.sendMessage) {
                        window.sendMessage('start_workflow', config);
                    }
                });
            }

            if (stopWorkflowBtn) {
                stopWorkflowBtn.addEventListener('click', function() {
                    if (window.sendMessage) {
                        window.sendMessage('stop_workflow', {});
                    }
                });
            }

            // Task controls
            if (taskDescription) {
                taskDescription.addEventListener('input', function() {
                    const hasText = taskDescription.value.trim().length > 0;
                    if (runTaskBtn) {
                        runTaskBtn.disabled = !hasText;
                    }
                    
                    const statusText = document.getElementById('task-status-text');
                    if (statusText) {
                        statusText.textContent = hasText ? 'Ready to run' : 'Enter a task description';
                    }
                });
            }

            if (runTaskBtn) {
                runTaskBtn.addEventListener('click', function() {
                    if (window.runTask) {
                        window.runTask();
                    }
                });
            }

            if (clearTaskBtn) {
                clearTaskBtn.addEventListener('click', function() {
                    if (window.clearTask) {
                        window.clearTask();
                    }
                });
            }

            if (pauseExecutionBtn) {
                pauseExecutionBtn.addEventListener('click', function() {
                    if (window.pauseExecution) {
                        window.pauseExecution();
                    }
                });
            }

            if (exportResultsBtn) {
                exportResultsBtn.addEventListener('click', function() {
                    if (window.exportResults) {
                        window.exportResults();
                    }
                });
            }

            if (clearResultsBtn) {
                clearResultsBtn.addEventListener('click', function() {
                    if (window.clearResults) {
                        window.clearResults();
                    }
                });
            }

            if (closeResultsBtn) {
                closeResultsBtn.addEventListener('click', function() {
                    if (window.hideResults) {
                        window.hideResults();
                    }
                });
            }

            // Canvas scroll handling
            // Global event delegation for dynamic elements
        document.addEventListener('click', function(e) {
            // Handle tool toggle clicks
            if (e.target.classList.contains('tool-toggle')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const toolId = e.target.getAttribute('data-tool-id');
                const agentColor = e.target.getAttribute('data-agent-color');
                
                if (window.agentsData) {
                    const agent = window.agentsData.find(a => a.id === agentId);
                    
                    if (agent) {
                        const isCurrentlyActive = agent.interactions && agent.interactions.includes(toolId);
                        
                        if (isCurrentlyActive) {
                            // Remove tool from interactions
                            agent.interactions = agent.interactions.filter(id => id !== toolId);
                            e.target.classList.remove('active');
                            // Reset to default styling
                            e.target.style.cssText = '';
                        } else {
                            // Add tool to interactions
                            if (!agent.interactions) agent.interactions = [];
                            agent.interactions.push(toolId);
                            e.target.classList.add('active');
                            // Apply agent color styling
                            e.target.style.backgroundColor = `${agentColor}20`;
                            e.target.style.borderColor = agentColor;
                            e.target.style.color = agentColor;
                        }
                        
                        // Redraw connections with new state
                        requestAnimationFrame(() => {
                            if (window.drawConnections) {
                                window.drawConnections();
                            }
                        });
                        
                        // Send update to server if connected
                        if (window.isWebSocketConnected()) {
                            window.sendMessage('update_agent_tools', {
                                agentId: agentId,
                                interactions: agent.interactions
                            });
                        }
                    }
                }
            }
            
            // Handle save prompt button clicks
            if (e.target.classList.contains('save-prompt-btn')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const textarea = document.querySelector(`.system-prompt-editor[data-agent-id="${agentId}"]`);
                
                if (textarea && window.agentsData) {
                    const newPrompt = textarea.value;
                    const agent = window.agentsData.find(a => a.id === agentId);
                    
                    if (agent) {
                        agent.prompt = newPrompt;
                        
                        // Visual feedback
                        e.target.classList.add('saved');
                        e.target.textContent = 'Saved!';
                        setTimeout(() => {
                            e.target.classList.remove('saved');
                            e.target.textContent = 'Save';
                        }, 2000);
                        
                        // Send update to server if connected
                        if (window.isWebSocketConnected()) {
                            window.sendMessage('update_agent_prompt', {
                                agentId: agentId,
                                prompt: newPrompt
                            });
                        }
                    }
                }
            }

            // Handle agent name editing selection
            if (e.target.classList.contains('agent-name-editable')) {
                // Select all text when clicking on the name
                const range = document.createRange();
                range.selectNodeContents(e.target);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });

        // Handle agent name editing
        document.addEventListener('focusout', function(e) {
            if (e.target.classList.contains('agent-name-editable')) {
                const agentId = e.target.getAttribute('data-agent-id');
                const newName = e.target.textContent.trim();
                
                if (window.agentsData) {
                    const agent = window.agentsData.find(a => a.id === agentId);
                    if (agent && newName) {
                        agent.name = newName;
                        
                        // Send update to server if connected
                        if (window.isWebSocketConnected()) {
                            window.sendMessage('update_agent_name', {
                                agentId: agentId,
                                name: newName
                            });
                        }
                    } else if (agent && !newName) {
                        // Revert to original name if empty
                        e.target.textContent = agent.name;
                    }
                }
            }
        });

        // Prevent line breaks in agent names
        document.addEventListener('keydown', function(e) {
            if (e.target.classList.contains('agent-name-editable')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); // Finish editing
                }
            }
        });

        // Auto-resize textareas
        document.addEventListener('input', function(e) {
            if (e.target.classList.contains('system-prompt-editor')) {
                e.target.style.height = 'auto';
                e.target.style.height = Math.max(60, e.target.scrollHeight) + 'px';
            }
        });

        if (workflowCanvas) {
                workflowCanvas.addEventListener('scroll', function() {
                    if (window.drawConnections) {
                        window.drawConnections();
                    }
                });
            }

            // Window resize handling
            window.addEventListener('resize', function() {
                if (window.drawConnections) {
                    window.drawConnections();
                }
            });
        }

        // Setup prompt editing interactions
        function setupPromptEditing() {
            // Agent card click handling
            document.addEventListener('click', function(e) {
                if (e.target.closest('.agent-card')) {
                    const card = e.target.closest('.agent-card');
                    const promptElement = card.querySelector('.agent-prompt');
                    
                    if (promptElement && !promptElement.hasAttribute('contenteditable')) {
                        promptElement.setAttribute('contenteditable', 'true');
                        promptElement.focus();
                        promptElement.style.backgroundColor = '#f0f8ff';
                        promptElement.style.border = '1px solid #007acc';
                        promptElement.style.padding = '8px';
                        promptElement.style.borderRadius = '4px';
                    }
                }
            });

            // Input handling for editable prompts
            document.addEventListener('input', function(e) {
                if (e.target.classList.contains('agent-prompt') && e.target.hasAttribute('contenteditable')) {
                    // Real-time prompt updating could be implemented here
                    console.log('Prompt updated:', e.target.textContent);
                }
            });

            // Focus out handling
            document.addEventListener('focusout', function(e) {
                if (e.target.classList.contains('agent-prompt') && e.target.hasAttribute('contenteditable')) {
                    e.target.removeAttribute('contenteditable');
                    e.target.style.backgroundColor = '';
                    e.target.style.border = '';
                    e.target.style.padding = '';
                    e.target.style.borderRadius = '';
                    
                    // Save the updated prompt
                    const agentCard = e.target.closest('.agent-card');
                    if (agentCard) {
                        const agentId = agentCard.id;
                        const newPrompt = e.target.textContent.trim();
                        console.log(`Saved prompt for ${agentId}:`, newPrompt);
                        
                        // Update global agentsData if available
                        if (window.agentsData) {
                            const agent = window.agentsData.find(a => a.id === agentId);
                            if (agent) {
                                agent.prompt = newPrompt;
                            }
                        }
                    }
                }
            });

            // Keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                // Escape key to cancel editing
                if (e.key === 'Escape' && e.target.hasAttribute('contenteditable')) {
                    e.target.blur();
                }
                
                // Enter key to save and exit editing
                if (e.key === 'Enter' && e.target.hasAttribute('contenteditable') && !e.shiftKey) {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        }

        // Initialize all interactions
        function initializeInteractions() {
            setupEventListeners();
            setupPromptEditing();
            updateModelOptions(); // Set initial model options
            
            console.log('UI interactions initialized');
        }

        // Start initialization
        initializeInteractions();

        // Expose public interface
        window.uiInteractions = {
            updateModelOptions: updateModelOptions,
            setupEventListeners: setupEventListeners,
            setupPromptEditing: setupPromptEditing
        };
    });

})();
