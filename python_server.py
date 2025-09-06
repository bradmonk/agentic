#!/usr/bin/env python3
"""
LangGraph Agent Interface - Python WebSocket Server
Real-time monitoring server for LangGraph agent workflows
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from datetime import datetime

# Import LLM integration
from llm_integration import llm_manager
from tools import ToolExecutor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentMonitor:
    """Monitors and tracks agent state and execution"""
    
    def __init__(self):
        self.agents: Dict[str, Dict] = {}
        self.tools: Dict[str, Dict] = {}
        self.clients: set = set()
        self.activity_log: List[Dict] = []
        self.workflow_running = False
        self.current_workflow_task = None
        # Add LLM manager
        self.llm_manager = llm_manager
        # Add tool executor
        self.tool_executor = ToolExecutor(monitor=self)
    
    def add_agent(self, name: str, prompt: str, tools: List[str] = None, agents: List[str] = None, 
                  agent_id: str = None, border_color: str = None, role: str = None):
        """Register a new agent for monitoring"""
        # Generate ID if not provided
        if not agent_id:
            agent_id = f"agent-{name.lower().replace(' ', '-')}"
        
        # Default colors for different agents
        color_map = {
            'agent1': '#3b82f6',
            'agent2': '#10b981', 
            'agent3': '#f59e0b',
            'agent4': '#ef4444'
        }
        
        # Store by agent ID instead of name
        self.agents[agent_id] = {
            'id': agent_id,
            'name': name,
            'role': role or name,
            'status': 'idle',
            'prompt': prompt,
            'context': '2048 tokens',
            'borderColor': border_color or color_map.get(agent_id, '#6b7280'),
            'interactions': tools or [],  # Frontend expects 'interactions' not 'interactsWith'
            'interactsWith': {
                'tools': tools or [],
                'agents': agents or []
            },
            'last_active': None,
            'execution_count': 0
        }
        logger.info(f"Registered agent: {name} ({agent_id})")
    
    def add_tool(self, name: str, description: str, inputs: List[str] = None, outputs: List[str] = None,
                 tool_id: str = None, status: str = 'available'):
        """Register a new tool for monitoring"""
        # Generate ID if not provided
        if not tool_id:
            tool_id = f"tool-{name.lower().replace(' ', '-')}"
            
        self.tools[name] = {
            'id': tool_id,
            'name': name,
            'description': description,
            'status': status,
            'inputs': inputs or [],
            'outputs': outputs or [],
            'execution_count': 0,
            'last_active': None
        }
    async def start_workflow(self, llm_config: Dict[str, Any]):
        """Start a workflow with specified LLM configuration"""
        if self.workflow_running:
            raise Exception("Workflow is already running")
        
        self.workflow_running = True
        
        try:
            from langgraph_workflow import run_monitored_workflow
            self.current_workflow_task = asyncio.create_task(
                run_monitored_workflow(llm_config)
            )
            await self.current_workflow_task
            
        except Exception as e:
            logger.error(f"Workflow error: {e}")
            raise e
        finally:
            self.workflow_running = False
            self.current_workflow_task = None
    
    async def stop_workflow(self):
        """Stop the currently running workflow"""
        if self.current_workflow_task and not self.current_workflow_task.done():
            self.current_workflow_task.cancel()
            try:
                await self.current_workflow_task
            except asyncio.CancelledError:
                pass
        
        self.workflow_running = False
        self.current_workflow_task = None
        await self.log_activity("System", "INFO", "Workflow stopped by user")

    async def get_available_models(self, provider: str) -> List[str]:
        """Get available models for a provider"""
        try:
            return await llm_manager.get_available_models(provider)
        except Exception as e:
            logger.error(f"Error getting models for {provider}: {e}")
            return []
    
    async def log_activity(self, source: str, activity_type: str, content: str):
        """Log activity to the blackboard"""
        log_entry = {
            'source': source,
            'type': activity_type,
            'content': content,
            'timestamp': datetime.now().isoformat()
        }
        self.activity_log.append(log_entry)
        
        # Broadcast to all connected clients
        if self.clients:
            message = {
                'type': 'log',
                'payload': log_entry
            }
            await self.broadcast(message)
    
    async def set_active(self, name: str):
        """Set the currently active agent or tool"""
        if self.clients:
            message = {
                'type': 'active',
                'payload': {'name': name}
            }
            await self.broadcast(message)
    
    async def update_agent_context(self, agent_id: str, context: str):
        """Update an agent's context window"""
        if agent_id in self.agents:
            self.agents[agent_id]['context'] = context
            self.agents[agent_id]['last_active'] = datetime.now().isoformat()
            self.agents[agent_id]['execution_count'] += 1
            
            if self.clients:
                message = {
                    'type': 'update',
                    'payload': {
                        'agentId': agent_id,
                        'agentName': self.agents[agent_id]['name'],
                        'context': context
                    }
                }
                await self.broadcast(message)
    
    async def broadcast(self, message: Dict):
        """Broadcast message to all connected clients"""
        if self.clients:
            disconnected = set()
            for client in self.clients:
                try:
                    await client.send(json.dumps(message))
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
            
            # Remove disconnected clients
            self.clients -= disconnected
    
    async def send_initial_state(self, websocket):
        """Send initial configuration to newly connected client"""
        message = {
            'type': 'init',
            'payload': {
                'agents': list(self.agents.values()),
                'tools': list(self.tools.values())
            }
        }
        await websocket.send(json.dumps(message))
        
        # Send recent activity log
        for log_entry in self.activity_log[-10:]:  # Last 10 entries
            log_message = {
                'type': 'log',
                'payload': log_entry
            }
            await websocket.send(json.dumps(log_message))

