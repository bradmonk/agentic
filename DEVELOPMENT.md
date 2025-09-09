## Recent Changes

### Updated Tool Syntax to Single Square Brackets (Latest)
- **Changed from double to single brackets**: Updated syntax from `[[@tool: instruction]]` to `[@tool: instruction]` to match LLM natural usage
- **Updated all parsing functions**: Modified regex patterns in `parse_tool_requirements()` and agent parsing functions
- **Updated system prompts**: Changed coordinator and delegated agent prompts to use new single bracket syntax
- **Improved UX with smart scroll**: Added smart scroll detection to Progress Board - only auto-scrolls if user is near bottom (within 100px)
- **Fixed web search quote issue**: Added automatic quote stripping from search queries to prevent exact string search problems
- **Cleaned up Progress Board UI**: Removed empty `step-details` div and redundant "LLM Response:" header for cleaner display
- **Enhanced tool call visibility**: Modified content extraction to include ALL tool calling syntax in Analysis & Planning phase (not just first tool call)
- **Fixed content extraction logic**: Removed arbitrary 50-character gap limit that was hiding subsequent tool calls from the Analysis & Planning display

## Considerations for Future Development

### Iterative Tool Calling for Delegated Agents
Currently, delegated agents follow a fixed three-phase workflow:
1. **Analysis & Planning** - Initial reasoning and first tool calls
2. **Tool Execution** - Execute tools identified in phase 1
3. **Final Analysis & Recommendations** - Analyze tool results and provide conclusions

**Issue Identified**: Agents sometimes want to call additional tools in phase 3 (e.g., refining search queries based on initial results), but these subsequent tool calls are not executed - they just appear as text.

**Potential Solution**: Implement iterative tool calling where delegated agents can:
- Continue calling tools as needed in multiple cycles
- Decide for themselves when they have sufficient information
- Return control to the coordinating agent only when their task is complete
- Use a completion signal like `[[AGENT_TASK_COMPLETE]]` to indicate they're done

This would make delegated agents more autonomous and capable of thorough research/analysis before reporting back to the coordinator.

### Implemented Streaming Tool Execution with Tool Pattern
- **New tool calling syntax**: Agents now use `[@web_search: query]`, `[@budget: description]`, etc. for consistent tool calls
- **Three-phase execution flow**: 
  1. Agent analysis/planning → Display
  2. Tool execution → Display tool results  
  3. Final reasoning with tool results → Display
- **Real parameter extraction**: Tools now use actual parameters from agent responses instead of hardcoded values
- **Streaming progress display**: Progress Board shows thought process → tool execution → continued reasoning
- **Replaced keyword matching**: Eliminated unreliable keyword-based tool detection with structured pattern parsing
- **Enhanced agent prompts**: Updated system prompts to guide agents toward proper tool calling format
- **Eliminated tool hallucination**: Agents specify tools to call but don't fabricate results

### Fixed User Agent Run Task Button
- **Fixed syntax error in s3-execution.js**: Added missing `generateExecutionId()` function that was causing script to fail to load
- **Button click functionality restored**: User Agent "Run Task" button now properly executes tasks when clicked
- **Enhanced debugging**: Added console logging to track button state changes and user input
- **Improved initialization**: Added setTimeout delay to ensure proper button state initialization after page load
- **Robust condition checking**: Added fallback for `window.isTaskRunning` to prevent undefined state issues

### Fixed s4-interactions.js Module
- **Fixed corrupt JavaScript file**: Repaired s4-interactions.js which had duplicate code blocks and syntax errors
- **Removed duplicate declarations**: Fixed duplicate `const range` declarations causing compilation errors
- **Cleaned up orphaned code**: Removed duplicate event listeners and orphaned code fragments at end of file
- **Restored proper structure**: Fixed missing closing braces and proper IIFE module structure
- **Verified syntax**: File now passes lint validation without errors

### Step-by-Step Workflow Execution
- **Added workflow stepping capability**: Users can now pause workflows and execute them step-by-step
- **New WebSocket message types**: `pause_workflow`, `resume_workflow`, `step_workflow`
- **Backend state management**: Added `workflow_paused`, `workflow_step_mode`, and `step_continuation_event` to AgentMonitor
- **Pause points added**: Workflow now pauses at each major step (coordinator analysis, agent execution, tool calls)
- **Test interface created**: `test_step_ui.html` for testing the step functionality
- **Integration points**: 
  - Coordinator workflow pauses before each iteration and agent call
  - Agent execution pauses before each tool call
  - Step mode executes one action and pauses again

### Task Completion Syntax Update
- **Changed completion syntax**: Updated from `[[TASK_COMPLETE]]` to `[@finished]` for consistency
- **Updated coordinator prompts**: Modified system prompts to use new completion syntax
- **Updated parsing logic**: Detection logic now looks for `[@finished]` instead of `[[TASK_COMPLETE]]`

### Tool Hallucination Fix
- **Fixed tool instruction logic**: Agents without tools no longer receive tool calling instructions
- **Conditional tool instructions**: Tool syntax only provided when `available_tools` is not empty
- **Explicit no-tool messaging**: Agents without tools get clear instructions not to reference tools
- **Prevented hypothetical tool calls**: Eliminated hallucinated tool references when no tools available