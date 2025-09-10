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

        // === DOCUMENT LIBRARY FUNCTIONALITY ===
        
        // Track uploaded documents per tool instance
        let documentsByTool = {};
        const MAX_DOCUMENTS = 4;

        function setupDocumentLibrary() {
            // This function is kept for backward compatibility
            // The actual setup is now done per card via setupDocumentLibraryForCard
        }

        function setupDocumentLibraryForCard(toolId) {
            console.log('Setting up document library for tool:', toolId);
            
            // Initialize document storage for this tool
            if (!documentsByTool[toolId]) {
                documentsByTool[toolId] = [];
            }
            
            const fileInput = document.getElementById(`doc-upload-${toolId}`);
            if (fileInput) {
                console.log('Found file input, setting up event listener');
                fileInput.removeEventListener('change', handleFileUpload); // Remove any existing listener
                fileInput.addEventListener('change', (event) => handleFileUpload(event, toolId));
            } else {
                console.error('File input not found:', `doc-upload-${toolId}`);
            }
            
            // Update initial state
            updateUploadButtonState(toolId);
        }

        function handleFileUpload(event, toolId) {
            console.log('File upload triggered for tool:', toolId);
            const files = Array.from(event.target.files);
            const currentDocs = documentsByTool[toolId] || [];
            const remainingSlots = MAX_DOCUMENTS - currentDocs.length;
            
            console.log('Files selected:', files.length, 'Remaining slots:', remainingSlots);
            
            if (files.length > remainingSlots) {
                alert(`You can only upload ${remainingSlots} more document(s). Maximum is ${MAX_DOCUMENTS} documents.`);
                files.splice(remainingSlots);
            }

            files.forEach(file => {
                if (currentDocs.length < MAX_DOCUMENTS) {
                    const docInfo = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        file: file
                    };
                    currentDocs.push(docInfo);
                    addDocumentToList(docInfo, toolId);
                    console.log('Added document:', docInfo.name);
                }
            });

            // Update the storage
            documentsByTool[toolId] = currentDocs;

            // Clear the input
            event.target.value = '';
            
            // Update upload button state
            updateUploadButtonState(toolId);
        }

        function addDocumentToList(docInfo, toolId) {
            const documentList = document.getElementById(`document-list-${toolId}`);
            if (!documentList) {
                console.error('Document list not found:', `document-list-${toolId}`);
                return;
            }

            const docElement = document.createElement('div');
            docElement.className = 'document-item';
            docElement.setAttribute('data-doc-id', docInfo.id);
            docElement.setAttribute('data-tool-id', toolId);
            
            docElement.innerHTML = `
                <span class="document-name" title="${docInfo.name}">${docInfo.name}</span>
                <button class="remove-doc" onclick="removeDocument('${docInfo.id}', '${toolId}')" title="Remove document">×</button>
            `;
            
            documentList.appendChild(docElement);
        }

        function removeDocument(docId, toolId) {
            console.log('Removing document:', docId, 'from tool:', toolId);
            
            // Remove from array
            const currentDocs = documentsByTool[toolId] || [];
            documentsByTool[toolId] = currentDocs.filter(doc => doc.id != docId);
            
            // Remove from DOM
            const docElement = document.querySelector(`[data-doc-id="${docId}"][data-tool-id="${toolId}"]`);
            if (docElement) {
                docElement.remove();
            }
            
            // Update upload button state
            updateUploadButtonState(toolId);
        }

        function updateUploadButtonState(toolId) {
            const uploadButton = document.querySelector(`#tool-documents .upload-button`);
            const uploadLimit = document.querySelector(`#tool-documents .upload-limit`);
            const vectorizeArea = document.getElementById(`vectorize-area-${toolId}`);
            const currentDocs = documentsByTool[toolId] || [];
            
            if (uploadButton && uploadLimit) {
                const remaining = MAX_DOCUMENTS - currentDocs.length;
                
                if (remaining === 0) {
                    uploadButton.disabled = true;
                    uploadButton.textContent = 'Maximum reached';
                    uploadButton.style.backgroundColor = '#6c757d';
                    uploadLimit.textContent = `${currentDocs.length}/${MAX_DOCUMENTS} documents`;
                } else {
                    uploadButton.disabled = false;
                    uploadButton.textContent = '+ Upload Documents';
                    uploadButton.style.backgroundColor = '#007bff';
                    uploadLimit.textContent = `${currentDocs.length}/${MAX_DOCUMENTS} documents`;
                }
            }
            
            // Show/hide vectorize area based on whether documents are uploaded
            if (vectorizeArea) {
                if (currentDocs.length > 0) {
                    vectorizeArea.style.display = 'block';
                } else {
                    vectorizeArea.style.display = 'none';
                }
            }
        }

        async function vectorizeDocuments(toolId) {
            const currentDocs = documentsByTool[toolId] || [];
            const vectorizeButton = document.querySelector(`#vectorize-area-${toolId} .vectorize-button`);
            const statusDiv = document.getElementById(`vectorize-status-${toolId}`);
            
            if (currentDocs.length === 0) {
                if (statusDiv) statusDiv.textContent = 'No documents to vectorize';
                return;
            }
            
            try {
                // Update UI to show processing state
                if (vectorizeButton) {
                    vectorizeButton.disabled = true;
                    vectorizeButton.textContent = '🔄 Vectorizing...';
                }
                if (statusDiv) {
                    statusDiv.textContent = 'Processing documents for RAG search...';
                    statusDiv.className = 'vectorize-status processing';
                }
                
                // Prepare documents for vectorization
                const documentsToVectorize = currentDocs.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    content: `Document: ${doc.name}` // In real implementation, extract text content
                }));
                
                // Send to backend for vectorization via WebSocket
                console.log('Sending documents for vectorization:', documentsToVectorize);
                
                // Use WebSocket messaging instead of HTTP POST
                if (window.sendMessage && window.isWebSocketConnected()) {
                    window.sendMessage('vectorize_documents', {
                        tool_id: toolId,
                        documents: documentsToVectorize
                    });
                    
                    // WebSocket response will be handled by handleVectorizeResult in s5-app.js
                    // For now, we'll just show processing state and let the response handler update the UI
                    console.log('Vectorization request sent via WebSocket');
                    return; // Exit early, response will update UI
                } else {
                    throw new Error('WebSocket not connected');
                }
                
            } catch (error) {
                console.error('Vectorization error:', error);
                
                // Error state
                if (statusDiv) {
                    statusDiv.textContent = `❌ Error: ${error.message}`;
                    statusDiv.className = 'vectorize-status error';
                }
                if (vectorizeButton) {
                    vectorizeButton.disabled = false;
                    vectorizeButton.textContent = '🔍 Vectorize for RAG Search';
                    vectorizeButton.style.backgroundColor = '#28a745';
                }
            }
        }

        // Make functions available globally
        window.setupDocumentLibraryForCard = setupDocumentLibraryForCard;
        window.removeDocument = removeDocument;
        window.vectorizeDocuments = vectorizeDocuments;

        // Initialize all interactions
        function initializeInteractions() {
            setupEventListeners();
            setupAgentInteractions();
            setupDocumentLibrary();
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