# Global monitor instance
monitor = AgentMonitor()

async def handle_client(websocket):
    """Handle new WebSocket client connections"""
    logger.info(f"Client connected from {websocket.remote_address}")
    monitor.clients.add(websocket)
    
    try:
        # Send initial state to new client
        await monitor.send_initial_state(websocket)
        
        # Send available models for each provider
        try:
            ollama_models = await monitor.get_available_models("ollama")
            if ollama_models:
                await websocket.send(json.dumps({
                    "type": "models_available",
                    "payload": {"provider": "ollama", "models": ollama_models}
                }))
        except Exception as e:
            logger.warning(f"Could not get Ollama models: {e}")
        
        # Keep connection alive and handle incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                await handle_client_message(websocket, data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {message}")
    
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected")
    finally:
        monitor.clients.discard(websocket)

async def handle_client_message(websocket, data):
    """Handle messages from clients"""
    message_type = data.get("type")
    payload = data.get("payload", {})
    
    try:
        if message_type == "start_workflow":
            if monitor.workflow_running:
                await websocket.send(json.dumps({
                    "type": "workflow_error",
                    "payload": {"error": "Workflow is already running"}
                }))
                return
            
            # Start workflow in background
            asyncio.create_task(run_workflow_with_error_handling(payload))
            
        elif message_type == "run_task":
            if monitor.workflow_running:
                await websocket.send(json.dumps({
                    "type": "task_error", 
                    "payload": {"error": "Workflow is already running"}
                }))
                return
            
            # Start real LLM task execution
            asyncio.create_task(run_real_task_execution(payload))
            
        elif message_type == "stop_workflow":
            await monitor.stop_workflow()
            await monitor.broadcast({
                "type": "workflow_complete",
                "payload": {}
            })
            
        elif message_type == "get_models":
            provider = payload.get("provider")
            if provider:
                models = await monitor.get_available_models(provider)
                await websocket.send(json.dumps({
                    "type": "models_available",
                    "payload": {"provider": provider, "models": models}
                }))
        
        elif message_type == "test_tool":
            tool_name = payload.get("tool_name")
            tool_params = payload.get("parameters", {})
            
            if tool_name:
                result = await monitor.tool_executor.execute_tool(tool_name, **tool_params)
                await websocket.send(json.dumps({
                    "type": "tool_result",
                    "payload": {
                        "tool_name": tool_name,
                        "result": result,
                        "parameters": tool_params
                    }
                }))
            else:
                await websocket.send(json.dumps({
                    "type": "error",
                    "payload": {"error": "Tool name required for testing"}
                }))
        
        elif message_type == "get_tools":
            available_tools = monitor.tool_executor.get_available_tools()
            tool_schemas = {}
            for tool_name in available_tools:
                tool_schemas[tool_name] = monitor.tool_executor.get_tool_schema(tool_name)
            
            await websocket.send(json.dumps({
                "type": "tools_available", 
                "payload": {
                    "tools": available_tools,
                    "schemas": tool_schemas
                }
            }))
        
        logger.info(f"Handled client message: {message_type}")
        
    except Exception as e:
        logger.error(f"Error handling client message: {e}")
        await websocket.send(json.dumps({
            "type": "error",
            "payload": {"error": str(e)}
        }))

