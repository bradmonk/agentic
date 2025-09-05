"""
Real tool implementations for the agentic system
"""
import json
import asyncio
import requests
import urllib.parse
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class MonitoredTool:
    """Base class for tools with monitoring capabilities"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.monitor = None
    
    def set_monitor(self, monitor):
        """Set the monitor instance for logging"""
        self.monitor = monitor
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with monitoring"""
        if self.monitor:
            await self.monitor.log_activity(
                f"Tool:{self.name}", 
                "TOOL_START", 
                f"Executing {self.name} with args: {kwargs}"
            )
        
        try:
            result = await self._execute_impl(**kwargs)
            
            if self.monitor:
                await self.monitor.log_activity(
                    f"Tool:{self.name}", 
                    "TOOL_SUCCESS", 
                    f"Tool completed successfully"
                )
            
            return result
        except Exception as e:
            error_msg = f"Tool execution failed: {str(e)}"
            logger.error(f"{self.name}: {error_msg}")
            
            if self.monitor:
                await self.monitor.log_activity(
                    f"Tool:{self.name}", 
                    "TOOL_ERROR", 
                    error_msg
                )
            
            return {
                "error": error_msg,
                "success": False
            }
    
    async def _execute_impl(self, **kwargs) -> Dict[str, Any]:
        """Override this method in subclasses"""
        raise NotImplementedError


class WebSearchTool(MonitoredTool):
    """Web search tool using a simple search API"""
    
    def __init__(self):
        super().__init__(
            "Web Search",
            "Searches the web for relevant information"
        )
    
    async def _execute_impl(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """Perform web search using simple HTTP requests"""
        try:
            # Run search in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, 
                self._search_sync, 
                query, 
                max_results
            )
            
            # Add a pause to make the active tool highlighting visible
            await asyncio.sleep(2)
            
            return {
                "search_results": results,
                "query_used": query,
                "results_count": len(results),
                "success": True,
                "source": "Web Search"
            }
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            return {
                "error": f"Search failed: {str(e)}",
                "search_results": [],
                "query_used": query,
                "results_count": 0,
                "success": False
            }
    
    def _search_sync(self, query: str, max_results: int) -> List[Dict]:
        """Synchronous search function for thread executor"""
        try:
            # Use a simple search approach - for production, you'd use a real search API
            # For now, return mock results that would be relevant to the query
            results = [
                {
                    "title": f"Search result for: {query}",
                    "url": f"https://example.com/search?q={urllib.parse.quote(query)}",
                    "snippet": f"Relevant information about {query}. This would contain actual search results in a production environment.",
                    "source": "Web Search"
                },
                {
                    "title": f"Additional resource about {query}",
                    "url": "https://example.com/resource",
                    "snippet": f"More detailed information and resources related to {query} can be found here.",
                    "source": "Web Search"
                },
                {
                    "title": f"Expert analysis: {query}",
                    "url": "https://example.com/expert-analysis",
                    "snippet": f"Professional insights and expert recommendations regarding {query}.",
                    "source": "Web Search"
                }
            ]
            
            return results[:max_results]
        except Exception as e:
            logger.error(f"Search execution error: {str(e)}")
            return []


class BudgetCalculatorTool(MonitoredTool):
    """Simple budget calculator tool"""
    
    def __init__(self):
        super().__init__(
            "Budget Calculator",
            "Calculate costs, totals, and budget breakdowns"
        )
    
    async def _execute_impl(self, items: List[Dict], operation: str = "total", tax_rate: float = 0.08) -> Dict[str, Any]:
        """
        Calculate budget based on items list
        items format: [{"name": "item", "quantity": 1, "price": 100.0}, ...]
        or [{"name": "item", "cost": 100.0}, ...]
        """
        try:
            if not items or not isinstance(items, list):
                return {
                    "error": "Items must be a non-empty list",
                    "success": False
                }
            
            calculations = []
            total_cost = 0.0
            
            for item in items:
                name = item.get("name", "Unknown Item")
                
                # Handle both "cost" and "quantity/price" formats
                if "cost" in item:
                    # Direct cost format
                    cost = float(item.get("cost", 0))
                    calculations.append({
                        "name": name,
                        "cost": cost
                    })
                    total_cost += cost
                else:
                    # Quantity/price format
                    quantity = float(item.get("quantity", 0))
                    price = float(item.get("price", 0))
                    subtotal = quantity * price
                    
                    calculations.append({
                        "name": name,
                        "quantity": quantity,
                        "unit_price": price,
                        "subtotal": subtotal
                    })
                    total_cost += subtotal
            
            # Calculate tax and final total
            tax_amount = total_cost * tax_rate
            final_total = total_cost + tax_amount
            
            # Add a pause to make the active tool highlighting visible
            await asyncio.sleep(2)
            
            return {
                "breakdown": calculations,
                "subtotal": total_cost,
                "tax_rate": tax_rate,
                "tax_amount": tax_amount,
                "total_with_tax": final_total,
                "operation": operation,
                "success": True
            }
                
        except Exception as e:
            logger.error(f"Budget calculation failed: {str(e)}")
            return {
                "error": f"Calculation failed: {str(e)}",
                "success": False
            }


