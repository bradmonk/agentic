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
from bs4 import BeautifulSoup
import re
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

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

        await asyncio.sleep(2)

        """Perform web search using simple HTTP requests"""
        try:
            # Strip quotes from query to avoid exact string search issues
            cleaned_query = query.strip().strip('"').strip("'").strip()
            
            # Run search in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, 
                self._search_sync, 
                cleaned_query, 
                max_results
            )
            
            # Add a pause to make the active tool highlighting visible
            await asyncio.sleep(2)
            
            return {
                "search_results": results,
                "query_used": cleaned_query,
                "results_count": len(results),
                "success": True,
                "source": "Web Search"
            }
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            # Strip quotes from query for error case too
            cleaned_query = query.strip().strip('"').strip("'").strip()
            return {
                "error": f"Search failed: {str(e)}",
                "search_results": [],
                "query_used": cleaned_query,
                "results_count": 0,
                "success": False
            }
    
    def _search_sync(self, query: str, max_results: int) -> List[Dict]:
        """Synchronous search function using DuckDuckGo instant answers and web search"""
        try:
            results = []
            
            # First try DuckDuckGo instant answers API
            ddg_url = "https://api.duckduckgo.com/"
            params = {
                'q': query,
                'format': 'json',
                'no_html': '1',
                'skip_disambig': '1'
            }
            
            response = requests.get(ddg_url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                
                # Add main answer if available
                if data.get('Abstract'):
                    results.append({
                        "title": data.get('Heading', query),
                        "url": data.get('AbstractURL', ''),
                        "snippet": data.get('Abstract', ''),
                        "source": "DuckDuckGo Instant Answer"
                    })
                
                # Add related topics
                for topic in data.get('RelatedTopics', [])[:2]:
                    if isinstance(topic, dict) and topic.get('Text'):
                        results.append({
                            "title": topic.get('Text', '')[:100] + "...",
                            "url": topic.get('FirstURL', ''),
                            "snippet": topic.get('Text', ''),
                            "source": "DuckDuckGo Related"
                        })
            
            # If we don't have enough results, try a web search approach
            if len(results) < max_results:
                try:
                    # Search using DuckDuckGo HTML (for demonstration - be respectful of rate limits)
                    search_url = f"https://duckduckgo.com/html/"
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                    }
                    search_params = {'q': query, 'b': '', 'kl': 'us-en'}
                    
                    search_response = requests.get(search_url, params=search_params, headers=headers, timeout=10)
                    if search_response.status_code == 200:
                        soup = BeautifulSoup(search_response.text, 'html.parser')
                        
                        # Extract search results
                        for result_div in soup.find_all('div', class_='web-result')[:max_results-len(results)]:
                            title_elem = result_div.find('a', class_='result__a')
                            snippet_elem = result_div.find('a', class_='result__snippet')
                            
                            if title_elem:
                                title = title_elem.get_text(strip=True)
                                url = title_elem.get('href', '')
                                snippet = snippet_elem.get_text(strip=True) if snippet_elem else ''
                                
                                results.append({
                                    "title": title,
                                    "url": url,
                                    "snippet": snippet,
                                    "source": "DuckDuckGo Web Search"
                                })
                except Exception as e:
                    logger.warning(f"HTML search failed: {str(e)}")
            
            # If still no results, provide a fallback
            if not results:
                results = [
                    {
                        "title": f"Search for: {query}",
                        "url": f"https://duckduckgo.com/?q={urllib.parse.quote(query)}",
                        "snippet": f"No specific results found, but you can search for '{query}' manually on DuckDuckGo.",
                        "source": "Fallback Search"
                    }
                ]
            
            return results[:max_results]
            
        except Exception as e:
            logger.error(f"Search execution error: {str(e)}")
            # Return fallback result even if search fails
            return [
                {
                    "title": f"Search for: {query}",
                    "url": f"https://duckduckgo.com/?q={urllib.parse.quote(query)}",
                    "snippet": f"Search temporarily unavailable. Try searching for '{query}' manually.",
                    "source": "Error Fallback"
                }
            ]


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


