#!/usr/bin/env python3
"""
LangGraph Workflow with Real LLM Integration
Example workflow that demonstrates agent interactions with live monitoring and real LLMs
"""

import asyncio
from typing import Dict, Any, List
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel
import json

# Import our monitoring system and LLM integration
from python_server import monitor
from llm_integration import llm_manager

class WorkflowState(BaseModel):
    """State shared between agents in the workflow"""
    messages: List[Any] = []
    research_data: str = ""
    analysis_results: str = ""
    final_report: str = ""
    current_step: str = ""

class MonitoredAgent:
    """Base class for agents with monitoring capabilities and real LLM integration"""
    
    def __init__(self, name: str, system_prompt: str):
        self.name = name
        self.system_prompt = system_prompt
        self.execution_history = []
        self.conversation_history = []
    
    async def call_llm(self, user_input: str) -> str:
        """Call the LLM with system prompt and user input"""
        messages = [
            {"role": "system", "content": self.system_prompt},
            *self.conversation_history,
            {"role": "user", "content": user_input}
        ]
        
        # Log the full prompt being sent to LLM
        full_prompt = f"System: {self.system_prompt}\n\nUser: {user_input}"
        await monitor.log_activity(self.name, "LLM_PROMPT", full_prompt)
        
        try:
            # Call the LLM
            response = await llm_manager.generate(messages)
            
            # Log the LLM response
            await monitor.log_activity(self.name, "LLM_RESPONSE", response)
            
            # Update conversation history
            self.conversation_history.append({"role": "user", "content": user_input})
            self.conversation_history.append({"role": "assistant", "content": response})
            
            # Keep conversation history manageable (last 10 exchanges)
            if len(self.conversation_history) > 20:
                self.conversation_history = self.conversation_history[-20:]
            
            return response
            
        except Exception as e:
            error_msg = f"LLM call failed: {str(e)}"
            await monitor.log_activity(self.name, "ERROR", error_msg)
            return f"Error: {error_msg}"
    
    async def log_execution(self, input_data: str, output_data: str):
        """Log agent execution to the monitoring system"""
        # Update context in monitor
        context = f"System Prompt: {self.system_prompt}\n\nConversation History:\n"
        for msg in self.conversation_history[-6:]:  # Last 3 exchanges
            context += f"{msg['role'].title()}: {msg['content']}\n\n"
        context += f"Current Input: {input_data}\n\nCurrent Output: {output_data}"
        
        await monitor.update_agent_context(self.name, context)
        
        # Track execution history
        self.execution_history.append({
            'input': input_data,
            'output': output_data,
            'timestamp': asyncio.get_event_loop().time()
        })

class ResearchAgent(MonitoredAgent):
    """Agent responsible for gathering information using real LLM"""
    
    def __init__(self):
        super().__init__(
            "Research Agent",
            """You are a research agent specialized in gathering comprehensive information on given topics. 
            Your job is to analyze the user's request and provide detailed research findings. 
            Focus on current trends, key players, and important developments in the field.
            Be thorough but concise in your analysis."""
        )
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Execute research task using real LLM"""
        await monitor.set_active(self.name)
        
        # Prepare input for LLM
        research_query = "Research current trends in AI agent frameworks and multi-agent systems. Focus on popular frameworks like LangGraph, AutoGen, CrewAI, and emerging technologies."
        
        # Call LLM for real research analysis
        research_results = await self.call_llm(research_query)
        
        await self.log_execution(research_query, research_results)
        
        # Update state
        state.research_data = research_results
        state.current_step = "research_complete"
        state.messages.append(f"Research completed by {self.name}")
        
        return state

class AnalysisAgent(MonitoredAgent):
    """Agent responsible for analyzing gathered data using real LLM"""
    
    def __init__(self):
        super().__init__(
            "Analysis Agent",
            """You are an analysis agent that processes research data and extracts key insights and patterns.
            Your job is to analyze the provided research data, identify trends, compare different approaches,
            and provide actionable insights. Focus on strengths, weaknesses, and recommendations."""
        )
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Execute analysis task using real LLM"""
        await monitor.set_active(self.name)
        
        # Prepare analysis input
        analysis_query = f"Analyze the following research data and provide key insights, comparisons, and recommendations:\n\n{state.research_data}"
        
        # Call LLM for real analysis
        analysis_results = await self.call_llm(analysis_query)
        
        await self.log_execution(analysis_query, analysis_results)
        
        # Update state
        state.analysis_results = analysis_results
        state.current_step = "analysis_complete"
        state.messages.append(f"Analysis completed by {self.name}")
        
        return state

