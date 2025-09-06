// Step 4: UI Interactions Module
// Handles all user interface interactions, event listeners, and hamburger menu

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('UI Interactions module loaded');

        // === HAMBURGER MENU FUNCTIONALITY ===
        
        // Get menu elements
        const menuToggle = document.getElementById('menu-toggle');
        const slideMenu = document.getElementById('slide-menu');
        const menuOverlay = document.getElementById('menu-overlay');
        const menuClose = document.getElementById('menu-close');

        // Menu functions
        function openMenu() {
            console.log('Opening menu...');
            if (slideMenu && menuOverlay && menuToggle) {
                slideMenu.classList.add('open');
                menuOverlay.classList.add('active');
                menuToggle.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeMenu() {
            console.log('Closing menu...');
            if (slideMenu && menuOverlay && menuToggle) {
                slideMenu.classList.remove('open');
                menuOverlay.classList.remove('active');
                menuToggle.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }

        function toggleMenu() {
            if (slideMenu && slideMenu.classList.contains('open')) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        // === UI INTERACTION ELEMENTS ===
        
        const llmProvider = document.getElementById('llm-provider');
        const modelName = document.getElementById('model-name');
        const taskDescription = document.getElementById('task-description');
        const runTaskBtn = document.getElementById('run-task');
        const pauseTaskBtn = document.getElementById('pause-task');
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
                const models = [
                    { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
                    { value: 'gpt-4o', label: 'gpt-4o' },
                    { value: 'gpt-4.1', label: 'gpt-4.1' },
                    { value: 'gpt-5', label: 'gpt-5' }
                ];
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.value;
                    option.textContent = model.label;
                    modelName.appendChild(option);
                });
            } else if (provider === 'ollama') {
                const models = [
                    { value: 'llama3.1:latest', label: 'llama3.1:latest' },
                    { value: 'gpt-oss:20b', label: 'gpt-oss:20b' },
                    { value: 'deepseek-r1:latest', label: 'deepseek-r1:latest' },
                    { value: 'gemma3:latest', label: 'gemma3:latest' },
                    { value: 'mistral:latest', label: 'mistral:latest' }
                ];
                models.forEach((model, index) => {
                    const option = document.createElement('option');
                    option.value = model.value;
                    option.textContent = model.label;
                    if (index === 0) option.selected = true; // Set llama3.1:latest as default
                    modelName.appendChild(option);
                });
            }
        }

        // Setup event listeners
        function setupEventListeners() {
            // === HAMBURGER MENU EVENT LISTENERS ===
            
            if (menuToggle) {
                console.log('Adding click listener to menu toggle');
                menuToggle.addEventListener('click', function(e) {
                    console.log('Menu toggle clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    openMenu();
                });
            } else {
                console.error('ERROR: menuToggle element not found');
            }

            if (menuClose) {
                menuClose.addEventListener('click', function(e) {
                    console.log('Menu close clicked');
                    e.preventDefault();
                    closeMenu();
                });
            }

            if (menuOverlay) {
                menuOverlay.addEventListener('click', function(e) {
                    console.log('Menu overlay clicked');
                    closeMenu();
                });
            }

            // Close menu on escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && slideMenu && slideMenu.classList.contains('open')) {
                    closeMenu();
                }
            });

            // === UI INTERACTION EVENT LISTENERS ===
            
            // Model provider change
            if (llmProvider) {
                llmProvider.addEventListener('change', updateModelOptions);
            }

            // Task controls
            if (taskDescription) {
                taskDescription.addEventListener('input', function() {
                    const hasText = taskDescription.value.trim().length > 0;
                    if (runTaskBtn) {
                        runTaskBtn.disabled = !hasText;
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

            if (pauseTaskBtn) {
                pauseTaskBtn.addEventListener('click', function() {
                    if (window.pauseTask) {
                        window.pauseTask();
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

        // Agent interaction handling
        function setupAgentInteractions() {
            // Tool toggle button handling
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('tool-toggle')) {
                    const agentId = e.target.getAttribute('data-agent-id');
                    const toolId = e.target.getAttribute('data-tool-id');
                    const agentColor = e.target.getAttribute('data-agent-color');
                    
                    e.target.classList.toggle('active');
                    
                    // Update agent data
                    if (window.agentsData) {
                        const agent = window.agentsData.find(a => a.id === agentId);
                        if (agent) {
                            if (!agent.interactions) agent.interactions = [];
                            if (e.target.classList.contains('active')) {
                                if (!agent.interactions.includes(toolId)) {
                                    agent.interactions.push(toolId);
                                }
                                // Style active button
                                e.target.style.backgroundColor = agentColor + '20';
                                e.target.style.borderColor = agentColor;
                                e.target.style.color = agentColor;
                            } else {
                                agent.interactions = agent.interactions.filter(t => t !== toolId);
                                // Reset button style
                                e.target.style.backgroundColor = '';
                                e.target.style.borderColor = '';
                                e.target.style.color = '';
                            }
                            
                            // Redraw connections
                            if (window.drawConnections) {
                                window.drawConnections();
                            }
                        }
                    }
                }

                // Save prompt button handling
                if (e.target.classList.contains('save-prompt-btn')) {
                    const agentId = e.target.getAttribute('data-agent-id');
                    const textarea = document.querySelector(`textarea.system-prompt-editor[data-agent-id="${agentId}"]`);
                    
                    if (textarea && window.agentsData) {
                        const newPrompt = textarea.value.trim();
                        const agent = window.agentsData.find(a => a.id === agentId);
                        
                        if (agent && newPrompt) {
                            agent.prompt = newPrompt;
                            
                            // Visual feedback
                            e.target.textContent = 'Saved!';
                            e.target.style.backgroundColor = '#4CAF50';
                            setTimeout(() => {
                                e.target.style.backgroundColor = '';
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
        }

        // Initialize all interactions
        function initializeInteractions() {
            setupEventListeners();
            setupAgentInteractions();
            updateModelOptions(); // Set initial model options
            
            console.log('UI interactions and hamburger menu initialized');
        }

        // Start initialization
        initializeInteractions();

        // Expose public interface
        window.uiInteractions = {
            updateModelOptions: updateModelOptions,
            setupEventListeners: setupEventListeners,
            setupAgentInteractions: setupAgentInteractions
        };

        // Expose hamburger menu functions globally for testing/debugging
        window.hamburgerMenu = {
            open: openMenu,
            close: closeMenu,
            toggle: toggleMenu
        };
    });

})();
