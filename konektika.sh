#!/bin/bash
# Konektika VPN Management Script

set -e

PROJECT_DIR="/home/mosat/konektika"
SERVER_DIR="$PROJECT_DIR/server"
MOBILE_DIR="$PROJECT_DIR/KonektikaMobile"
OPENVPN_CONFIG="$SERVER_DIR/openvpn/server.conf"
PID_FILE="/tmp/konektika-server.pid"
LOG_FILE="/tmp/konektika-server.log"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}   Konektika VPN Management${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

start_backend() {
    print_info "Starting backend server..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            print_error "Backend server is already running (PID: $PID)"
            return 1
        fi
    fi
    
    cd "$SERVER_DIR"
    node server.js > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    sleep 2
    
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        print_success "Backend server started (PID: $(cat $PID_FILE))"
        print_info "Logs: tail -f $LOG_FILE"
        print_info "API: http://localhost:3000/health"
    else
        print_error "Failed to start backend server"
        print_info "Check logs: cat $LOG_FILE"
        return 1
    fi
}

stop_backend() {
    print_info "Stopping backend server..."
    
    if [ ! -f "$PID_FILE" ]; then
        print_error "Backend server is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        kill "$PID"
        rm "$PID_FILE"
        print_success "Backend server stopped"
    else
        print_error "Backend server process not found"
        rm "$PID_FILE"
    fi
}

status_backend() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            print_success "Backend server is running (PID: $PID)"
            print_info "URL: http://localhost:3000"
            curl -s http://localhost:3000/health | head -5
        else
            print_error "Backend server is not running (stale PID file)"
        fi
    else
        print_error "Backend server is not running"
    fi
}

start_vpn() {
    print_info "Starting OpenVPN server..."
    
    if ! command -v openvpn &> /dev/null; then
        print_error "OpenVPN is not installed"
        return 1
    fi
    
    if [ ! -f "$OPENVPN_CONFIG" ]; then
        print_error "OpenVPN config not found: $OPENVPN_CONFIG"
        return 1
    fi
    
    echo "This requires sudo password..."
    sudo openvpn --config "$OPENVPN_CONFIG" --daemon
    
    sleep 2
    
    if pgrep -x openvpn > /dev/null; then
        print_success "OpenVPN server started"
        print_info "Check status: sudo systemctl status openvpn"
    else
        print_error "Failed to start OpenVPN server"
    fi
}

stop_vpn() {
    print_info "Stopping OpenVPN server..."
    
    echo "This requires sudo password..."
    sudo pkill openvpn
    
    sleep 1
    
    if ! pgrep -x openvpn > /dev/null; then
        print_success "OpenVPN server stopped"
    else
        print_error "Failed to stop OpenVPN server"
    fi
}

status_vpn() {
    if pgrep -x openvpn > /dev/null; then
        print_success "OpenVPN server is running"
        print_info "Port: 1194/UDP"
        print_info "Subnet: 10.8.0.0/24"
    else
        print_error "OpenVPN server is not running"
    fi
}

start_mobile() {
    print_info "Starting React Native mobile app..."
    
    cd "$MOBILE_DIR"
    print_info "Starting Metro bundler..."
    npm start
}

logs_backend() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        print_error "No log file found"
    fi
}

check_system() {
    print_header
    echo ""
    print_info "System Check"
    echo ""
    
    # Check Node.js
    if command -v node &> /dev/null; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js not installed"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm: $(npm --version)"
    else
        print_error "npm not installed"
    fi
    
    # Check MySQL
    if command -v mysql &> /dev/null; then
        print_success "MySQL: $(mysql --version | awk '{print $5}' | sed 's/,//')"
    else
        print_error "MySQL not installed"
    fi
    
    # Check OpenVPN
    if command -v openvpn &> /dev/null; then
        print_success "OpenVPN: $(openvpn --version | head -1 | awk '{print $2}')"
    else
        print_error "OpenVPN not installed"
    fi
    
    # Check IP forwarding
    if [ "$(sysctl -n net.ipv4.ip_forward)" = "1" ]; then
        print_success "IP forwarding: enabled"
    else
        print_error "IP forwarding: disabled"
    fi
    
    echo ""
    print_info "Database Connection"
    if mysql -u konektika_user -pkonektika_pass_2024 -e "USE konektika; SELECT COUNT(*) FROM bundles;" 2>/dev/null | tail -1 > /dev/null; then
        BUNDLE_COUNT=$(mysql -u konektika_user -pkonektika_pass_2024 -D konektika -se "SELECT COUNT(*) FROM bundles;" 2>/dev/null)
        print_success "Database accessible ($BUNDLE_COUNT bundles)"
    else
        print_error "Cannot connect to database"
    fi
    
    echo ""
}

show_usage() {
    print_header
    echo ""
    echo "Usage: $0 {command}"
    echo ""
    echo "Commands:"
    echo "  start           - Start backend and VPN servers"
    echo "  stop            - Stop backend and VPN servers"
    echo "  restart         - Restart backend and VPN servers"
    echo "  status          - Show status of all services"
    echo ""
    echo "  backend start   - Start backend server only"
    echo "  backend stop    - Stop backend server only"
    echo "  backend status  - Show backend status"
    echo "  backend logs    - View backend logs"
    echo ""
    echo "  vpn start       - Start OpenVPN server only"
    echo "  vpn stop        - Stop OpenVPN server only"
    echo "  vpn status      - Show VPN status"
    echo ""
    echo "  mobile          - Start mobile app (Metro bundler)"
    echo "  check           - Check system configuration"
    echo ""
    echo "Examples:"
    echo "  $0 start        # Start all services"
    echo "  $0 backend logs # View backend logs"
    echo "  $0 check        # Check system status"
    echo ""
}

# Main script logic
case "${1:-}" in
    start)
        print_header
        echo ""
        start_backend
        echo ""
        start_vpn
        echo ""
        ;;
    stop)
        print_header
        echo ""
        stop_backend
        echo ""
        stop_vpn
        echo ""
        ;;
    restart)
        print_header
        echo ""
        stop_backend
        echo ""
        stop_vpn
        echo ""
        sleep 2
        start_backend
        echo ""
        start_vpn
        echo ""
        ;;
    status)
        print_header
        echo ""
        status_backend
        echo ""
        status_vpn
        echo ""
        ;;
    backend)
        case "${2:-}" in
            start) start_backend ;;
            stop) stop_backend ;;
            status) status_backend ;;
            logs) logs_backend ;;
            *) show_usage ;;
        esac
        ;;
    vpn)
        case "${2:-}" in
            start) start_vpn ;;
            stop) stop_vpn ;;
            status) status_vpn ;;
            *) show_usage ;;
        esac
        ;;
    mobile)
        start_mobile
        ;;
    check)
        check_system
        ;;
    *)
        show_usage
        ;;
esac