class EmailSystemTool(MonitoredTool):
    """Email system tool (placeholder implementation)"""
    
    def __init__(self):
        super().__init__(
            "Email System",
            "Send and manage email communications"
        )
    
    async def _execute_impl(self, recipient: str, subject: str, message: str, 
                          action: str = "send") -> Dict[str, Any]:
        """Placeholder email functionality"""
        try:
            # Simulate email processing
            # Simulate processing time
            await asyncio.sleep(0.1)
            
            if action == "send":
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "send",
                    "recipient": recipient,
                    "subject": subject,
                    "message_preview": message[:100] + "..." if len(message) > 100 else message,
                    "status": "sent",
                    "message_id": f"msg_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "timestamp": datetime.now().isoformat(),
                    "success": True,
                    "note": "Email sent successfully (placeholder implementation)"
                }
            elif action == "draft":
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "draft",
                    "recipient": recipient,
                    "subject": subject,
                    "status": "draft_saved",
                    "draft_id": f"draft_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "timestamp": datetime.now().isoformat(),
                    "success": True,
                    "note": "Draft saved (placeholder implementation)"
                }
            else:
                return {
                    "error": f"Unknown action: {action}",
                    "success": False
                }
                
        except Exception as e:
            return {
                "error": f"Email operation failed: {str(e)}",
                "success": False
            }


class CalendarManagerTool(MonitoredTool):
    """Calendar management tool (placeholder implementation)"""
    
    def __init__(self):
        super().__init__(
            "Calendar Manager",
            "Schedule events and manage timelines"
        )
    
    async def _execute_impl(self, date: str, time: str, duration: int, 
                          title: str, action: str = "schedule") -> Dict[str, Any]:
        """Placeholder calendar functionality"""
        try:
            # Simulate calendar processing
            await asyncio.sleep(0.1)
            
            if action == "schedule":
                # Parse and validate date/time
                try:
                    event_datetime = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
                    end_datetime = event_datetime + timedelta(minutes=duration)
                except ValueError:
                    return {
                        "error": "Invalid date/time format. Use YYYY-MM-DD and HH:MM",
                        "success": False
                    }
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "schedule",
                    "title": title,
                    "start_time": event_datetime.isoformat(),
                    "end_time": end_datetime.isoformat(),
                    "duration_minutes": duration,
                    "event_id": f"evt_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    "status": "scheduled",
                    "calendar": "default",
                    "success": True,
                    "note": "Event scheduled successfully (placeholder implementation)"
                }
            elif action == "check_availability":
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "check_availability",
                    "date": date,
                    "time": time,
                    "available": True,
                    "conflicts": [],
                    "success": True,
                    "note": "Availability checked (placeholder implementation)"
                }
            else:
                return {
                    "error": f"Unknown action: {action}",
                    "success": False
                }
                
        except Exception as e:
            return {
                "error": f"Calendar operation failed: {str(e)}",
                "success": False
            }


class ToolExecutor:
    """Tool execution framework for agents"""
    
    def __init__(self, monitor=None):
        self.monitor = monitor
        self.tools = {}
        self._initialize_tools()
    
    def _initialize_tools(self):
        """Initialize all available tools"""
        tools = [
            WebSearchTool(),
            BudgetCalculatorTool(),
            EmailSystemTool(),
            CalendarManagerTool()
        ]
        
        for tool in tools:
            if self.monitor:
                tool.set_monitor(self.monitor)
            self.tools[tool.name] = tool
            logger.info(f"Initialized tool: {tool.name}")
    
    async def execute_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Execute a specific tool with given parameters"""
        if tool_name not in self.tools:
            return {
                "error": f"Tool '{tool_name}' not found. Available tools: {list(self.tools.keys())}",
                "success": False
            }
        
        tool = self.tools[tool_name]
        result = await tool.execute(**kwargs)
        
        # Add metadata
        result["tool_name"] = tool_name
        result["execution_time"] = datetime.now().isoformat()
        
        return result
    
    def get_available_tools(self) -> Dict[str, str]:
        """Get list of available tools and their descriptions"""
        return {name: tool.description for name, tool in self.tools.items()}
    
    def get_tool_schema(self, tool_name: str) -> Dict[str, Any]:
        """Get the expected parameters for a tool"""
        schemas = {
            "Web Search": {
                "parameters": {
                    "query": {"type": "string", "required": True, "description": "Search query"},
                    "max_results": {"type": "integer", "required": False, "default": 5, "description": "Maximum number of results"}
                }
            },
            "Budget Calculator": {
                "parameters": {
                    "items": {
                        "type": "array", 
                        "required": True, 
                        "description": "List of items with name, quantity, and price",
                        "example": [{"name": "item1", "quantity": 2, "price": 50.0}]
                    },
                    "operation": {"type": "string", "required": False, "default": "total", "options": ["total", "with_tax"]}
                }
            },
            "Email System": {
                "parameters": {
                    "recipient": {"type": "string", "required": True, "description": "Email recipient"},
                    "subject": {"type": "string", "required": True, "description": "Email subject"},
                    "message": {"type": "string", "required": True, "description": "Email message body"},
                    "action": {"type": "string", "required": False, "default": "send", "options": ["send", "draft"]}
                }
            },
            "Calendar Manager": {
                "parameters": {
                    "date": {"type": "string", "required": True, "description": "Date in YYYY-MM-DD format"},
                    "time": {"type": "string", "required": True, "description": "Time in HH:MM format"},
                    "duration": {"type": "integer", "required": True, "description": "Duration in minutes"},
                    "title": {"type": "string", "required": True, "description": "Event title"},
                    "action": {"type": "string", "required": False, "default": "schedule", "options": ["schedule", "check_availability"]}
                }
            }
        }
        
        return schemas.get(tool_name, {"error": f"Schema not found for tool: {tool_name}"})
