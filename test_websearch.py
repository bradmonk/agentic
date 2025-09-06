#!/usr/bin/env python3
"""
Test script for the web search tool
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools import WebSearchTool

async def test_web_search():
    print("Testing Web Search Tool...")
    print("=" * 50)
    
    # Create web search tool
    search_tool = WebSearchTool()
    
    # Test search query
    test_query = "artificial intelligence 2024 trends"
    print(f"Searching for: {test_query}")
    print("-" * 30)
    
    try:
        # Execute search
        result = await search_tool._execute_impl(query=test_query, max_results=3)
        
        print(f"Search successful: {result.get('success', False)}")
        print(f"Results count: {result.get('results_count', 0)}")
        print()
        
        # Display results
        for i, result_item in enumerate(result.get('search_results', []), 1):
            print(f"Result {i}:")
            print(f"  Title: {result_item.get('title', 'N/A')}")
            print(f"  URL: {result_item.get('url', 'N/A')}")
            print(f"  Snippet: {result_item.get('snippet', 'N/A')[:150]}...")
            print(f"  Source: {result_item.get('source', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"Error during search: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_web_search())
