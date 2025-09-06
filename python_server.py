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
            'Vision Agent': '#3b82f6',
            'Vendor Agent': '#10b981', 
            'Budget Agent': '#f59e0b',
            'Schedule Agent': '#ef4444'
        }
        
        self.agents[name] = {
            'id': agent_id,
            'name': name,
            'role': role or name,
            'status': 'idle',
            'prompt': prompt,
            'context': '2048 tokens',
            'borderColor': border_color or color_map.get(name, '#6b7280'),
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
    
    async def update_agent_context(self, agent_name: str, context: str):
        """Update an agent's context window"""
        if agent_name in self.agents:
            self.agents[agent_name]['context'] = context
            self.agents[agent_name]['last_active'] = datetime.now().isoformat()
            self.agents[agent_name]['execution_count'] += 1
            
            if self.clients:
                message = {
                    'type': 'update',
                    'payload': {
                        'agentName': agent_name,
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
    """Execute task using real LLM integration"""
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
        
        # Process each agent with real LLM calls and tool execution
        for i, agent in enumerate(agents):
            agent_name = agent.get('name', 'Unknown Agent')
            agent_prompt = agent.get('prompt', '')
            agent_tools = agent.get('tools', [])
            
            # Create tool functions schema for LLM
            available_tools = []
            tool_schemas = monitor.tool_executor.get_available_tools()
            
            for tool_name in agent_tools:
                # Map agent tool IDs to actual tool names
                tool_map = {
                    "tool-search": "Web Search",
                    "tool-budget": "Budget Calculator", 
                    "tool-sheets": "Google Sheets",
                    "tool-calendar": "Calendar Manager"
                }
                
                actual_tool_name = tool_map.get(tool_name, tool_name)
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
            
            # Create specific prompt for this agent
            messages = [
                {
                    "role": "system",
                    "content": f"You are {agent_name}. {agent_prompt}\n\nYou have access to the following tools: {', '.join([t['function']['name'] for t in available_tools])}.\n\nProvide a clear, actionable response about your findings and recommendations. Format your response using markdown for better readability:\n- Use **bold** for key points\n- Use bullet points for lists\n- Use headings (##) for sections\n- Use code blocks for technical details\n\nUse tools when needed to gather information or perform calculations."
                },
                {
                    "role": "user", 
                    "content": f"Task: {task_description}\n\nAnalyze this task and provide your specific findings and recommendations as {agent_name}. Use available tools if they would help with your analysis. Format your response with clear markdown structure."
                }
            ]
            
            # Send step start notification
            await monitor.broadcast({
                "type": "execution_step",
                "payload": {
                    "executionId": execution_id,
                    "agent": agent_name,
                    "status": "running",
                    "action": f"Analyzing task as {agent_name}..."
                }
            })
            
            try:
                # Get real LLM response with tool support
                response = await monitor.llm_manager.generate(messages, tools=available_tools if available_tools else None)
                
                # Check if response contains tool calls (for future enhancement)
                # For now, we'll process the response as-is since Ollama doesn't support function calling yet
                
                # Execute any tools mentioned in the response (simple keyword matching for now)
                tool_results = []
                tool_executions = []
                pending_tool_broadcasts = []  # Store tool broadcasts to send after agent response
                
                if "search" in response.lower() and any("search" in tool['function']['name'] for tool in available_tools):
                    # Send immediate tool activation message for UI highlighting
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
                    
                    # Example: extract search query from response and execute
                    search_query = f"{task_description} {agent_name}"
                    search_result = await monitor.tool_executor.execute_tool(
                        "Web Search", 
                        query=search_query,
                        max_results=3
                    )
                    
                    # Store tool completion broadcast for later sending (chronological ordering)
                    pending_tool_broadcasts.append({
                        "type": "tool_execution",
                        "payload": {
                            "executionId": execution_id,
                            "tool_name": "Web Search",
                            "tool_id": "tool-search",
                            "inputs": {"query": search_query, "max_results": 3},
                            "outputs": search_result,
                            "status": "completed",
                            "timestamp": datetime.now().isoformat()
                        }
                    })
                    
                    tool_results.append(f"Search results: {search_result.get('results_count', 0)} items found")
                    tool_executions.append({
                        "tool": "Web Search",
                        "query": search_query,
                        "results": search_result.get('results_count', 0)
                    })
                
                # Check for budget calculation tools
                if any(word in response.lower() for word in ["budget", "cost", "calculate", "price"]) and any("budget" in tool['function']['name'].lower() for tool in available_tools):
                    # Send immediate tool activation message for UI highlighting
                    await monitor.broadcast({
                        "type": "tool_execution",
                        "payload": {
                            "executionId": execution_id,
                            "tool_name": "Budget Calculator",
                            "tool_id": "tool-budget",
                            "status": "starting",
                            "timestamp": datetime.now().isoformat()
                        }
                    })
                    
                    # Example budget calculation
                    budget_params = {
                        "items": [
                            {"name": "Planning Phase", "cost": 5000},
                            {"name": "Development Phase", "cost": 15000},
                            {"name": "Testing Phase", "cost": 3000}
                        ],
                        "tax_rate": 0.08
                    }
                    budget_result = await monitor.tool_executor.execute_tool(
                        "Budget Calculator",
                        **budget_params
                    )
                    
                    # Store tool completion broadcast for later sending (chronological ordering)
                    pending_tool_broadcasts.append({
                        "type": "tool_execution",
                        "payload": {
                            "executionId": execution_id,
                            "tool_name": "Budget Calculator",
                            "tool_id": "tool-budget",
                            "inputs": budget_params,
                            "outputs": budget_result,
                            "status": "completed",
                            "timestamp": datetime.now().isoformat()
                        }
                    })
                    
                    tool_results.append(f"Budget calculated: ${budget_result.get('total_with_tax', 0):.2f} total")
                    tool_executions.append({
                        "tool": "Budget Calculator",
                        "total": budget_result.get('total_with_tax', 0)
                    })
                
                # Combine LLM response with tool results
                if tool_results:
                    response += f"\n\nTool execution results:\n" + "\n".join(tool_results)
                
                # Send step completion with real response
                await monitor.broadcast({
                    "type": "execution_step",
                    "payload": {
                        "executionId": execution_id,
                        "agent": agent_name,
                        "status": "completed",
                        "action": f"Completed analysis as {agent_name}",
                        "response": response.strip(),
                        "details": {
                            "Provider": provider,
                            "Model": model,
                            "Tools Available": agent_tools
                        }
                    }
                })
                
                # Send tool execution broadcasts after agent response, with slight delay for proper chronological ordering
                if pending_tool_broadcasts:
                    await asyncio.sleep(0.5)  # Small delay to ensure agent response appears first in UI
                    for tool_broadcast in pending_tool_broadcasts:
                        await monitor.broadcast(tool_broadcast)
                        await asyncio.sleep(0.1)  # Small gap between multiple tools for readability
                
            except Exception as e:
                # Send error notification
                await monitor.broadcast({
                    "type": "execution_step", 
                    "payload": {
                        "executionId": execution_id,
                        "agent": agent_name,
                        "status": "error",
                        "action": f"Error in {agent_name}",
                        "response": f"LLM Error: {str(e)}",
                        "details": {"Error": str(e)}
                    }
                })
            
            # Add delay between agents
            await asyncio.sleep(2)
        
        # Send completion notification
        await monitor.broadcast({
            "type": "task_completed",
            "payload": {"executionId": execution_id}
        })
        
    except Exception as e:
        logger.error(f"Error in real task execution: {e}")
        await monitor.broadcast({
            "type": "task_error",
            "payload": {"error": str(e)}
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
        agents=["Vendor Agent", "Budget Agent"],
        agent_id="agent-vision",
        role="Project Coordinator"
    )
    
    monitor.add_agent(
        "Vendor Agent", 
        "You are a vendor research agent specialized in finding and evaluating service providers.",
        tools=["tool-search", "tool-sheets"],
        agents=["Vision Agent", "Budget Agent"],
        agent_id="agent-vendor",
        role="Vendor Research"
    )
    
    monitor.add_agent(
        "Budget Agent",
        "You are a financial analysis agent focused on budget planning and cost optimization.",
        tools=["tool-budget", "tool-calendar"],
        agents=["Vision Agent", "Schedule Agent"],
        agent_id="agent-budget",
        role="Financial Analysis"
    )
    
    monitor.add_agent(
        "Schedule Agent",
        "You are a scheduling agent responsible for timeline coordination and resource allocation.",
        tools=["tool-calendar", "tool-sheets"],
        agents=["Vision Agent", "Budget Agent"],
        agent_id="agent-schedule",
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
    """Simulate a basic workflow for demonstration"""
    await asyncio.sleep(5)  # Wait for potential client connections
    
    workflow_steps = [
        ("Vision Agent", "Analyzing project requirements and scope..."),
        ("Web Search", "Searching for wedding venues in San Francisco"),
        ("Vision Agent", "Processing venue search results and evaluating options"),
        ("Vendor Agent", "Starting vendor research for catering services"),
        ("Web Search", "Finding catering vendors within budget range"),
        ("Vendor Agent", "Evaluating catering vendor proposals and ratings"),
        ("Budget Agent", "Calculating budget allocation for venue and catering"),
        ("Budget Calculator", "Processing cost breakdown for major expenses"),
        ("Budget Agent", "Optimizing budget distribution across categories"),
        ("Schedule Agent", "Creating timeline for wedding planning milestones"),
        ("Calendar Manager", "Scheduling vendor meetings and venue visits"),
        ("Schedule Agent", "Coordinating availability across all stakeholders"),
        ("Google Sheets", "Creating spreadsheet to track vendor communications and responses"),
        ("Vision Agent", "Finalizing project plan and resource allocation")
    ]
    
    for step_name, activity in workflow_steps:
        if not monitor.clients:
            await asyncio.sleep(2)
            continue
            
        await monitor.set_active(step_name)
        await asyncio.sleep(1)
        
        if step_name in monitor.agents:
            # Agent activity
            context_message = f"Current context: {activity}\n\nExecuting workflow step with full agent context..."
            await monitor.update_agent_context(step_name, context_message)
            await monitor.log_activity(step_name, "MESSAGE", context_message)
            await asyncio.sleep(2)
            
            response = f"Agent {step_name} completed task: {activity}"
            await monitor.log_activity(step_name, "RESPONSE", response)
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
