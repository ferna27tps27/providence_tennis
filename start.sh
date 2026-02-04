#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Ports to clean and use
FRONTEND_PORT=3009
BACKEND_PORT=8080

# Function to print timestamp
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Function to print log message with timestamp
log_info() {
    echo -e "${CYAN}[$(timestamp)]${NC} ${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${CYAN}[$(timestamp)]${NC} ${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${CYAN}[$(timestamp)]${NC} ${RED}✗${NC} $1"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${BLUE}  $1${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Banner
echo -e "\n${BOLD}${GREEN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║     Providence Tennis Academy - Development Server       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

log_step "Initialization"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    log_info "Checking port ${port} availability..."
    
    # Find and kill process on the port (works on macOS and Linux)
    if lsof -ti:${port} > /dev/null 2>&1; then
        local pid=$(lsof -ti:${port})
        log_warn "Port ${port} is in use by process ${pid}"
        log_info "Terminating process ${pid}..."
        
        if lsof -ti:${port} | xargs kill -9 2>/dev/null; then
            sleep 1
            # Verify the port is free
            if ! lsof -ti:${port} > /dev/null 2>&1; then
                log_info "Port ${port} cleaned successfully"
            else
                log_error "Failed to free port ${port}. Please check manually."
                exit 1
            fi
        else
            log_error "Failed to kill process on port ${port}"
            exit 1
        fi
    else
        log_info "Port ${port} is available"
    fi
}

log_step "Port Management"
kill_port ${FRONTEND_PORT}
kill_port ${BACKEND_PORT}

log_step "Environment Check"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    log_warn ".env.local file not found"
    log_warn "Creating .env.local template..."
    cat > .env.local << EOF
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_GENAI_USE_VERTEXAI=false
EOF
    log_warn "Please update .env.local with your actual API keys"
    log_warn "Some features (AI Assistant) may not work without proper configuration"
else
    log_info ".env.local file found"
    # Check if GOOGLE_API_KEY is set (basic check)
    if grep -q "GOOGLE_API_KEY=.*[^your_]" .env.local 2>/dev/null; then
        log_info "Google API key appears to be configured"
    else
        log_warn "Google API key may not be configured properly"
    fi
fi

# Check if backend .env exists
if [ ! -f backend/.env ]; then
    log_warn "backend/.env file not found"
    log_warn "Backend requires GOOGLE_API_KEY and GOOGLE_GENAI_MODEL"
else
    log_info "backend/.env file found"
fi

log_step "Dependencies Check"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    log_warn "node_modules directory not found"
    log_info "Installing dependencies (this may take a moment)..."
    if npm install; then
        log_info "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
else
    log_info "node_modules directory found"
    # Check if package.json has been modified more recently than node_modules
    if [ package.json -nt node_modules/.package-lock.json ] 2>/dev/null; then
        log_warn "package.json appears newer than node_modules"
        log_info "Running npm install to ensure dependencies are up to date..."
        npm install
    fi
fi

# Check backend dependencies
if [ ! -d "backend/node_modules" ]; then
    log_warn "backend/node_modules directory not found"
    log_info "Installing backend dependencies (this may take a moment)..."
    if (cd backend && npm install); then
        log_info "Backend dependencies installed successfully"
    else
        log_error "Failed to install backend dependencies"
        exit 1
    fi
else
    log_info "backend/node_modules directory found"
    if [ backend/package.json -nt backend/node_modules/.package-lock.json ] 2>/dev/null; then
        log_warn "backend/package.json appears newer than backend/node_modules"
        log_info "Running npm install in backend..."
        (cd backend && npm install)
    fi
fi

log_step "Starting Development Server"

# Display server information
echo -e "${BOLD}${CYAN}Server Configuration:${NC}"
echo -e "  ${BLUE}•${NC} Frontend Port: ${GREEN}${FRONTEND_PORT}${NC}"
echo -e "  ${BLUE}•${NC} Backend Port: ${GREEN}${BACKEND_PORT}${NC}"
echo -e "  ${BLUE}•${NC} Environment: ${GREEN}Development${NC}"
echo -e "  ${BLUE}•${NC} Frontend URL: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  ${BLUE}•${NC} Backend URL: ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "  ${BLUE}•${NC} Framework: ${GREEN}Next.js 14 + Express${NC}"
echo ""

log_info "Starting backend development server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

cleanup() {
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
}
trap cleanup EXIT

log_info "Starting Next.js development server..."
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}\n"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Start the development server
npm run dev
