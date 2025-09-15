#!/usr/bin/env python3
"""
Lightweight Vector Database Module for RAG Search
Simpler implementation without heavy ML dependencies
"""

import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib
import json
import re
from datetime import datetime

# PDF processing
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

logger = logging.getLogger(__name__)

class SimpleVectorDatabase:
    """Simple vector database for RAG search with basic text processing"""
    
    def __init__(self, db_path: str = "./simple_vector_db"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        self.index_file = self.db_path / "index.json"
        self.documents = {}
        self._load_index()
    
    def _load_index(self):
        """Load existing document index"""
        try:
            if self.index_file.exists():
                with open(self.index_file, 'r') as f:
                    self.documents = json.load(f)
                logger.info(f"Loaded {len(self.documents)} documents from index")
            else:
                self.documents = {}
                logger.info("Starting with empty document index")
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            self.documents = {}
    
    def _save_index(self):
        """Save document index to disk"""
        try:
            with open(self.index_file, 'w') as f:
                json.dump(self.documents, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from PDF file"""
        if not PDF_AVAILABLE:
            return f"PDF processing not available. Install PyPDF2: pip install PyPDF2"
        
        try:
            text = ""
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                    except Exception as e:
                        logger.warning(f"Failed to extract text from page {page_num + 1}: {e}")
                        continue
            
            if not text.strip():
                raise ValueError("No text could be extracted from PDF")
                
            logger.info(f"Extracted {len(text)} characters from {pdf_path}")
            return text.strip()
            
        except Exception as e:
            logger.error(f"Failed to extract text from PDF {pdf_path}: {e}")
            raise
    
    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
        """Split text into overlapping chunks"""
        # Clean the text
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = text.strip()
        
        chunks = []
        start = 0
        chunk_id = 0
        
        while start < len(text):
            # Calculate end position
            end = start + chunk_size
            
            # If this isn't the last chunk, try to break at a sentence
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                sentence_end = text.rfind('.', start + chunk_size - 100, end)
                if sentence_end != -1 and sentence_end > start:
                    end = sentence_end + 1
            
            # Extract chunk
            chunk_text = text[start:end].strip()
            
            if chunk_text:
                chunks.append({
                    "id": chunk_id,
                    "text": chunk_text,
                    "start_pos": start,
                    "end_pos": end,
                    "length": len(chunk_text)
                })
                chunk_id += 1
            
            # Move start position with overlap
            start = max(start + chunk_size - overlap, end)
            
            # Prevent infinite loop
            if start >= len(text):
                break
        
        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
    
    def simple_similarity(self, query: str, text: str) -> float:
        """Calculate simple word-based similarity score"""
        # Normalize text
        query_words = set(re.findall(r'\b\w+\b', query.lower()))
        text_words = set(re.findall(r'\b\w+\b', text.lower()))
        
        if not query_words or not text_words:
            return 0.0
        
        # Calculate word overlap ratio (more lenient than Jaccard)
        intersection = len(query_words.intersection(text_words))
        
        # Use the smaller set as denominator for better recall
        min_words = min(len(query_words), len(text_words))
        overlap_ratio = intersection / min_words if min_words > 0 else 0.0
        
        # Boost score for exact matches and common words
        boost = 0.0
        query_text_lower = query.lower()
        text_lower = text.lower()
        
        # Exact phrase match gets high score
        if query_text_lower in text_lower:
            boost += 0.5
        
        # Individual word matches in context
        for word in query_words:
            if word in text_lower:
                # Check if word appears multiple times
                count = text_lower.count(word)
                boost += min(count * 0.1, 0.3)
        
        return min(overlap_ratio + boost, 1.0)
    
    def generate_document_id(self, file_path: str) -> str:
        """Generate unique document ID based on file path and modification time"""
        path_obj = Path(file_path)
        mod_time = path_obj.stat().st_mtime if path_obj.exists() else 0
        content = f"{file_path}_{mod_time}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    async def add_document(self, file_path: str, document_name: str = None) -> Dict[str, Any]:
        """Add a document to the vector database"""
        try:
            # Generate document ID
            doc_id = self.generate_document_id(file_path)
            
            # Check if document already exists
            if doc_id in self.documents:
                logger.info(f"Document {document_name or file_path} already exists in database")
                return {
                    "success": True,
                    "document_id": doc_id,
                    "status": "already_exists",
                    "chunks": len(self.documents[doc_id]["chunks"])
                }
            
            # Extract text from PDF
            logger.info(f"Processing document: {file_path}")
            text = self.extract_text_from_pdf(file_path)
            
            # Create chunks
            chunks = self.chunk_text(text)
            
            if not chunks:
                raise ValueError("No chunks created from document")
            
            # Store document
            self.documents[doc_id] = {
                "document_id": doc_id,
                "document_name": document_name or Path(file_path).name,
                "source_file": file_path,
                "full_text": text,
                "chunks": chunks,
                "chunk_count": len(chunks),
                "added_at": datetime.now().isoformat()
            }
            
            # Save to disk
            self._save_index()
            
            logger.info(f"Added document {doc_id} with {len(chunks)} chunks to vector database")
            
            return {
                "success": True,
                "document_id": doc_id,
                "document_name": document_name or Path(file_path).name,
                "chunks": len(chunks),
                "status": "added"
            }
            
        except Exception as e:
            logger.error(f"Failed to add document {file_path}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def search_documents(self, query: str, max_results: int = 5, 
                             min_similarity: float = 0.05) -> List[Dict[str, Any]]:
        """Search for relevant document chunks"""
        try:
            search_results = []
            
            # Search through all documents and chunks
            for doc_id, doc_data in self.documents.items():
                for chunk in doc_data["chunks"]:
                    similarity = self.simple_similarity(query, chunk["text"])
                    
                    if similarity >= min_similarity:
                        result = {
                            "id": f"{doc_id}_chunk_{chunk['id']}",
                            "document_id": doc_id,
                            "document_name": doc_data["document_name"],
                            "content_snippet": chunk["text"][:300] + "..." if len(chunk["text"]) > 300 else chunk["text"],
                            "full_content": chunk["text"],
                            "similarity_score": round(similarity, 3),
                            "chunk_index": chunk["id"],
                            "total_chunks": doc_data["chunk_count"],
                            "source_file": doc_data["source_file"],
                            "metadata": {
                                "added_at": doc_data["added_at"],
                                "start_pos": chunk["start_pos"],
                                "end_pos": chunk["end_pos"]
                            }
                        }
                        search_results.append(result)
            
            # Sort by similarity
            search_results.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            logger.info(f"Found {len(search_results)} relevant chunks for query: '{query}'")
            return search_results[:max_results]
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    async def get_document_info(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific document"""
        try:
            if document_id in self.documents:
                doc_data = self.documents[document_id]
                return {
                    "document_id": document_id,
                    "document_name": doc_data["document_name"],
                    "source_file": doc_data["source_file"],
                    "chunk_count": doc_data["chunk_count"],
                    "added_at": doc_data["added_at"]
                }
            return None
        except Exception as e:
            logger.error(f"Failed to get document info for {document_id}: {e}")
            return None
    
    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the database"""
        try:
            documents = []
            for doc_id, doc_data in self.documents.items():
                documents.append({
                    "document_id": doc_id,
                    "document_name": doc_data["document_name"],
                    "source_file": doc_data["source_file"],
                    "added_at": doc_data["added_at"],
                    "chunk_count": doc_data["chunk_count"]
                })
            return documents
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            return []
    
    async def remove_document(self, document_id: str) -> bool:
        """Remove a document from the database"""
        try:
            if document_id in self.documents:
                del self.documents[document_id]
                self._save_index()
                logger.info(f"Removed document {document_id}")
                return True
            else:
                logger.warning(f"Document {document_id} not found")
                return False
        except Exception as e:
            logger.error(f"Failed to remove document {document_id}: {e}")
            return False
    
    async def initialize_docs_folder(self, docs_path: str = "./docs") -> Dict[str, Any]:
        """Initialize vector database with PDFs from docs folder"""
        try:
            docs_dir = Path(docs_path)
            if not docs_dir.exists():
                return {"success": False, "error": "Docs folder not found"}
            
            # Find all PDF files
            pdf_files = list(docs_dir.glob("*.pdf"))
            
            if not pdf_files:
                return {"success": True, "message": "No PDF files found in docs folder", "processed": 0}
            
            results = []
            processed_count = 0
            
            for pdf_file in pdf_files:
                logger.info(f"Processing {pdf_file.name}...")
                result = await self.add_document(str(pdf_file), pdf_file.name)
                results.append({
                    "file": pdf_file.name,
                    "result": result
                })
                
                if result["success"]:
                    processed_count += 1
            
            return {
                "success": True,
                "processed": processed_count,
                "total_files": len(pdf_files),
                "results": results
            }
            
        except Exception as e:
            logger.error(f"Failed to initialize docs folder: {e}")
            return {"success": False, "error": str(e)}

# Global instances
simple_vector_db = None
vector_db = None

def get_vector_db():
    """Get vector database instance (try ChromaDB first, fallback to simple)"""
    global vector_db, simple_vector_db
    
    # Try to use full ChromaDB implementation
    try:
        if vector_db is None:
            from vector_db import VectorDatabase
            vector_db = VectorDatabase()
        return vector_db
    except Exception as e:
        logger.warning(f"ChromaDB not available ({e}), using simple vector database")
        
        # Fallback to simple implementation
        if simple_vector_db is None:
            simple_vector_db = SimpleVectorDatabase()
        return simple_vector_db

async def initialize_vector_db_with_docs():
    """Initialize vector database with documents from docs folder"""
    try:
        db = get_vector_db()
        result = await db.initialize_docs_folder()
        logger.info(f"Vector database initialization result: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to initialize vector database: {e}")
        return {"success": False, "error": str(e)}