async def run_real_task_execution(task_data):
    """Execute task using coordinator-based multi-agent workflow"""
    try:
        task_description = task_data.get('task', '')
        execution_id = task_data.get('executionId', '')
        agents = task_data.get('agents', [])
        
        # Notify start
        await monitor.broadcast({
            "type": "task_started",
            "payload": {"executionId": execution_id, "task": task_description}
        })
        
        # Get LLM configuration from first connected client or use defaults
        provider = "ollama"  # Default to Ollama
        model = "llama3.1:latest"  # Default model
        
        # Set up LLM provider
        await monitor.llm_manager.set_provider(provider, model)
        
        # Find agent1 (the coordinator) and other agents
        coordinator = None
        other_agents = {}
        
        for agent in agents:
            agent_id = agent.get('id', '')
            if agent_id == 'agent1':
                coordinator = agent
            else:
                other_agents[agent_id] = agent
        
        if not coordinator:
            raise Exception("agent1 (coordinator) not found in agents list")
        
        # Build coordinator's knowledge of other agents and their capabilities
        agent_capabilities = []
        for agent_id, agent_data in other_agents.items():
            agent_name = agent_data.get('name', agent_id)
            agent_prompt = agent_data.get('prompt', '')
            agent_tools = agent_data.get('tools', [])
            
            # Get tool names for this agent
            tool_names = []
            tool_map = {
                "tool-search": "Web Search",
                "tool-budget": "Budget Calculator", 
                "tool-sheets": "Google Sheets",
                "tool-calendar": "Calendar Manager"
            }
            for tool_id in agent_tools:
                tool_name = tool_map.get(tool_id, tool_id)
                tool_names.append(tool_name)
            
            agent_capabilities.append({
                "id": agent_id,
                "name": agent_name,
                "role": agent_prompt.split('.')[0] if '.' in agent_prompt else agent_prompt[:100],
                "tools": tool_names
            })
        
        # Execute coordinator workflow
        await execute_coordinator_workflow(
            coordinator, other_agents, agent_capabilities, 
            task_description, execution_id, provider, model
        )
        
        # Send completion notification
        await monitor.broadcast({
            "type": "task_completed",
            "payload": {"executionId": execution_id}
        })
        
    except Exception as e:
        logger.error(f"Error in coordinator task execution: {e}")
        await monitor.broadcast({
            "type": "task_error",
            "payload": {"error": str(e)}
        })


