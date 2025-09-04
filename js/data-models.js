// Data models and configurations
class DataModels {
    constructor() {
        this.agentsData = [];
        this.toolsData = [];
        this.modelConfigurations = {
            'openai': ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
            'ollama': ['llama2', 'codellama', 'mistral']
        };
    }

    initializeSampleData() {
        // Agentic AI Tutorial - Sample agents data (editable names and workflows)
        this.agentsData = [
            {
                id: 'coordinator',
                name: 'Coordinator',
                description: 'Orchestrates the workflow and manages task distribution',
                workflow: [
                    'Receive and analyze incoming tasks',
                    'Break down complex tasks into subtasks',
                    'Assign subtasks to appropriate agents',
                    'Monitor progress and coordinate handoffs',
                    'Ensure quality and completeness'
                ],
                tools: ['TaskManager', 'MessageQueue', 'WorkflowEngine'],
                color: '#3498db'
            },
            {
                id: 'researcher',
                name: 'Researcher',
                description: 'Gathers and analyzes information from various sources',
                workflow: [
                    'Identify information requirements',
                    'Search relevant databases and sources',
                    'Collect and organize raw data',
                    'Verify information accuracy',
                    'Prepare structured research reports'
                ],
                tools: ['WebSearch', 'DatabaseQuery', 'DataProcessor'],
                color: '#e74c3c'
            },
            {
                id: 'analyzer',
                name: 'Analyzer',
                description: 'Processes data and extracts insights using analytical tools',
                workflow: [
                    'Receive data from research agents',
                    'Apply statistical analysis methods',
                    'Identify patterns and trends',
                    'Generate insights and recommendations',
                    'Create visualizations and reports'
                ],
                tools: ['DataProcessor', 'StatisticalAnalysis', 'Visualization'],
                color: '#f39c12'
            },
            {
                id: 'generator',
                name: 'Generator',
                description: 'Creates content, solutions, and deliverables based on analysis',
                workflow: [
                    'Review analysis results and requirements',
                    'Design solution architecture',
                    'Generate content or code',
                    'Optimize for performance and quality',
                    'Package deliverables for review'
                ],
                tools: ['CodeGenerator', 'ContentCreator', 'TemplateEngine'],
                color: '#2ecc71'
            },
            {
                id: 'reviewer',
                name: 'Reviewer',
                description: 'Reviews outputs for quality, accuracy, and completeness',
                workflow: [
                    'Receive generated content for review',
                    'Check against quality standards',
                    'Verify accuracy and completeness',
                    'Provide feedback and suggestions',
                    'Approve or request revisions'
                ],
                tools: ['QualityChecker', 'TestRunner', 'ValidationEngine'],
                color: '#9b59b6'
            }
        ];

        // Sample tools data
        this.toolsData = [
            {
                id: 'task-manager',
                name: 'TaskManager',
                description: 'Manages task queues, priorities, and assignments',
                parameters: ['task_id', 'priority', 'assignee', 'deadline']
            },
            {
                id: 'web-search',
                name: 'WebSearch',
                description: 'Searches the web for relevant information',
                parameters: ['query', 'max_results', 'date_range']
            },
            {
                id: 'database-query',
                name: 'DatabaseQuery',
                description: 'Queries structured databases for specific data',
                parameters: ['database', 'query', 'filters']
            },
            {
                id: 'data-processor',
                name: 'DataProcessor',
                description: 'Processes and transforms raw data into structured formats',
                parameters: ['input_data', 'format', 'transformations']
            },
            {
                id: 'statistical-analysis',
                name: 'StatisticalAnalysis',
                description: 'Performs statistical analysis on datasets',
                parameters: ['dataset', 'analysis_type', 'confidence_level']
            },
            {
                id: 'visualization',
                name: 'Visualization',
                description: 'Creates charts, graphs, and visual representations',
                parameters: ['data', 'chart_type', 'styling']
            },
            {
                id: 'code-generator',
                name: 'CodeGenerator',
                description: 'Generates code based on specifications and requirements',
                parameters: ['language', 'requirements', 'style_guide']
            },
            {
                id: 'content-creator',
                name: 'ContentCreator',
                description: 'Creates written content, documentation, and reports',
                parameters: ['content_type', 'audience', 'tone']
            },
            {
                id: 'template-engine',
                name: 'TemplateEngine',
                description: 'Processes templates with dynamic data',
                parameters: ['template', 'data', 'output_format']
            },
            {
                id: 'quality-checker',
                name: 'QualityChecker',
                description: 'Checks content and code quality against standards',
                parameters: ['input', 'standards', 'severity_level']
            },
            {
                id: 'test-runner',
                name: 'TestRunner',
                description: 'Executes automated tests and reports results',
                parameters: ['test_suite', 'environment', 'coverage']
            },
            {
                id: 'validation-engine',
                name: 'ValidationEngine',
                description: 'Validates data, formats, and business rules',
                parameters: ['input', 'rules', 'validation_type']
            },
            {
                id: 'message-queue',
                name: 'MessageQueue',
                description: 'Manages asynchronous message passing between agents',
                parameters: ['topic', 'message', 'priority']
            },
            {
                id: 'workflow-engine',
                name: 'WorkflowEngine',
                description: 'Orchestrates complex multi-step workflows',
                parameters: ['workflow_definition', 'triggers', 'conditions']
            }
        ];

        console.log('Sample data initialized:', {
            agents: this.agentsData.length,
            tools: this.toolsData.length
        });
    }

    updateModelOptions() {
        const llmProvider = document.getElementById('llm-provider');
        const modelName = document.getElementById('model-name');
        
        const provider = llmProvider.value;
        const models = this.modelConfigurations[provider] || [];
        
        modelName.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelName.appendChild(option);
        });
    }

    // Methods to update data
    updateAgentData(agentId, field, value, index = null) {
        const agent = this.agentsData.find(a => a.id === agentId);
        if (!agent) return;

        if (field === 'workflow' && index !== null) {
            agent.workflow[index] = value;
        } else {
            agent[field] = value;
        }
    }

    updateToolData(toolId, field, value) {
        const tool = this.toolsData.find(t => t.id === toolId);
        if (!tool) return;

        tool[field] = value;
    }

    // Export/Import functionality
    exportData() {
        return {
            agents: this.agentsData,
            tools: this.toolsData,
            timestamp: new Date().toISOString()
        };
    }

    importData(data) {
        if (data.agents) {
            this.agentsData = data.agents;
        }
        if (data.tools) {
            this.toolsData = data.tools;
        }
    }
}

// Export for global use
window.DataModels = DataModels;
