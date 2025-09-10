#!/bin/bash

# LangGraph Agent Interface - Development Restart Script
# This script kills existing backend/frontend processes and restarts them

echo "LangGraph Agent Interface Restart Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Kill existing processes
print_status "Step 1: Killing existing processes..."

# Kill Python WebSocket server processes
print_status "Killing Python WebSocket server processes..."
pkill -f "python_server.py" 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "Python WebSocket server processes killed"
else
    print_warning "No Python WebSocket server processes found"
fi

# Kill HTTP server processes
print_status "Killing HTTP server processes..."
pkill -f "http.server" 2>/dev/null
if [ $? -eq 0 ]; then
    print_success "HTTP server processes killed"
else
    print_warning "No HTTP server processes found"
fi

# Kill any processes using ports 3000 and 8080
print_status "Checking for processes on ports 3000 and 8080..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Wait a moment for processes to die
print_status "Waiting 1 second for processes to terminate..."
sleep 1

# Step 2: Verify virtual environment
print_status "Step 2: Checking virtual environment..."
if [ ! -d ".venv" ]; then
    print_error "Virtual environment '.venv' not found!"
    print_error "Please run: python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Make sure we are in the project root directory
if [ "$(basename "$PWD")" != "agentic" ]; then
    print_error "Please run this script from the 'agentic' project root directory."
    exit 1
fi

print_success "Project structure verified"

# Step 3: Start WebSocket backend
print_status "Step 3: Starting Python WebSocket server..."
print_status "Command: source .venv/bin/activate && python python_server.py"

# Activate virtual environment and start backend in background
source .venv/bin/activate && python python_server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_success "WebSocket server started successfully (PID: $BACKEND_PID)"
else
    print_error "WebSocket server failed to start!"
    exit 1
fi

# Step 4: Start HTTP frontend server
print_status "Step 4: Starting HTTP frontend server..."
print_status "Command: source .venv/bin/activate && python -m http.server 3000"

# Start HTTP server in background using virtual environment
source .venv/bin/activate && python -m http.server 3000 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

# Check if frontend is running
if kill -0 $FRONTEND_PID 2>/dev/null; then
    print_success "HTTP server started successfully (PID: $FRONTEND_PID)"
else
    print_error "HTTP server failed to start!"
    print_error "Killing WebSocket server and exiting..."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Step 5: Final status
echo ""
print_success "🎉 LangGraph Agent Interface is running!"
echo ""
echo -e "${BLUE}WebSocket Server:${NC} ws://localhost:8080"
echo -e "${BLUE}Frontend:${NC}        http://localhost:3000"
echo -e "${BLUE}Interface:${NC}       Open your browser to http://localhost:3000"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  WebSocket Server PID: $BACKEND_PID"
echo -e "  HTTP Server PID:      $FRONTEND_PID"
echo ""
echo -e "${YELLOW}To stop both services:${NC}"
echo -e "  kill $BACKEND_PID $FRONTEND_PID"
echo -e "  OR run: ${BLUE}pkill -f 'python_server.py|http.server'${NC}"
echo ""
echo -e "${YELLOW}Available LLM Providers:${NC}"
echo -e "  • OpenAI (requires OPENAI_API_KEY environment variable)"
echo -e "  • Ollama (requires Ollama running locally)"
echo ""
print_status "Script completed. Both services are running in the background."
print_status "Open http://localhost:3000 in your browser to use the interface."