async def execute_coordinator_workflow(coordinator, other_agents, agent_capabilities, task_description, execution_id, provider, model):
    """Execute the coordinator-based workflow"""
    
    # Phase 1: Coordinator analyzes task and decides what agents to call
    coordinator_id = coordinator.get('id', 'agent1')
    coordinator_name = coordinator.get('name', 'Coordinator')
    coordinator_prompt = coordinator.get('prompt', '')
    coordinator_tools = coordinator.get('tools', [])
    
    # Build available tools for coordinator
    available_tools = await build_agent_tools(coordinator_tools)
    
    # Create coordinator's initial analysis prompt
    capabilities_summary = "\n".join([
        f"- {cap['name']} ({cap['id']}): {cap['role']} | Tools: {', '.join(cap['tools'])}"
        for cap in agent_capabilities
    ])
    
    # Update coordinator's system prompt with new syntax and iterative capability
    coordinator_messages = [
        {
            "role": "system",
            "content": f"You are {coordinator_name}. {coordinator_prompt}\n\n" +
            f"You are the primary coordinator agent. You have access to these tools: {', '.join([t['function']['name'] for t in available_tools])}.\n\n" +
            "You can also delegate tasks to these specialized agents:\n" +
            capabilities_summary + "\n\n" +
            "AGENT CALLING SYNTAX:\n" +
            "To call another agent, use: [[@agent_id: specific task instructions]]\n" +
            "Examples:\n" +
            "- [[@agent2: Research wedding venues in San Diego for 50 people under $5000]]\n" +
            "- [[@agent3: Calculate total budget breakdown for $20000 wedding]]\n" +
            "- [[@agent4: Schedule wedding timeline with 3pm ceremony start]]\n\n" +
            "COMPLETION SYNTAX:\n" +
            "When the entire task is complete, end with: [[TASK_COMPLETE]]\n\n" +
            "WORKFLOW:\n" +
            "1. Analyze the task and break it down\n" +
            "2. Call specific agents using the [[@agent_id: instructions]] syntax\n" +
            "3. Wait for their responses, then continue thinking\n" +
            "4. Call additional agents or iterate as needed\n" +
            "5. When everything is complete, use [[TASK_COMPLETE]]\n\n" +
            "Remember: You can think step-by-step, call agents multiple times, and decide when the task is truly finished.\n" +
            "Use markdown formatting for clear communication."
        },
        {
            "role": "user",
            "content": f"Task: {task_description}\n\n" +
            "Please analyze this task and coordinate the appropriate agents to complete it. " +
            "You can call agents iteratively and decide when the task is finished."
        }
    ]
    
    # Execute iterative coordinator workflow
    max_iterations = 8
    iteration = 0
    agent_responses = {}
    
    while iteration < max_iterations:
        iteration += 1
        print(f"=== COORDINATOR ITERATION {iteration} ===")
        
        # Send coordinator thinking notification
        await monitor.broadcast({
            "type": "execution_step", 
            "payload": {
                "executionId": execution_id,
                "agent": coordinator_id,
                "agentName": coordinator_name,
                "status": "running",
                "action": f"Coordinator Analysis (Iteration {iteration})"
            }
        })
        
        # Get coordinator response
        coordinator_response = await monitor.llm_manager.generate(coordinator_messages, tools=available_tools if available_tools else None)
        
        # Send coordinator response to UI
        await monitor.broadcast({
            "type": "execution_step",
            "payload": {
                "executionId": execution_id,
                "agent": coordinator_id,
                "agentName": coordinator_name,
                "status": "completed",
                "action": f"Coordinator Response (Iteration {iteration})",
                "response": coordinator_response,
                "details": {"iteration": iteration}
            }
        })
        
        # Add coordinator response to conversation history
        coordinator_messages.append({"role": "assistant", "content": coordinator_response})
        
        # Check for task completion
        if "[[TASK_COMPLETE]]" in coordinator_response:
            print("Coordinator marked task as complete")
            break
            
        # Parse agent calls with new syntax (primary) and old syntax (fallback)
        called_agents = parse_agent_calls_new_syntax(coordinator_response)
        if not called_agents:
            called_agents = parse_agent_calls_old_syntax(coordinator_response) 
            
        if called_agents:
            print(f"Found {len(called_agents)} agent calls in iteration {iteration}")
            
            # Execute each called agent
            iteration_responses = []
            for agent_id, task in called_agents:
                if agent_id in other_agents:
                    agent_data = other_agents[agent_id]
                    response = await execute_delegated_agent(
                        agent_data, task, task_description, 
                        execution_id, provider, model
                    )
                    agent_responses[f"{agent_id}_iter_{iteration}"] = response
                    iteration_responses.append(f"**{agent_data['name']} ({agent_id}) Response:**\n{response}")
                    
                    # Small delay between agents
                    await asyncio.sleep(1)
            
            # Add agent responses to coordinator history for next iteration
            if iteration_responses:
                agent_summary = "\n".join(iteration_responses)
                coordinator_messages.append({
                    "role": "user", 
                    "content": f"Agent responses from iteration {iteration}:\n\n{agent_summary}\n\nBased on these responses, continue coordinating or mark task complete with [[TASK_COMPLETE]] if finished."
                })
        else:
            # No agent calls found, prompt coordinator to continue or complete
            print("No agent calls found, prompting coordinator to continue or complete")
            coordinator_messages.append({
                "role": "user",
                "content": "No agent calls detected. Please either:\n1. Call specific agents using [[@agent_id: instructions]] syntax, or\n2. Mark the task complete with [[TASK_COMPLETE]] if finished."
            })
    
    if iteration >= max_iterations:
        print("Coordinator workflow reached maximum iterations")
        await monitor.broadcast({
            "type": "execution_step",
            "payload": {
                "executionId": execution_id,
                "agent": coordinator_id,
                "agentName": coordinator_name,
                "status": "completed",
                "action": "Maximum Iterations Reached",
                "response": "Task coordination completed after maximum iterations. Please review the agent responses above for results.",
                "details": {"final_iteration": iteration}
            }
        })
    
    print(f"Coordinator workflow completed after {iteration} iterations")


