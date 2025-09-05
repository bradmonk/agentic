---
applyTo: '**'
---

# Agentic AI System - AI Coding Agent Instructions

## General Instructions
- Always remember to activate the python virtual environment if one is present in the project.
- Never use the `python3` command, because that is system python and we want to use the virtual environment python.
- Always use `python` to run python scripts, never `python3`.
- Never cd into other directories unless absolutely necessary. Run all commands from the root of the project.
- Remember to kill any running processes before starting new ones to avoid port conflicts.
- Always use the provided restart script `./restart.sh` to start or restart the application during development.
- After running the restart script, wait for the user to test the changes in the browser before making further modifications.
- Always confirm with the user that the changes work as expected before proceeding to the next task.
- Do not launch the built-in browser automatically. Wait for the user to open the browser manually.
- Be aware that you are suseptible to duplicating code that already exists in the project. Always check for existing code before adding new code.
- When making changes to the codebase, note your progress in a DEVELOPMENT.md file in the root of the project.
- Remember this computer has an arm64 architecture. Do not suggest install x86_64 packages.


## Architecture Overview
This is a **real-time multi-agent AI system** with WebSocket-based communication between Python backend and modular JavaScript frontend. The system executes LLM-powered agents with tool integration and live monitoring.

## Key Components & Data Flow

### 1. Modular Frontend Architecture (IIFE Pattern)
- **6 JavaScript modules** in execution order: `websocket-step1.js` → `ui-rendering-step2.js` → `task-execution-step3.js` → `hamburger-menu-step4.js` → `ui-interactions-step5.js` → `app-step6.js`
- **Global communication**: Modules communicate via `window` object properties (`window.agentsData`, `window.toolsData`, `window.isTaskRunning`)
- **Event delegation**: Single event listeners handle dynamic elements across all modules
- **SVG connections**: Dynamic connection lines between agent/tool cards using coordinate calculation

### 2. Backend Architecture
- **`python_server.py`**: WebSocket server with AgentMonitor class managing real-time communication
- **`llm_integration.py`**: LLMManager supporting OpenAI + Ollama with function calling
- **`tools.py`**: ToolExecutor framework with MonitoredTool base class for async execution
- **Message routing**: Handles `run_task`, `test_tool`, `get_tools`, `get_models` WebSocket messages

### 3. Tool Integration Patterns
```python
# Tool execution in agents (python_server.py:356-420)
tool_map = {"tool-search": "Web Search", "tool-budget": "Budget Calculator"}
available_tools = [] # Function calling schema for LLM
tool_results = await monitor.tool_executor.execute_tool(tool_name, **params)
```

## Critical Development Workflows

### Startup Command
```bash
./restart.sh  # ALWAYS use this - handles process cleanup, virtual env, both servers
```

### Adding New Tools
1. **Backend**: Create tool class in `tools.py` extending `MonitoredTool`
2. **Registration**: Add to `ToolExecutor._initialize_tools()` 
3. **Schema**: Define in `get_tool_schema()` with parameter validation
4. **Agent mapping**: Update tool_map in `python_server.py:362`

### Module Development Pattern
- **IIFE wrapper**: `(function() { /* module code */ })();`
- **Global exposure**: `window.functionName = localFunction;`
- **Dependency chain**: Later modules depend on earlier module globals
- **Event handling**: Use event delegation from single listeners

## LLM Integration Specifics

### Message Format for Agent Execution
```python
messages = [{
    "role": "system", 
    "content": f"You are {agent_name}. {agent_prompt}. Format your response using markdown..."
}, {
    "role": "user",
    "content": f"Task: {task_description}. Analyze and provide recommendations."
}]
```

### WebSocket Message Types
- **Frontend→Backend**: `run_task`, `test_tool`, `get_tools`, `get_models`  
- **Backend→Frontend**: `task_started`, `execution_step`, `task_completed`, `tool_result`

## Project Conventions

### File Naming & Organization
- **JS modules**: Numbered by dependency order (`websocket-step1.js`, `app-step6.js`)
- **Archive pattern**: Old versions moved to `archive/` directory
- **Documentation**: Progress tracked in `DEVELOPMENT.md`, setup in `AGENT_SETUP.md`

### Agent/Tool Data Structure
```javascript
// Frontend expects this exact structure (python_server.py:57-59)
agentData = {
    id: "agent-vision", name: "Vision Agent", prompt: "...", 
    tools: ["tool-search"], interactions: ["tool-search"], // both required
    borderColor: "#007bff", role: "Project Coordinator"
}
```

### Markdown Rendering
- **LLM responses**: Automatically rendered using `marked.js` with sanitization
- **CSS styling**: Agent-specific markdown colors in `.response-content.agent-*`
- **Prompt engineering**: Agents encouraged to use markdown formatting

## Environment & Dependencies
- **Python**: Use virtual env, never `python3`, always `python`
- **Architecture**: ARM64 - avoid x86_64 packages
- **Ports**: Frontend :3000, WebSocket :8080
- **LLM Providers**: Ollama (local) default, OpenAI optional

## Integration Points
- **Agent←→Tool**: Tool schemas passed to LLM as function calling format
- **Frontend←→Backend**: Real-time state sync via WebSocket message broadcasting  
- **Module←→Module**: Global window properties and event delegation patterns
- **LLM←→Tools**: Simple keyword matching triggers tool execution (expandable to function calling)