class GoogleSheetsTool(MonitoredTool):
    """Google Sheets tool for creating and managing spreadsheets"""
    
    def __init__(self):
        super().__init__(
            "Google Sheets",
            "Create, read, and update Google Sheets spreadsheets"
        )
        self._service = None
        self.test_spreadsheet_id = "1-RBXjd6S7FP3p0c2DY2FYncVyWoa-H1L6DSw4e9Xkgs"
        self.scopes = ['https://www.googleapis.com/auth/spreadsheets']
    
    def _get_sheets_service(self):
        """Get authenticated Google Sheets service or return None for demo mode"""
        try:
            # In production, this would handle OAuth authentication
            # For now, we'll use demo mode with realistic API responses
            return None
        except Exception as e:
            logger.warning(f"Could not authenticate with Google Sheets API: {str(e)}")
            return None
    
    async def _execute_impl(self, action: str, spreadsheet_id: str = None, 
                          sheet_name: str = "Sheet1", data: List[List] = None,
                          range_name: str = "A1:Z1000", title: str = None) -> Dict[str, Any]:
        """
        Execute Google Sheets operations
        
        Actions:
        - create: Create a new spreadsheet
        - read: Read data from a spreadsheet
        - write: Write data to a spreadsheet
        - append: Append data to a spreadsheet
        - format: Format cells in a spreadsheet
        """
        try:
            # Add processing delay for visual feedback
            await asyncio.sleep(1)
            
            # Use test spreadsheet if no specific ID provided
            if not spreadsheet_id and action != "create":
                spreadsheet_id = self.test_spreadsheet_id
            
            if action == "create":
                # Create new spreadsheet (demo mode)
                new_id = f"1-{datetime.now().strftime('%Y%m%d_%H%M%S')}-demo"
                spreadsheet_title = title or f"Agentic AI Spreadsheet {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "create",
                    "spreadsheet_id": new_id,
                    "title": spreadsheet_title,
                    "url": f"https://docs.google.com/spreadsheets/d/{new_id}/edit",
                    "sheets": [{"name": "Sheet1", "id": 0}],
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "note": "Demo mode: In production, this would create a real Google Sheets spreadsheet"
                }
                
            elif action == "read":
                if not spreadsheet_id:
                    return {"error": "spreadsheet_id required for read operation", "success": False}
                
                # Simulate reading from the actual spreadsheet structure
                if spreadsheet_id == self.test_spreadsheet_id:
                    # Return realistic data that might be in a project management sheet
                    sample_data = [
                        ["Project", "Task", "Assignee", "Status", "Due Date", "Budget"],
                        ["Wedding Planning", "Venue Research", "Vision Agent", "In Progress", "2025-09-15", "$15000"],
                        ["Wedding Planning", "Vendor Evaluation", "Vendor Agent", "Not Started", "2025-09-20", "$8000"],
                        ["Wedding Planning", "Budget Analysis", "Budget Agent", "Completed", "2025-09-10", "$2000"],
                        ["Wedding Planning", "Timeline Creation", "Schedule Agent", "In Progress", "2025-09-12", "$500"]
                    ]
                else:
                    # Generic sample data for other spreadsheets
                    sample_data = [
                        ["Item", "Category", "Value", "Notes"],
                        ["Sample Item 1", "Category A", "100", "Demo data"],
                        ["Sample Item 2", "Category B", "200", "More demo data"]
                    ]
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "read",
                    "spreadsheet_id": spreadsheet_id,
                    "sheet_name": sheet_name,
                    "range": range_name,
                    "data": sample_data,
                    "rows_count": len(sample_data),
                    "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit",
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "note": f"Demo mode: Reading from {'test spreadsheet' if spreadsheet_id == self.test_spreadsheet_id else 'spreadsheet'}"
                }
                
            elif action == "write":
                if not spreadsheet_id or not data:
                    return {"error": "spreadsheet_id and data required for write operation", "success": False}
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "write",
                    "spreadsheet_id": spreadsheet_id,
                    "sheet_name": sheet_name,
                    "range": range_name,
                    "data_written": data,
                    "cells_updated": len(data) * len(data[0]) if data and len(data) > 0 else 0,
                    "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit",
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "note": "Demo mode: In production, this would write data to the actual Google Sheet"
                }
                
            elif action == "append":
                if not spreadsheet_id or not data:
                    return {"error": "spreadsheet_id and data required for append operation", "success": False}
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "append",
                    "spreadsheet_id": spreadsheet_id,
                    "sheet_name": sheet_name,
                    "data_appended": data,
                    "rows_added": len(data),
                    "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit",
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "note": "Demo mode: In production, this would append data to the actual Google Sheet"
                }
                
            elif action == "format":
                if not spreadsheet_id:
                    return {"error": "spreadsheet_id required for format operation", "success": False}
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                return {
                    "action": "format",
                    "spreadsheet_id": spreadsheet_id,
                    "sheet_name": sheet_name,
                    "range": range_name,
                    "formatting_applied": "Headers bold, borders added, alternating row colors",
                    "url": f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit",
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "note": "Demo mode: In production, this would apply formatting to the actual Google Sheet"
                }
                
            else:
                return {
                    "error": f"Unknown action: {action}. Available actions: create, read, write, append, format",
                    "success": False
                }
                
        except Exception as e:
            logger.error(f"Google Sheets operation failed: {str(e)}")
            return {
                "error": f"Operation failed: {str(e)}",
                "action": action,
                "success": False
            }