def parse_agent_calls_new_syntax(response):
    """
    Parse agent calls using new [[@agent_id: instructions]] syntax.
    Returns list of tuples: [(agent_id, task), ...]
    """
    import re
    calls = []
    
    # Look for [[@agent_id: instructions]] pattern
    pattern = r'\[\[@(agent\d+):\s*([^\]]+)\]\]'
    matches = re.findall(pattern, response, re.DOTALL)
    
    for agent_id, task in matches:
        task = task.strip()
        if agent_id and task:
            calls.append((agent_id, task))
            print(f"Found agent call: {agent_id} -> {task[:50]}...")
    
    print(f"Parsed {len(calls)} agent calls with new syntax")
    return calls

def parse_agent_calls_old_syntax(response):
    """
    Parse agent calls using old CALL syntax (fallback).
    Returns list of tuples: [(agent_id, task), ...]
    """
    import re
    calls = []
    lines = response.split('\n')
    
    for line in lines:
        line = line.strip()
        # Look for CALL anywhere in the line
        if 'CALL ' in line:
            # Extract the CALL part using regex to handle various formats
            call_match = re.search(r'CALL\s+(agent\d+).*?:\s*["\']?([^"\']*?)["\']?(?:\*\*)?$', line, re.IGNORECASE)
            if call_match:
                agent_id = call_match.group(1)
                task = call_match.group(2).strip()
                if agent_id and task:
                    calls.append((agent_id, task))
            else:
                # Fallback: try simpler parsing
                if 'CALL agent' in line and ':' in line:
                    agent_match = re.search(r'agent(\d+)', line)
                    if agent_match:
                        agent_id = f"agent{agent_match.group(1)}"
                        colon_index = line.find(':')
                        if colon_index != -1:
                            task = line[colon_index + 1:].strip()
                            task = re.sub(r'^["\'\*\s]+|["\'\*\s]+$', '', task)
                            if agent_id and task:
                                calls.append((agent_id, task))
    
    return calls


