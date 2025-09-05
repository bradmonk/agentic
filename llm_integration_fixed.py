#!/usr/bin/env python3
"""
LLM Integration Module
Supports both OpenAI API and local Ollama models with tool calling
"""

import os
import asyncio
import httpx
import json
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None, **kwargs) -> str:
        """Generate a response from the LLM"""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available"""
        pass

class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""
    
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.base_url = "https://api.openai.com/v1"
        
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")
    
    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None, **kwargs) -> str:
        """Generate response using OpenAI API"""
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1500)
        }
        
        # Add tools/functions if provided
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    return content.strip() if content else "No response generated"
                else:
                    raise Exception("No valid response from OpenAI API")
                
            except httpx.HTTPError as e:
                logger.error(f"OpenAI API error: {e}")
                raise Exception(f"OpenAI API error: {e}")
    
    async def is_available(self) -> bool:
        """Check if OpenAI API is available"""
        if not self.api_key:
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=headers,
                    timeout=5.0
                )
                return response.status_code == 200
        except:
            return False

class OllamaProvider(LLMProvider):
    """Ollama local model provider"""
    
    def __init__(self, model: str = "llama3.1", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None, **kwargs) -> str:
        """Generate response using Ollama"""
        
        # Convert messages to Ollama format
        prompt = self._format_messages(messages, tools)
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 1500)
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                
                data = response.json()
                return data.get("response", "No response generated").strip()
                
            except httpx.HTTPError as e:
                logger.error(f"Ollama API error: {e}")
                raise Exception(f"Ollama API error: {e}")
    
    def _format_messages(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> str:
        """Convert messages to Ollama prompt format"""
        formatted_parts = []
        
        # Add tool information if available
        if tools:
            tool_descriptions = []
            for tool in tools:
                tool_name = tool.get("function", {}).get("name", "Unknown")
                tool_desc = tool.get("function", {}).get("description", "")
                tool_descriptions.append(f"- {tool_name}: {tool_desc}")
            
            tools_text = "Available tools:\n" + "\n".join(tool_descriptions)
            formatted_parts.append(f"System: {tools_text}")
        
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role == "system":
                formatted_parts.append(f"System: {content}")
            elif role == "user":
                formatted_parts.append(f"Human: {content}")
            elif role == "assistant":
                formatted_parts.append(f"Assistant: {content}")
        
        return "\n\n".join(formatted_parts) + "\n\nAssistant:"
    
    async def is_available(self) -> bool:
        """Check if Ollama is available"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/tags",
                    timeout=5.0
                )
                return response.status_code == 200
        except:
            return False
    
    async def list_models(self) -> List[str]:
        """List available Ollama models"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/tags",
                    timeout=5.0
                )
                response.raise_for_status()
                
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                return models
        except:
            return []

class LLMManager:
    """Manages LLM providers and handles switching between them"""
    
    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self.current_provider: Optional[LLMProvider] = None
        self.current_config: Dict[str, Any] = {}
    
    def add_provider(self, name: str, provider: LLMProvider):
        """Add a provider to the manager"""
        self.providers[name] = provider
        logger.info(f"Added LLM provider: {name}")
    
    async def set_provider(self, provider_name: str, model: str, **kwargs):
        """Set the current provider and model"""
        if provider_name == "openai":
            self.current_provider = OpenAIProvider(model)
        elif provider_name == "ollama":
            self.current_provider = OllamaProvider(model)
        else:
            raise ValueError(f"Unknown provider: {provider_name}")
        
        self.current_config = {
            "provider": provider_name,
            "model": model,
            **kwargs
        }
        
        # Test availability
        if not await self.current_provider.is_available():
            raise Exception(f"Provider {provider_name} is not available")
        
        logger.info(f"Set LLM provider to {provider_name} with model {model}")
    
    async def generate(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None, **kwargs) -> str:
        """Generate response using current provider"""
        if not self.current_provider:
            raise Exception("No LLM provider configured")
        
        return await self.current_provider.generate(messages, tools=tools, **kwargs)
    
    async def get_available_models(self, provider: str) -> List[str]:
        """Get available models for a provider"""
        if provider == "ollama":
            temp_provider = OllamaProvider()
            if await temp_provider.is_available():
                return await temp_provider.list_models()
        elif provider == "openai":
            # Return common OpenAI models
            return ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o"]
        
        return []
    
    def get_current_config(self) -> Dict[str, Any]:
        """Get current provider configuration"""
        return self.current_config.copy()

# Global LLM manager instance
llm_manager = LLMManager()

# Configure logging
logging.basicConfig(level=logging.INFO)
