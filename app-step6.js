// Step 6: Application Initialization Module
// Main application initialization and coordination

(function() {
    'use strict';

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('App initialization module loaded');

        // Global state variables
        let agents = {};
        let tools = {};
        let isWorkflowRunning = false;
        let agentsData = [];
        let toolsData = [];
        let eventListenersSetup = false; // Flag to prevent duplicate event listeners

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
            openai: {
                'gpt-4': { maxTokens: 8192, contextWindow: 128000 },
                'gpt-4-turbo': { maxTokens: 4096, contextWindow: 128000 },
                'gpt-3.5-turbo': { maxTokens: 4096, contextWindow: 16385 }
            },
            ollama: {
                'llama2': { maxTokens: 2048, contextWindow: 4096 },
                'codellama': { maxTokens: 2048, contextWindow: 16384 },
                'mistral': { maxTokens: 2048, contextWindow: 8192 }
            }
        };

        // Message handling
        function handleMessage(data) {
            console.log('Received message:', data.type, data);
            
            switch (data.type) {
                case 'init':
                    initializeUI(data.payload);
                    break;
                case 'agent_update':
                    if (window.updateAgentCard) {
                        window.updateAgentCard(data.agent_id, data.payload);
                    }
                    break;
                case 'tool_update':
                    if (window.updateToolCard) {
                        window.updateToolCard(data.tool_id, data.payload);
                    }
                    break;
                case 'workflow_status':
                    updateWorkflowStatus(data.payload);
                    break;
                case 'blackboard_update':
                    if (window.updateBlackboard) {
                        window.updateBlackboard(data.payload);
                    }
                    break;
                case 'task_result':
                    handleTaskResult(data.payload);
                    break;
                case 'task_started':
                    handleTaskStarted(data.payload);
                    break;
                case 'task_completed':
                    handleTaskCompleted(data.payload);
                    break;
                case 'task_error':
                    handleTaskError(data.payload);
                    break;
                case 'execution_step':
                    handleExecutionStep(data.payload);
                    break;
                case 'llm_models':
                    updateAvailableModels(data.payload);
                    break;
                default:
                    console.log('Unknown message type:', data.type);
            }
        }

        // Handle real LLM task execution responses
        function handleTaskStarted(payload) {
            console.log('🎯 Real LLM task started:', payload);
            if (window.updateProgress) {
                window.updateProgress(10, 'Task started - connecting to LLM...');
            }
        }

        function handleTaskCompleted(payload) {
            console.log('✅ Real LLM task completed:', payload);
            if (window.completeTaskExecution) {
                window.completeTaskExecution();
            }
        }

        function handleTaskError(payload) {
            console.log('❌ Real LLM task error:', payload);
            if (window.addExecutionStep) {
                window.addExecutionStep('System', 'Task Error', payload.error);
            }
            if (window.completeTaskExecution) {
                window.completeTaskExecution();
            }
        }

        function handleExecutionStep(payload) {
            console.log('🔄 Real LLM execution step:', payload);
            
            const agent = payload.agent;
            const action = payload.action;
            const status = payload.status;
            const response = payload.response || '';
            const details = payload.details || {};
            
            if (window.addExecutionStep) {
                // Only show LLM response for completed steps, not running steps
                if (status === 'completed' || status === 'error') {
                    // Add the real LLM response to execution log
                    window.addExecutionStep(agent, action, response, details);
                } else if (status === 'running') {
                    // For running steps, just show the action without response
                    window.addExecutionStep(agent, action, '', {});
                }
            }
            
            // Update progress based on step completion
            const stepCount = window.agentsData ? window.agentsData.length : 4;
            const progress = Math.min(90, 20 + (window.executionSteps.length * 70 / stepCount));
            if (window.updateProgress) {
                window.updateProgress(progress, `${agent} completed analysis...`);
            }
        }

        // Initialize UI with server data
        function initializeUI(payload) {
            console.log('🎨 initializeUI called with:', payload);
            
            agentsData = payload.agents || [];
            toolsData = payload.tools || [];
            
            console.log('📊 Initial data lengths:', { agents: agentsData.length, tools: toolsData.length });
            
            if (agentsData.length === 0 || toolsData.length === 0) {
                console.log('🔄 No data provided, initializing sample data');
                initializeSampleData();
            }
            
            // Set global variables for the rendering module
            window.agentsData = agentsData;
            window.toolsData = toolsData;
            
            console.log('📋 Final data lengths:', { agents: agentsData.length, tools: toolsData.length });
            console.log('🎨 Sample agent interactions:', agentsData[0]?.interactions);
            console.log('🔍 Checking rendering functions:', { 
                renderAgents: !!window.renderAgents, 
                renderTools: !!window.renderTools 
            });
            
            // Render agents and tools using rendering module
            if (window.renderAgents) {
                console.log('🎭 Calling renderAgents with', agentsData.length, 'agents');
                window.renderAgents();
            } else {
                console.error('❌ renderAgents function not available');
            }
            
            if (window.renderTools) {
                console.log('🛠️ Calling renderTools with', toolsData.length, 'tools');
                window.renderTools();
            } else {
                console.error('❌ renderTools function not available');
            }
            
            // Draw connections and bind listeners
            requestAnimationFrame(() => {
                if (window.drawConnections) window.drawConnections();
                const workflowCanvas = document.querySelector('.workflow-canvas');
                if (workflowCanvas && !workflowCanvas.dataset.connectionsBound) {
                    workflowCanvas.addEventListener('scroll', () => {
                        if (window.drawConnections) window.drawConnections();
                    });
                    window.addEventListener('resize', () => {
                        if (window.drawConnections) window.drawConnections();
                    });
                    workflowCanvas.dataset.connectionsBound = 'true';
                }
            });
        }

        // Initialize sample data if none provided
        function initializeSampleData() {
            console.log('🚀 initializeSampleData called');
            agentsData = [
                {
                    id: 'agent-vision',
                    name: 'Vision Agent',
                    role: 'Project Coordinator',
                    status: 'idle',
                    prompt: 'You are a vision agent responsible for understanding project requirements and coordinating with other agents.',
                    interactions: ['tool-search', 'tool-calendar', 'tool-budget'],
                    borderColor: '#3b82f6',
                    context: '2048 tokens'
                },
                {
                    id: 'agent-vendor',
                    name: 'Vendor Agent', 
                    role: 'Vendor Research',
                    status: 'idle',
                    prompt: 'You are a vendor research agent specialized in finding and evaluating service providers.',
                    interactions: ['tool-search', 'tool-email'],
                    borderColor: '#10b981',
                    context: '2048 tokens'
                },
                {
                    id: 'agent-budget',
                    name: 'Budget Agent',
                    role: 'Financial Analysis', 
                    status: 'idle',
                    prompt: 'You are a financial analysis agent focused on budget planning and cost optimization.',
                    interactions: ['tool-budget', 'tool-calendar'],
                    borderColor: '#f59e0b',
                    context: '2048 tokens'
                },
                {
                    id: 'agent-schedule',
                    name: 'Schedule Agent',
                    role: 'Timeline Management',
                    status: 'idle', 
                    prompt: 'You are a scheduling agent responsible for timeline coordination and resource allocation.',
                    interactions: ['tool-calendar', 'tool-email'],
                    borderColor: '#ef4444',
                    context: '2048 tokens'
                }
            ];

            toolsData = [
                {
                    id: 'tool-search',
                    name: 'Web Search',
                    description: 'Search the web for information, vendors, and services',
                    status: 'available',
                    inputs: ['query', 'filters'],
                    outputs: ['results', 'links']
                },
                {
                    id: 'tool-email',
                    name: 'Email System',
                    description: 'Send and manage email communications',
                    status: 'available',
                    inputs: ['recipient', 'subject', 'message'],
                    outputs: ['confirmation', 'response']
                },
                {
                    id: 'tool-calendar',
                    name: 'Calendar Manager',
                    description: 'Schedule events and manage timelines',
                    status: 'available',
                    inputs: ['date', 'time', 'duration'],
                    outputs: ['event_id', 'availability']
                },
                {
                    id: 'tool-budget',
                    name: 'Budget Calculator',
                    description: 'Calculate costs and manage budgets',
                    status: 'available',
                    inputs: ['items', 'quantities', 'prices'],
                    outputs: ['total_cost', 'breakdown']
                }
            ];
        }

        // Update workflow status
        function updateWorkflowStatus(data) {
            isWorkflowRunning = data.running;
            const startBtn = document.getElementById('start-workflow');
            const stopBtn = document.getElementById('stop-workflow');
            
            if (startBtn && stopBtn) {
                startBtn.disabled = isWorkflowRunning;
                stopBtn.disabled = !isWorkflowRunning;
            }
        }

        // Handle task execution results
        function handleTaskResult(payload) {
            console.log('Task result received:', payload);
            // This would be handled by the task execution module
            // Just logging for now
        }

        // Update available models from server
        function updateAvailableModels(models) {
            console.log('Available models updated:', models);
            // Could update the model dropdown with actual available models
        }

        // Initialize the application
        function initializeApp() {
            console.log('Initializing Agentic AI Tutorial application...');
            
            // Initialize sample data immediately
            initializeSampleData();
            console.log('Sample data initialized');
            
            // Set up WebSocket connection if available
            if (window.connectWebSocket) {
                window.connectWebSocket();
            }
            
            // Set up message handler
            if (window.setupMessageHandler) {
                window.setupMessageHandler(handleMessage);
            }
            
            // Wait for UI rendering module to be ready, then initialize
            function waitForUIModule() {
                if (window.renderAgents && window.renderTools) {
                    console.log('UI rendering module ready, initializing UI');
                    setTimeout(() => {
                        initializeUI({ agents: agentsData, tools: toolsData });
                    }, 200);
                } else {
                    console.log('Waiting for UI rendering module...');
                    setTimeout(waitForUIModule, 100);
                }
            }
            
            waitForUIModule();
            
            console.log('Application initialization complete');
        }

        // Start application initialization only after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            initializeApp();
        }

                // Expose data
        window.agentsData = agentsData;
        window.toolsData = toolsData;
        window.agents = agents;
        window.tools = tools;
        window.isWorkflowRunning = isWorkflowRunning;
        window.isTaskRunning = isTaskRunning;
        window.currentTask = currentTask;
        window.taskResults = taskResults;
        window.modelConfigs = modelConfigs;

        // Expose functions for other modules
        window.handleMessage = handleMessage;
        window.initializeUI = initializeUI;
        window.updateWorkflowStatus = updateWorkflowStatus;
        window.initializeSampleData = initializeSampleData;

        // Expose application interface
        window.app = {
            initialize: initializeApp,
            handleMessage: handleMessage,
            updateWorkflowStatus: updateWorkflowStatus,
            getState: function() {
                return {
                    agents: agentsData,
                    tools: toolsData,
                    isWorkflowRunning: isWorkflowRunning,
                    isTaskRunning: isTaskRunning,
                    currentTask: currentTask,
                    taskResults: taskResults
                };
            }
        };

        console.log('App module initialized');
    });

})();