async def execute_delegated_agent(agent_data, delegated_task, original_task, execution_id, provider, model):
    """Execute a specific agent called by the coordinator"""
    
    agent_id = agent_data.get('id', '')
    agent_name = agent_data.get('name', 'Agent')
    agent_prompt = agent_data.get('prompt', '')
    agent_tools = agent_data.get('tools', [])
    
    # Build available tools for this agent
    available_tools = await build_agent_tools(agent_tools)
    
    # Create agent's task prompt
    messages = [
        {
            "role": "system", 
            "content": f"You are {agent_name}. {agent_prompt}\n\n" +
            f"You have been called by the coordinator agent to help with a specific task.\n\n" +
            f"You have access to these tools: {', '.join([t['function']['name'] for t in available_tools])}.\n\n" +
            "Provide a clear, detailed response about your findings. " +
            "When you're finished, clearly state your conclusion and any recommendations."
        },
        {
            "role": "user",
            "content": f"Original Task: {original_task}\n\n" +
            f"Your Specific Assignment: {delegated_task}\n\n" +
            "Please complete your assignment and report your findings back to the coordinator."
        }
    ]
    
    # Send agent start notification
    await monitor.broadcast({
        "type": "execution_step",
        "payload": {
            "executionId": execution_id,
            "agent": agent_id,
            "agentName": agent_name,
            "status": "running",
            "action": f"Working on delegated task: {delegated_task}"
        }
    })
    
    # Execute agent task
    try:
        response = await monitor.llm_manager.generate(messages, tools=available_tools if available_tools else None)
        
        # Execute any tools mentioned in the response (simple keyword matching)
        await execute_simple_tools(agent_tools, response, execution_id)
        
        await monitor.broadcast({
            "type": "execution_step",
            "payload": {
                "executionId": execution_id,
                "agent": agent_id,
                "agentName": agent_name,
                "status": "completed",
                "action": f"Completed: {delegated_task}",
                "response": response,
                "details": {
                    "Delegated Task": delegated_task,
                    "Tools Available": [t['function']['name'] for t in available_tools]
                }
            }
        })
        
        return response
        
    except Exception as e:
        await monitor.broadcast({
            "type": "execution_step",
            "payload": {
                "executionId": execution_id,
                "agent": agent_id,
                "agentName": agent_name,
                "status": "error",
                "action": f"Error in delegated task",
                "response": f"Error: {str(e)}",
                "details": {"Error": str(e)}
            }
        })
        return f"Error: {str(e)}"


async def execute_coordinator_synthesis(coordinator, agent_responses, task_description, execution_id, provider, model):
    """Coordinator synthesizes final results from all agent responses"""
    
    coordinator_id = coordinator.get('id', 'agent1')
    coordinator_name = coordinator.get('name', 'Coordinator')
    coordinator_prompt = coordinator.get('prompt', '')
    coordinator_tools = coordinator.get('tools', [])
    
    # Build available tools for coordinator
    available_tools = await build_agent_tools(coordinator_tools)
    
    # Prepare agent responses for synthesis
    responses_summary = ""
    for agent_id, response in agent_responses.items():
        agent_name = agent_id  # Could be enhanced to get actual name
        responses_summary += f"\n\n=== {agent_name} Report ===\n{response}"
    
    # Create synthesis prompt
    messages = [
        {
            "role": "system",
            "content": f"You are {coordinator_name}. {coordinator_prompt}\n\n" +
            "You are now synthesizing the final results. You have received reports from the agents you called.\n" +
            "Provide a comprehensive final answer that addresses the original task completely."
        },
        {
            "role": "user",
            "content": f"Original Task: {task_description}\n\n" +
            f"Agent Reports:{responses_summary}\n\n" +
            "Please provide your final comprehensive response that synthesizes all the information and fully addresses the original task."
        }
    ]
    
    # Send synthesis start notification
    await monitor.broadcast({
        "type": "execution_step",
        "payload": {
            "executionId": execution_id,
            "agent": coordinator_id,
            "agentName": coordinator_name,
            "status": "running",
            "action": "Synthesizing final results from all agent reports..."
        }
    })
    
    # Get final synthesis
    final_response = await monitor.llm_manager.generate(messages, tools=available_tools if available_tools else None)
    
    await monitor.broadcast({
        "type": "execution_step",
        "payload": {
            "executionId": execution_id,
            "agent": coordinator_id,
            "agentName": coordinator_name,
            "status": "completed",
            "action": "Final task synthesis completed",
            "response": final_response,
            "details": {
                "Agents Called": len(agent_responses),
                "Final Status": "Task Complete"
            }
        }
    })


