#!/usr/bin/env python3
"""
Test script for Simple Vector Database
"""

import asyncio
import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simple_vector_db import SimpleVectorDatabase, get_vector_db

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_simple_vector_db():
    """Test the simple vector database functionality"""
    
    print("\n=== Simple Vector Database Test ===")
    
    try:
        # Initialize vector database
        print("\n1. Initializing Simple Vector Database...")
        db = SimpleVectorDatabase()
        print(f"✓ Simple vector database initialized")
        
        # Test document listing (should be empty initially)
        print("\n2. Listing existing documents...")
        docs = await db.list_documents()
        print(f"Found {len(docs)} existing documents")
        for doc in docs:
            print(f"  - {doc['document_name']} ({doc['chunk_count']} chunks)")
        
        # Test docs folder initialization
        print("\n3. Testing docs folder initialization...")
        result = await db.initialize_docs_folder("./docs")
        print(f"Initialization result: {result}")
        
        if result["success"]:
            print(f"✓ Successfully processed {result['processed']} out of {result['total_files']} files")
            for file_result in result.get("results", []):
                file_name = file_result["file"]
                file_status = file_result["result"]
                if file_status["success"]:
                    print(f"  ✓ {file_name}: {file_status['chunks']} chunks ({file_status['status']})")
                else:
                    print(f"  ✗ {file_name}: {file_status.get('error', 'Failed')}")
        else:
            print(f"✗ Initialization failed: {result.get('error', 'Unknown error')}")
        
        # List documents after initialization
        print("\n4. Listing documents after initialization...")
        docs = await db.list_documents()
        print(f"Found {len(docs)} documents")
        for doc in docs:
            print(f"  - {doc['document_name']} ({doc['chunk_count']} chunks)")
        
        # Test search functionality
        if docs:
            print("\n5. Testing search functionality...")
            test_queries = [
                "financial analysis",
                "return on equity",
                "ROE",
                "financial performance",
                "profit margin",
                "debt"
            ]
            
            for query in test_queries:
                print(f"\nSearching for: '{query}'")
                results = await db.search_documents(query, max_results=3)
                
                if results:
                    print(f"Found {len(results)} relevant chunks:")
                    for i, result in enumerate(results, 1):
                        print(f"  {i}. Document: {result['document_name']}")
                        print(f"     Similarity: {result['similarity_score']}")
                        print(f"     Snippet: {result['content_snippet'][:100]}...")
                        print()
                else:
                    print("  No relevant results found")
        
        # Test get_vector_db function
        print("\n6. Testing get_vector_db function...")
        global_db = get_vector_db()
        print(f"✓ Global vector database obtained: {type(global_db).__name__}")
        
        print("\n=== Simple Vector Database Test Complete ===")
        
    except Exception as e:
        print(f"✗ Test failed with error: {e}")
        logger.exception("Test failed")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_simple_vector_db())
    if success:
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed!")
        sys.exit(1)
