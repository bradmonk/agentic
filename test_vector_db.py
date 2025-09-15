#!/usr/bin/env python3
"""
Test script for vector database functionality
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_vector_db():
    """Test the vector database functionality"""
    try:
        print("Testing vector database setup...")
        
        # Import vector database module
        from vector_db import get_vector_db, initialize_vector_db_with_docs
        
        print("✅ Vector database module imported successfully")
        
        # Initialize vector database
        print("🔄 Initializing vector database...")
        result = await initialize_vector_db_with_docs()
        
        if result["success"]:
            print(f"✅ Vector database initialized: {result.get('processed', 0)} documents processed")
            print(f"📄 Results: {result}")
        else:
            print(f"❌ Vector database initialization failed: {result.get('error', 'Unknown error')}")
            return False
        
        # Test search functionality
        if result.get("processed", 0) > 0:
            print("\n🔍 Testing search functionality...")
            db = get_vector_db()
            
            # Test search
            search_results = await db.search_documents("budget planning financial", max_results=3)
            print(f"✅ Search completed: Found {len(search_results)} results")
            
            for i, result in enumerate(search_results):
                print(f"  {i+1}. {result['document_name']} (similarity: {result['similarity_score']})")
                print(f"     Snippet: {result['content_snippet'][:100]}...")
            
            # Test document listing
            documents = await db.list_documents()
            print(f"\n📚 Documents in database: {len(documents)}")
            for doc in documents:
                print(f"  - {doc['document_name']} ({doc['chunk_count']} chunks)")
        
        print("\n🎉 Vector database test completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure dependencies are installed: pip install chromadb pypdf2 sentence-transformers langchain-community")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Vector Database Test")
    print("=" * 50)
    
    success = asyncio.run(test_vector_db())
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests passed! Vector database is working correctly.")
    else:
        print("❌ Tests failed. Check the error messages above.")
    
    sys.exit(0 if success else 1)
