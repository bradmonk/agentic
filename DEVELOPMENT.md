    `# Development Notes

## Current Working State (v1.0.0)
- **Date**: September 4, 2025
- **Status**: ✅ All features working correctly
- **Git Tag**: `working-state` and `v1.0.0`

## Quick Start Commands
```bash
# Start the application
./restart.sh

# Access the interface
open http://localhost:3000

# WebSocket server
# Automatically runs on ws://localhost:8080
```

## Architecture Overview

### Frontend Modules
1. `websocket-step1.js` - WebSocket communication
2. `ui-rendering-step2.js` - Agent/tool rendering & SVG connections  
3. `task-execution-step3.js` - Task lifecycle management
4. `hamburger-menu-step4.js` - Slide-out menu functionality
5. `ui-interactions-step5.js` - Event handling & user interactions
6. `app-step6.js` - Application initialization & state
7. `fullscript.js` - Module coordinator

### Backend
- `python_server.py` - WebSocket server with agent monitoring
- `llm_integration.py` - OpenAI/Ollama integration
- `langgraph_workflow.py` - Workflow implementation

## Working Features ✅
- [x] Modular JavaScript architecture with IIFE pattern
- [x] Real-time WebSocket communication
- [x] Agent cards with editable prompts and border colors
- [x] Tool cards with input/output specifications
- [x] Tool toggle buttons with active/inactive states
- [x] SVG connection lines between agents and tools
- [x] Hamburger menu for task input
- [x] Drop shadows and responsive styling
- [x] Event delegation for dynamic elements
- [x] Python backend aligned with frontend data structure
- [x] Connection status indicator
- [x] LLM provider selection (OpenAI/Ollama)

## Key Technical Decisions
- **IIFE Pattern**: Each module wrapped in immediately invoked function expression
- **Global Window Object**: Communication between modules via window properties
- **Event Delegation**: Single event listener handling dynamic elements
- **WebSocket Integration**: Real-time updates from Python backend
- **SVG Connections**: Dynamic connection lines with proper coordinate calculation
- **Responsive Design**: Mobile-friendly with hamburger menu navigation

## Git Workflow
```bash
# Return to this working state anytime
git checkout working-state

# Or by version tag
git checkout v1.0.0

# View commit history
git log --oneline --graph

# View all tags
git tag -l
```

## Development Environment
- **Python**: Virtual environment in `.venv/`
- **Frontend**: Static files served by Python HTTP server
- **WebSocket**: Real-time communication on port 8080
- **HTTP Server**: Frontend served on port 3000
- **Restart Script**: `./restart.sh` for development workflow

## Troubleshooting Reference
1. **White screen**: Check browser console for JS errors
2. **No WebSocket connection**: Verify backend server running
3. **Missing cards**: Check data structure alignment
4. **Tool toggles not working**: Verify event delegation setup
5. **Connection lines missing**: Check SVG container and coordinate calculation

## Future Enhancements
- Additional agent types and configurations
- Advanced workflow visualization
- Export/import functionality for agent configurations
- Enhanced debugging tools
- Performance optimizations for large agent networks
