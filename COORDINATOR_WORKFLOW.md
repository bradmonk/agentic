# Coordinator-Based Multi-Agent Workflow

## Overview
The system now implements a **coordinator-based multi-agent workflow** where `agent1` serves as the primary coordinator that orchestrates the work of other agents (`agent2`, `agent3`, `agent4`).

## Educational Benefits
This design helps users understand:
- **Real-world multi-agent coordination**: How agents collaborate in practical scenarios
- **Hierarchical task delegation**: How complex tasks get broken down and distributed
- **Agent specialization**: How different agents bring unique capabilities to solve problems
- **Information synthesis**: How coordinated results are combined into comprehensive solutions

## Workflow Phases

### Phase 1: Coordinator Analysis
1. **agent1** receives the user's task description
2. **agent1** analyzes what needs to be accomplished
3. **agent1** reviews available agents and their capabilities:
   - Each agent's system prompt (editable by users)
   - Each agent's available tools (toggled by users via UI)
4. **agent1** decides which agents to call and what specific tasks to assign

### Phase 2: Agent Delegation
1. **agent1** calls specific agents using the format: `CALL [agent_id]: [specific task]`
2. Called agents (`agent2`, `agent3`, `agent4`) execute their assigned tasks
3. Each agent uses their specialized tools and capabilities
4. Agents work independently on their specific assignments

### Phase 3: Reporting Back
1. Each called agent reports findings back to **agent1**
2. **agent1** collects all agent responses
3. **agent1** has access to all the detailed reports and tool results

### Phase 4: Synthesis
1. **agent1** synthesizes all information from called agents
2. **agent1** creates a comprehensive final response
3. **agent1** determines when the original task is complete

## User Controls

### System Prompts (Editable)
Users can modify each agent's system prompt to change:
- Agent personality and approach
- Agent expertise and focus areas
- How the agent interprets and responds to tasks

### Tool Assignment (Toggle Buttons)
Users can enable/disable tools for each agent:
- `tool-search`: Web Search capabilities
- `tool-budget`: Budget Calculator access
- `tool-sheets`: Google Sheets integration
- `tool-calendar`: Calendar Management

### Task Description
Users set the main task in the hamburger menu, which **agent1** receives and coordinates.

## Technical Implementation

### Coordinator Prompt Enhancement
**agent1** receives enhanced context including:
```
You can delegate tasks to these specialized agents:
- Agent Name (agent2): Agent Role | Tools: Tool1, Tool2
- Agent Name (agent3): Agent Role | Tools: Tool3, Tool4
...

Your job is to:
1. Analyze the task and break it down
2. Decide which agents (if any) you need to call
3. Coordinate their work and synthesize final results

For each agent you want to call, clearly state: 'CALL [agent_id]: [specific task description]'
```

### Agent Communication Flow
```
User Task → agent1 (Coordinator) → Specialized Agents → agent1 (Synthesis) → Final Result
```

### Key Functions
- `execute_coordinator_workflow()`: Main coordination logic
- `execute_delegated_agent()`: Handles individual agent execution
- `execute_coordinator_synthesis()`: Final result compilation

## Example Workflow

**User Task**: "Plan a corporate event for 100 people"

1. **agent1**: "I need to break this down. I'll call agent2 for vendor research and agent3 for budget planning."
2. **agent1**: "CALL agent2: Find event venues and catering for 100 people"
3. **agent1**: "CALL agent3: Calculate budget for corporate event with venue and catering costs"
4. **agent2**: Executes venue/catering research, reports back with options
5. **agent3**: Executes budget calculations, reports back with cost breakdown
6. **agent1**: Synthesizes both reports into comprehensive event plan

## Benefits for Learning
- **Realistic AI workflows**: Mirrors how real AI systems coordinate multiple capabilities
- **User experimentation**: Users can modify agent roles and tools to see different outcomes  
- **Transparent coordination**: Users see exactly how the coordinator makes decisions
- **Modular understanding**: Users learn how specialized agents contribute to complex solutions