class DocumentLibraryTool(MonitoredTool):
    """Document Library tool for vector database RAG search"""
    
    def __init__(self):
        super().__init__(
            "Document Library",
            "Search and retrieve documents from vector database for RAG"
        )
    
    async def _execute_impl(self, query: str, max_results: int = 5, 
                          action: str = "search", document_id: str = None) -> Dict[str, Any]:
        """Vector database search and document retrieval functionality"""
        try:
            # Simulate vector database processing
            await asyncio.sleep(0.1)
            
            if action == "search":
                # Simulate semantic search through vector database
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                # Mock document results based on query
                mock_documents = [
                    {
                        "id": "doc_001",
                        "title": "Wedding Planning Best Practices",
                        "content_snippet": "Comprehensive guide to planning weddings including venue selection, budgeting, and timeline management...",
                        "similarity_score": 0.89,
                        "source": "wedding_guides.pdf",
                        "metadata": {"category": "planning", "date_added": "2025-09-01"}
                    },
                    {
                        "id": "doc_002", 
                        "title": "San Diego Venue Directory",
                        "content_snippet": "Complete listing of event venues in San Diego with capacity, pricing, and amenities information...",
                        "similarity_score": 0.85,
                        "source": "venue_directory.pdf",
                        "metadata": {"category": "venues", "date_added": "2025-08-15"}
                    },
                    {
                        "id": "doc_003",
                        "title": "Event Budget Templates",
                        "content_snippet": "Detailed budget breakdowns for various event types including weddings, corporate events...",
                        "similarity_score": 0.78,
                        "source": "budget_templates.pdf", 
                        "metadata": {"category": "budgeting", "date_added": "2025-08-20"}
                    }
                ]
                
                # Filter to max_results
                results = mock_documents[:max_results]
                
                return {
                    "action": "search",
                    "query": query,
                    "documents": results,
                    "total_found": len(results),
                    "vector_db": "ChromaDB",
                    "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
                    "success": True,
                    "note": "Documents retrieved from vector database (mock implementation)"
                }
                
            elif action == "retrieve":
                if not document_id:
                    return {
                        "error": "Document ID required for retrieval",
                        "success": False
                    }
                
                # Add a pause to make the active tool highlighting visible
                await asyncio.sleep(2)
                
                # Mock full document retrieval
                mock_full_doc = {
                    "id": document_id,
                    "title": "Wedding Planning Best Practices - Full Document",
                    "full_content": "This comprehensive guide covers all aspects of wedding planning including venue selection, vendor coordination, budget management, timeline creation, and day-of coordination. Key sections include...",
                    "metadata": {
                        "author": "Event Planning Experts",
                        "publication_date": "2025-01-01",
                        "document_type": "guide",
                        "page_count": 25,
                        "category": "planning"
                    },
                    "chunks": 15,
                    "vector_embeddings": "384-dimensional",
                    "last_updated": "2025-09-01"
                }
                
                return {
                    "action": "retrieve",
                    "document_id": document_id,
                    "document": mock_full_doc,
                    "success": True,
                    "note": "Full document retrieved from vector database (mock implementation)"
                }
            else:
                return {
                    "error": f"Unknown action: {action}. Supported: 'search', 'retrieve'",
                    "success": False
                }
                
        except Exception as e:
            return {
                "error": f"Document library operation failed: {str(e)}",
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
            GoogleSheetsTool(),
            DocumentLibraryTool()
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
            "Google Sheets": {
                "parameters": {
                    "action": {"type": "string", "required": True, "description": "Sheets operation", "options": ["create", "read", "write", "append", "format"]},
                    "spreadsheet_id": {"type": "string", "required": False, "description": "Spreadsheet ID (not needed for create)"},
                    "sheet_name": {"type": "string", "required": False, "default": "Sheet1", "description": "Sheet name"},
                    "data": {"type": "array", "required": False, "description": "2D array of data for write/append operations", "example": [["Name", "Age"], ["John", "30"]]},
                    "range_name": {"type": "string", "required": False, "default": "A1:Z1000", "description": "Cell range"},
                    "title": {"type": "string", "required": False, "description": "Spreadsheet title for create operation"}
                }
            },
            "Document Library": {
                "parameters": {
                    "query": {"type": "string", "required": True, "description": "Search query for semantic document search"},
                    "max_results": {"type": "integer", "required": False, "default": 5, "description": "Maximum number of documents to return"},
                    "action": {"type": "string", "required": False, "default": "search", "options": ["search", "retrieve"]},
                    "document_id": {"type": "string", "required": False, "description": "Document ID for retrieve action"}
                }
            }
        }
        
        return schemas.get(tool_name, {"error": f"Schema not found for tool: {tool_name}"})
