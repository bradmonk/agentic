#!/bin/bash
# LangGraph Agent Interface Starter Script

echo "🚀 Starting LangGraph Agent Interface..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first:"
    echo "   python3 -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment and start server
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

echo "🌐 Starting Python WebSocket server on localhost:8080..."
echo "📱 Open your browser to: file://$(pwd)/index.html"
echo "⛔ Press Ctrl+C to stop the server"
echo ""

python python_server.py