class WriterAgent(MonitoredAgent):
    """Agent responsible for creating final reports using real LLM"""
    
    def __init__(self):
        super().__init__(
            "Writer Agent",
            """You are a technical writing agent that creates comprehensive, well-structured reports from analyzed data.
            Your job is to synthesize research and analysis into a clear, professional report with proper structure,
            headings, and actionable conclusions. Write in a professional but accessible tone."""
        )
    
    async def execute(self, state: WorkflowState) -> WorkflowState:
        """Execute writing task using real LLM"""
        await monitor.set_active(self.name)
        
        # Prepare writing input
        writing_query = f"""Create a comprehensive technical report based on the following research and analysis:

RESEARCH DATA:
{state.research_data}

ANALYSIS RESULTS:
{state.analysis_results}

Please create a well-structured report with executive summary, key findings, detailed analysis, and recommendations."""
        
        # Call LLM for real report writing
        final_report = await self.call_llm(writing_query)
        
        await self.log_execution(writing_query, final_report)
        
        # Update state
        state.final_report = final_report
        state.current_step = "report_complete"
        state.messages.append(f"Report completed by {self.name}")
        
        return state

class MonitoredTool:
    """Base class for tools with monitoring capabilities"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute tool with monitoring"""
        await monitor.set_active(self.name)
        
        # Log tool execution
        input_str = ", ".join([f"{k}={v}" for k, v in kwargs.items()])
        await monitor.log_activity(self.name, "EXECUTION", f"Input: {input_str}")
        
        # Simulate tool execution
        await asyncio.sleep(1)
        result = await self._execute_impl(**kwargs)
        
        # Log result
        result_str = json.dumps(result, indent=2)
        await monitor.log_activity(self.name, "RESULT", f"Output: {result_str}")
        
        return result
    
    async def _execute_impl(self, **kwargs) -> Dict[str, Any]:
        """Override this method in subclasses"""
        raise NotImplementedError

class WebSearchTool(MonitoredTool):
    """Tool for web searching"""
    
    def __init__(self):
        super().__init__(
            "Web Search",
            "Searches the web for relevant information using specified queries."
        )
    
    async def _execute_impl(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        return {
            "search_results": [
                {"title": "LangGraph Documentation", "url": "https://langchain.readthedocs.io/langgraph/"},
                {"title": "AutoGen Framework", "url": "https://microsoft.github.io/autogen/"},
                {"title": "CrewAI Overview", "url": "https://docs.crewai.com/"},
            ],
            "query_used": query,
            "results_count": 3
        }

async def create_monitored_workflow():
    """Create a LangGraph workflow with monitoring integration"""
    
    # Initialize agents
    research_agent = ResearchAgent()
    analysis_agent = AnalysisAgent()
    writer_agent = WriterAgent()
    
    # Initialize tools
    web_search = WebSearchTool()
    
    # Create workflow graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("research", research_agent.execute)
    workflow.add_node("analysis", analysis_agent.execute)
    workflow.add_node("writing", writer_agent.execute)
    
    # Define edges
    workflow.add_edge(START, "research")
    workflow.add_edge("research", "analysis")
    workflow.add_edge("analysis", "writing")
    workflow.add_edge("writing", END)
    
    # Compile the graph
    app = workflow.compile()
    
    return app

async def run_monitored_workflow(llm_config: Dict[str, Any]):
    """Run the workflow with real-time monitoring and real LLM integration"""
    
    await monitor.log_activity("System", "INFO", f"Starting LangGraph workflow with {llm_config['provider']} ({llm_config['model']})...")
    
    try:
        # Configure LLM
        await llm_manager.set_provider(
            llm_config['provider'],
            llm_config['model']
        )
        
        await monitor.log_activity("System", "INFO", f"LLM configured: {llm_config['provider']} - {llm_config['model']}")
        
        # Create and run workflow
        app = await create_monitored_workflow()
        
        # Initial state
        initial_state = WorkflowState(
            messages=["Workflow started with real LLM integration"],
            current_step="initialized"
        )
        
        # Execute workflow
        final_state = await app.ainvoke(initial_state)
        
        await monitor.log_activity("System", "SUCCESS", "Real LLM workflow completed successfully!")
        await monitor.log_activity("System", "RESULT", f"Final report generated: {len(final_state.final_report)} characters")
        
        return final_state
        
    except Exception as e:
        error_msg = f"Workflow failed: {str(e)}"
        await monitor.log_activity("System", "ERROR", error_msg)
        raise Exception(error_msg)
    
    finally:
        await monitor.set_active("")

if __name__ == "__main__":
    # This would be called from the main server
    pass