async def build_agent_tools(agent_tools):
    """Build available tools list for an agent"""
    available_tools = []
    tool_schemas = monitor.tool_executor.get_available_tools()
    
    tool_map = {
        "tool-search": "Web Search",
        "tool-budget": "Budget Calculator", 
        "tool-sheets": "Google Sheets",
        "tool-calendar": "Calendar Manager"
    }
    
    for tool_id in agent_tools:
        actual_tool_name = tool_map.get(tool_id, tool_id)
        if actual_tool_name in tool_schemas:
            schema = monitor.tool_executor.get_tool_schema(actual_tool_name)
            available_tools.append({
                "type": "function",
                "function": {
                    "name": actual_tool_name.replace(" ", "_").lower(),
                    "description": tool_schemas[actual_tool_name],
                    "parameters": schema.get("parameters", {})
                }
            })
    
    return available_tools


async def execute_simple_tools(agent_tools, response, execution_id):
    """Execute simple tool detection and execution"""
    tool_map = {
        "tool-search": "Web Search",
        "tool-budget": "Budget Calculator", 
        "tool-sheets": "Google Sheets", 
        "tool-calendar": "Calendar Manager"
    }
    
    # Simple keyword-based tool execution
    if "search" in response.lower() and "tool-search" in agent_tools:
        await monitor.broadcast({
            "type": "tool_execution",
            "payload": {
                "executionId": execution_id,
                "tool_name": "Web Search",
                "tool_id": "tool-search",
                "status": "starting",
                "timestamp": datetime.now().isoformat()
            }
        })
        
        # Execute search tool with extracted query
        search_result = await monitor.tool_executor.execute_tool(
            "Web Search", 
            query="task requirements search",
            max_results=3
        )
        
        await monitor.broadcast({
            "type": "tool_execution",
            "payload": {
                "executionId": execution_id,
                "tool_name": "Web Search",
                "tool_id": "tool-search",
                "status": "completed",
                "inputs": {"query": "task requirements search"},
                "outputs": search_result,
                "timestamp": datetime.now().isoformat()
            }
        })

async def run_workflow_with_error_handling(llm_config):
    """Run workflow with proper error handling and client notification"""
    try:
        await monitor.start_workflow(llm_config)
        await monitor.broadcast({
            "type": "workflow_complete",
            "payload": {}
        })
    except Exception as e:
        await monitor.broadcast({
            "type": "workflow_error",
            "payload": {"error": str(e)}
        })

async def setup_demo_agents():
    """Set up demo agents and tools for testing"""
    # Register demo agents - matching frontend data structure
    monitor.add_agent(
        "Vision Agent",
        "You are a vision agent responsible for understanding project requirements and coordinating with other agents.",
        tools=["tool-search", "tool-calendar", "tool-budget"],
        agents=["agent2", "agent3"],
        agent_id="agent1",
        role="Project Coordinator"
    )
    
    monitor.add_agent(
        "Vendor Agent", 
        "You are a vendor research agent specialized in finding and evaluating service providers.",
        tools=["tool-search", "tool-sheets"],
        agents=["agent1", "agent3"],
        agent_id="agent2",
        role="Vendor Research"
    )
    
    monitor.add_agent(
        "Budget Agent",
        "You are a financial analysis agent focused on budget planning and cost optimization.",
        tools=["tool-budget", "tool-calendar"],
        agents=["agent1", "agent4"],
        agent_id="agent3",
        role="Financial Analysis"
    )
    
    monitor.add_agent(
        "Schedule Agent",
        "You are a scheduling agent responsible for timeline coordination and resource allocation.",
        tools=["tool-calendar", "tool-sheets"],
        agents=["agent1", "agent3"],
        agent_id="agent4",
        role="Timeline Management"
    )
    
    # Register demo tools - matching frontend data structure
    monitor.add_tool(
        "Web Search",
        "Search the web for information, vendors, and services",
        inputs=["query", "filters"],
        outputs=["results", "links"],
        tool_id="tool-search"
    )
    
    monitor.add_tool(
        "Google Sheets",
        "Create, read, and update Google Sheets spreadsheets",
        inputs=["action", "spreadsheet_id", "data"],
        outputs=["result", "url", "data"],
        tool_id="tool-sheets"
    )
    
    monitor.add_tool(
        "Calendar Manager",
        "Schedule events and manage timelines",
        inputs=["date", "time", "duration"],
        outputs=["event_id", "availability"],
        tool_id="tool-calendar"
    )
    
    monitor.add_tool(
        "Budget Calculator",
        "Calculate costs and manage budgets",
        inputs=["items", "quantities", "prices"],
        outputs=["total_cost", "breakdown"],
        tool_id="tool-budget"
    )
    
    logger.info("Demo agents and tools configured")

