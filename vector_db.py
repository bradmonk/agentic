#!/usr/bin/env python3
"""
Vector Database Module for RAG Search
Handles PDF processing, text chunking, embedding generation, and vector storage
"""

import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib

# Vector database and embeddings
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# PDF processing
import PyPDF2
from io import BytesIO

# Text processing
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class VectorDatabase:
    """Vector database for RAG search with PDF processing capabilities"""
    
    def __init__(self, db_path: str = "./chroma_db", collection_name: str = "documents"):
        self.db_path = db_path
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self.embedding_model = None
        self._initialize_db()
        self._initialize_embeddings()
    
    def _initialize_db(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Create ChromaDB client with persistent storage
            self.client = chromadb.PersistentClient(
                path=self.db_path,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(name=self.collection_name)
                logger.info(f"Loaded existing collection: {self.collection_name}")
            except Exception:  # Collection doesn't exist, create it
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Document chunks for RAG search"}
                )
                logger.info(f"Created new collection: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise
    
    def _initialize_embeddings(self):
        """Initialize sentence transformer model for embeddings"""
        try:
            # Use a lightweight but effective model
            model_name = "all-MiniLM-L6-v2"
            self.embedding_model = SentenceTransformer(model_name)
            logger.info(f"Initialized embedding model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from PDF file"""
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
        """Split text into overlapping chunks for better retrieval"""
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
    
    def generate_document_id(self, file_path: str) -> str:
        """Generate unique document ID based on file path and modification time"""
        path_obj = Path(file_path)
        mod_time = path_obj.stat().st_mtime
        content = f"{file_path}_{mod_time}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    async def add_document(self, file_path: str, document_name: str = None) -> Dict[str, Any]:
        """Add a document to the vector database"""
        try:
            # Generate document ID
            doc_id = self.generate_document_id(file_path)
            
            # Check if document already exists
            existing = await self.get_document_info(doc_id)
            if existing:
                logger.info(f"Document {document_name or file_path} already exists in database")
                return {
                    "success": True,
                    "document_id": doc_id,
                    "status": "already_exists",
                    "chunks": existing["chunk_count"]
                }
            
            # Extract text from PDF
            logger.info(f"Processing document: {file_path}")
            text = self.extract_text_from_pdf(file_path)
            
            # Create chunks
            chunks = self.chunk_text(text)
            
            if not chunks:
                raise ValueError("No chunks created from document")
            
            # Generate embeddings for all chunks
            chunk_texts = [chunk["text"] for chunk in chunks]
            embeddings = self.embedding_model.encode(chunk_texts).tolist()
            
            # Prepare data for ChromaDB
            chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
            metadatas = []
            
            for i, chunk in enumerate(chunks):
                metadata = {
                    "document_id": doc_id,
                    "document_name": document_name or Path(file_path).name,
                    "source_file": file_path,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "start_pos": chunk["start_pos"],
                    "end_pos": chunk["end_pos"],
                    "length": chunk["length"],
                    "added_at": datetime.now().isoformat()
                }
                metadatas.append(metadata)
            
            # Add to ChromaDB
            self.collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                documents=chunk_texts,
                metadatas=metadatas
            )
            
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
                             min_similarity: float = 0.1) -> List[Dict[str, Any]]:
        """Search for relevant document chunks"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query]).tolist()[0]
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(max_results, 20),  # Get more results to filter
                include=["documents", "metadatas", "distances"]
            )
            
            # Process results
            search_results = []
            for i in range(len(results["ids"][0])):
                distance = results["distances"][0][i]
                similarity = 1 - distance  # Convert distance to similarity
                
                if similarity >= min_similarity:
                    metadata = results["metadatas"][0][i]
                    document_text = results["documents"][0][i]
                    
                    result = {
                        "id": results["ids"][0][i],
                        "document_id": metadata["document_id"],
                        "document_name": metadata["document_name"],
                        "content_snippet": document_text[:300] + "..." if len(document_text) > 300 else document_text,
                        "full_content": document_text,
                        "similarity_score": round(similarity, 3),
                        "chunk_index": metadata["chunk_index"],
                        "total_chunks": metadata["total_chunks"],
                        "source_file": metadata["source_file"],
                        "metadata": metadata
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
            # Query for chunks with this document_id
            results = self.collection.get(
                where={"document_id": document_id},
                include=["metadatas"]
            )
            
            if not results["ids"]:
                return None
            
            # Get metadata from first chunk
            first_metadata = results["metadatas"][0]
            
            return {
                "document_id": document_id,
                "document_name": first_metadata["document_name"],
                "source_file": first_metadata["source_file"],
                "chunk_count": len(results["ids"]),
                "added_at": first_metadata["added_at"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get document info for {document_id}: {e}")
            return None
    
    async def list_documents(self) -> List[Dict[str, Any]]:
        """List all documents in the database"""
        try:
            # Get all documents
            results = self.collection.get(include=["metadatas"])
            
            # Group by document_id
            documents = {}
            for metadata in results["metadatas"]:
                doc_id = metadata["document_id"]
                if doc_id not in documents:
                    documents[doc_id] = {
                        "document_id": doc_id,
                        "document_name": metadata["document_name"],
                        "source_file": metadata["source_file"],
                        "added_at": metadata["added_at"],
                        "chunk_count": 0
                    }
                documents[doc_id]["chunk_count"] += 1
            
            return list(documents.values())
            
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            return []
    
    async def remove_document(self, document_id: str) -> bool:
        """Remove a document and all its chunks from the database"""
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": document_id},
                include=["ids"]
            )
            
            if not results["ids"]:
                logger.warning(f"Document {document_id} not found")
                return False
            
            # Delete all chunks
            self.collection.delete(ids=results["ids"])
            
            logger.info(f"Removed document {document_id} with {len(results['ids'])} chunks")
            return True
            
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

# Global vector database instance
vector_db = None

def get_vector_db() -> VectorDatabase:
    """Get or create the global vector database instance"""
    global vector_db
    if vector_db is None:
        vector_db = VectorDatabase()
    return vector_db

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
