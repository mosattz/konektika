#!/bin/bash

echo "========================================"
echo "Konektika Render Deployment Checker"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Domain Resolution
echo "1. Checking DNS resolution..."
if nslookup konektika.online > /dev/null 2>&1; then
    IP=$(nslookup konektika.online | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    echo -e "${GREEN}✓${NC} Domain resolves to: $IP"
else
    echo -e "${RED}✗${NC} Domain does not resolve"
fi
echo ""

# Check 2: HTTPS Connectivity
echo "2. Checking HTTPS connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 https://konektika.online/health 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Server responding (HTTP $HTTP_CODE)"
    echo "Response:"
    curl -s https://konektika.online/health | jq . 2>/dev/null || curl -s https://konektika.online/health
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗${NC} Connection timeout - server might be sleeping or down"
else
    echo -e "${YELLOW}!${NC} Server responding with HTTP $HTTP_CODE"
fi
echo ""

# Check 3: API Endpoints
echo "3. Checking API endpoints..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 10 https://konektika.online/api/bundles 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} /api/bundles responding (HTTP $HTTP_CODE)"
    BUNDLE_COUNT=$(curl -s https://konektika.online/api/bundles | jq '.data | length' 2>/dev/null)
    if [ ! -z "$BUNDLE_COUNT" ]; then
        echo "   Found $BUNDLE_COUNT bundles"
    fi
elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${RED}✗${NC} API endpoint timeout"
else
    echo -e "${YELLOW}!${NC} API responding with HTTP $HTTP_CODE"
fi
echo ""

# Check 4: SSL Certificate
echo "4. Checking SSL certificate..."
SSL_INFO=$(echo | openssl s_client -servername konektika.online -connect konektika.online:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ ! -z "$SSL_INFO" ]; then
    echo -e "${GREEN}✓${NC} SSL certificate valid"
    echo "$SSL_INFO" | sed 's/^/   /'
else
    echo -e "${RED}✗${NC} SSL certificate check failed"
fi
echo ""

# Check 5: Local Server Check
echo "5. Checking local server..."
if pgrep -f "node server.js" > /dev/null; then
    echo -e "${GREEN}✓${NC} Local server is running"
    LOCAL_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null)
    if [ ! -z "$LOCAL_RESPONSE" ]; then
        echo "   Local server health: OK"
    fi
else
    echo -e "${YELLOW}!${NC} Local server not running"
fi
echo ""

# Check 6: Database Connection
echo "6. Checking local database..."
if mysql -h localhost -u konektika_user -pkonektika_pass_2024 -e "SELECT 1" konektika > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Local database accessible"
    BUNDLE_COUNT=$(mysql -h localhost -u konektika_user -pkonektika_pass_2024 -N -e "SELECT COUNT(*) FROM bundles" konektika 2>/dev/null)
    USER_COUNT=$(mysql -h localhost -u konektika_user -pkonektika_pass_2024 -N -e "SELECT COUNT(*) FROM users" konektika 2>/dev/null)
    echo "   Bundles: $BUNDLE_COUNT, Users: $USER_COUNT"
else
    echo -e "${RED}✗${NC} Cannot connect to local database"
fi
echo ""

# Summary
echo "========================================"
echo "Summary & Recommendations"
echo "========================================"
echo ""

if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "" ]; then
    echo -e "${RED}ISSUE DETECTED:${NC} Render deployment not responding"
    echo ""
    echo "Likely causes:"
    echo "  1. Free tier service sleeping (wakes on first request, 30-60s)"
    echo "  2. Service crashed - check Render logs"
    echo "  3. Environment variables missing"
    echo "  4. Database connection failing"
    echo ""
    echo "Actions to take:"
    echo "  1. Check Render dashboard: https://dashboard.render.com"
    echo "  2. Review logs for errors"
    echo "  3. Verify environment variables are set"
    echo "  4. Try manual redeploy"
    echo "  5. Check Aiven database status"
    echo ""
elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}SUCCESS:${NC} Render deployment is working!"
    echo ""
    echo "You can now:"
    echo "  1. Build and test the mobile app"
    echo "  2. Register test users"
    echo "  3. Test payment flow"
    echo ""
else
    echo -e "${YELLOW}WARNING:${NC} Server responding but with issues"
    echo "HTTP Status: $HTTP_CODE"
    echo "Check Render logs for details"
    echo ""
fi

echo "For detailed instructions, see: RENDER_DEPLOYMENT_GUIDE.md"
