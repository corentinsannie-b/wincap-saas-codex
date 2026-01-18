#!/bin/bash

# Wincap SaaS Development Server Launcher
# Starts both backend and frontend in parallel

set -e

REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$REPO_DIR"

echo "======================================"
echo "🚀 Wincap SaaS - Development Server"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "✓ Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 not found${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ Node.js/npm not found${NC}"
    exit 1
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env and set ANTHROPIC_API_KEY${NC}"
    echo ""
fi

# Check ANTHROPIC_API_KEY
if ! grep -q "ANTHROPIC_API_KEY=sk-ant" .env; then
    echo -e "${RED}✗ ANTHROPIC_API_KEY not set in .env${NC}"
    echo "Please edit .env and set: ANTHROPIC_API_KEY=sk-ant-..."
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Load environment
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Environment:"
echo "  API_PORT: ${API_PORT:-8000}"
echo "  VITE_API_URL: ${VITE_API_URL:-http://localhost:8000}"
echo "  ENVIRONMENT: ${ENVIRONMENT:-development}"
echo ""

# Create trap to kill both processes on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start backend
echo "🔧 Starting backend (FastAPI)..."
cd "$REPO_DIR/apps/api"

# Install dependencies if needed
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -e . > /dev/null 2>&1
fi

# Start backend
python -m uvicorn api:app \
    --reload \
    --host 0.0.0.0 \
    --port "${API_PORT:-8000}" \
    --log-level info &

BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "🎨 Starting frontend (Vite)..."
cd "$REPO_DIR/apps/web"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install > /dev/null 2>&1
fi

# Start frontend dev server
npm run dev -- \
    --host 0.0.0.0 \
    --port 8080 &

FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}✓ Both servers running!${NC}"
echo "======================================"
echo ""
echo "📍 Access the app:"
echo "  • Local:   http://localhost:8080"
echo "  • Network: http://<your-ip>:8080"
echo ""
echo "📝 Backend:  http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "💬 Chat enabled with Claude AI agent"
echo ""
echo "Press Ctrl+C to stop both servers..."
echo ""

# Wait for both processes
wait