async def run_langgraph_workflow():
    """Run the actual LangGraph workflow"""
    try:
        from langgraph_workflow import run_monitored_workflow
        await run_monitored_workflow()
    except ImportError:
        logger.warning("LangGraph workflow not available, running simulation instead")
        await simulate_workflow()

async def simulate_workflow():
    """Simulate coordinator-based workflow for demonstration"""
    await asyncio.sleep(5)  # Wait for potential client connections
    
    # New coordinator-based workflow simulation
    workflow_steps = [
        # Phase 1: Coordinator Analysis
        ("agent1", "Analyzing project requirements and determining needed expertise..."),
        ("agent1", "Identifying which agents to call: Vendor Agent for research, Budget Agent for cost analysis"),
        
        # Phase 2: Coordinator calls specific agents
        ("agent2", "Called by coordinator: Research wedding venues and catering options"),
        ("Web Search", "Executing search for wedding venues and catering services"),
        ("agent2", "Evaluating vendor options and preparing recommendations"),
        
        ("agent3", "Called by coordinator: Calculate budget allocation and cost optimization"),
        ("Budget Calculator", "Processing cost breakdown for venues and catering"),
        ("agent3", "Optimizing budget distribution and creating financial recommendations"),
        
        # Phase 3: Agents report back to coordinator
        ("agent2", "Reporting findings back to coordinator: Top 3 venue recommendations with pros/cons"),
        ("agent3", "Reporting findings back to coordinator: Budget analysis with cost breakdown"),
        
        # Phase 4: Coordinator synthesis
        ("agent1", "Synthesizing all agent reports and creating final comprehensive plan"),
        ("Google Sheets", "Creating master project tracking spreadsheet"),
        ("agent1", "Final recommendation: Complete wedding planning strategy with timeline and budget")
    ]
    
    for step_name, activity in workflow_steps:
        if not monitor.clients:
            await asyncio.sleep(2)
            continue
            
        await monitor.set_active(step_name)
        await asyncio.sleep(1)
        
        # Check if this is an agent step (agent1, agent2, etc.) or tool step
        is_agent_step = step_name.startswith('agent')
        
        if is_agent_step:
            # Find the agent by ID
            if step_name in monitor.agents:
                agent_data = monitor.agents[step_name]
                agent_name = agent_data['name']
                
                context_message = f"Current context: {activity}\n\nExecuting workflow step with full agent context..."
                await monitor.update_agent_context(step_name, context_message)
                await monitor.log_activity(agent_name, "MESSAGE", context_message)
                await asyncio.sleep(2)
                
                response = f"Agent {agent_name} completed task: {activity}"
                await monitor.log_activity(agent_name, "RESPONSE", response)
        else:
            # Tool activity
            await monitor.log_activity(step_name, "EXECUTION", f"Tool executed: {activity}")
        
        await asyncio.sleep(3)
    
    await monitor.set_active("")
    await monitor.log_activity("System", "INFO", "Workflow simulation completed successfully")

async def main():
    """Main server function"""
    # Set up demo configuration
    await setup_demo_agents()
    
    # Start WebSocket server
    logger.info("Starting WebSocket server on localhost:8080")
    server = await websockets.serve(handle_client, "localhost", 8080)
    
    logger.info("Server ready - connect your browser to see the interface")
    logger.info("LLM Integration ready - OpenAI and Ollama support available")
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
