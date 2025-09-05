    `# Development Notes

## Current Working State (v1.3.2) 
- **Date**: September 5, 2025
- **Status**: ✅ Tool execution timing enhancement for better visibility
- **Git Tag**: `tool-execution-timing`

## Latest Implementation: Tool Framework + Markdown Rendering ✅

### Markdown Rendering:
- **Rich Text Display**: LLM responses now render with full markdown support
- **Marked.js Integration**: Client-side markdown parsing with sanitization
- **Comprehensive Styling**: Headings, lists, code blocks, tables, blockquotes
- **Safe Rendering**: HTML sanitization prevents XSS attacks
- **Fallback Support**: Graceful degradation to plain text if parsing fails

### Tool Execution Framework:
- **Web Search Tool**: Mock implementation with realistic response structure
- **Budget Calculator Tool**: Full Python calculator with tax calculations and flexible input formats 
- **Email System Tool**: Placeholder with realistic response structure
- **Calendar Manager Tool**: Placeholder with date/time validation
- **Async Framework**: Complete tool execution with monitoring integration
- **API Endpoints**: `test_tool` and `get_tools` for development/testing
- **Bug Fix**: Budget Calculator now accepts `tax_rate` parameter (was causing execution errors)

### UI/UX Improvements:
- **Horizontal Scrolling**: Wide markdown tables now scroll horizontally instead of expanding panels
- **Container Constraints**: Progress Blackboard panel maintains fixed width with overflow handling
- **Responsive Tables**: Table content scrolls independently of main layout
- **Layout Stability**: Prevents UI layout breaking from wide content
- **Active Agent Styling**: Active agents now highlighted with thicker border (8px) instead of red color to avoid conflicts with agent's default red border
- **Tool Execution Logging**: Tool inputs and outputs now displayed in Progress Blackboard with formatted markdown
- **Active Tool Highlighting**: Tool cards highlighted with 8px border during execution, auto-removes after 3 seconds
- **Tool Execution Timing**: Added 2-second delays to all tool functions for better visibility of active highlighting

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
