#!/bin/bash
echo "í·ª Testing MatchCare System..."

echo "í³ Checking structure..."
[ -d "backend" ] && echo "âœ… Backend exists" || echo "âŒ Backend missing"
[ -d "frontend" ] && echo "âœ… Frontend exists" || echo "âŒ Frontend missing"
[ -f "backend/server.js" ] && echo "âœ… Backend server.js exists" || echo "âŒ Backend server.js missing"
[ -f "frontend/package.json" ] && echo "âœ… Frontend package.json exists" || echo "âŒ Frontend package.json missing"

echo ""
echo "í³¦ Checking dependencies..."
[ -d "backend/node_modules" ] && echo "âœ… Backend dependencies installed" || echo "âŒ Backend dependencies missing"
[ -d "frontend/node_modules" ] && echo "âœ… Frontend dependencies installed" || echo "âŒ Frontend dependencies missing"

echo ""
echo "í·„ï¸  Testing database..."
cd backend
if npm run test-db 2>/dev/null; then
    echo "âœ… Database connection working"
else
    echo "âŒ Database connection failed"
fi
cd ..

echo ""
echo "ï¿½ï¿½ Testing URLs (if servers are running)..."
timeout 3 curl -s http://localhost:5000/api/health >/dev/null 2>&1 && echo "âœ… Backend responding" || echo "âŒ Backend not responding"
timeout 3 curl -s http://localhost:3000 >/dev/null 2>&1 && echo "âœ… Frontend responding" || echo "âŒ Frontend not responding"

echo ""
echo "í³ System ready for: ./start.sh"
