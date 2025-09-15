#!/usr/bin/env python3
"""
Debug search functionality
"""

import asyncio
import sys
import os
import re

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simple_vector_db import SimpleVectorDatabase

async def debug_search():
    """Debug the search functionality"""
    
    print("\n=== Debugging Search Functionality ===")
    
    try:
        # Initialize vector database
        db = SimpleVectorDatabase()
        
        # Get documents
        docs = await db.list_documents()
        
        if not docs:
            print("No documents found. Running initialization...")
            result = await db.initialize_docs_folder("./docs")
            docs = await db.list_documents()
        
        if docs:
            doc_id = list(db.documents.keys())[0]
            doc_data = db.documents[doc_id]
            
            print(f"\nDocument: {doc_data['document_name']}")
            print(f"Total chunks: {len(doc_data['chunks'])}")
            
            # Show first few chunks
            print("\nFirst 3 chunks:")
            for i, chunk in enumerate(doc_data['chunks'][:3]):
                print(f"\nChunk {i+1}:")
                print(f"Text (first 200 chars): {chunk['text'][:200]}...")
                
                # Extract words from this chunk
                words = set(re.findall(r'\b\w+\b', chunk['text'].lower()))
                print(f"Sample words: {list(words)[:10]}")
            
            # Test improved search
            print("\n=== Testing Search with Actual Words ===")
            
            # Get some actual words from the document
            all_text = doc_data['full_text'].lower()
            all_words = re.findall(r'\b\w+\b', all_text)
            
            # Find common words
            from collections import Counter
            word_counts = Counter(all_words)
            common_words = [word for word, count in word_counts.most_common(20) if len(word) > 3]
            
            print(f"Common words in document: {common_words[:10]}")
            
            # Test search with these words
            for word in common_words[:5]:
                print(f"\nSearching for: '{word}'")
                results = await db.search_documents(word, max_results=2, min_similarity=0.05)
                
                if results:
                    print(f"Found {len(results)} results")
                    for result in results:
                        print(f"  Similarity: {result['similarity_score']}")
                        print(f"  Snippet: {result['content_snippet'][:100]}...")
                else:
                    print("  No results found")
                    
                    # Debug the similarity calculation
                    chunk = doc_data['chunks'][0]
                    similarity = db.simple_similarity(word, chunk['text'])
                    print(f"  Debug - similarity with first chunk: {similarity}")
        
        else:
            print("No documents available for testing")
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_search())
