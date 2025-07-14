#!/bin/bash
echo "� Testing MatchCare System..."

echo "� Checking structure..."
[ -d "backend" ] && echo "✅ Backend exists" || echo "❌ Backend missing"
[ -d "frontend" ] && echo "✅ Frontend exists" || echo "❌ Frontend missing"
[ -f "backend/server.js" ] && echo "✅ Backend server.js exists" || echo "❌ Backend server.js missing"
[ -f "frontend/package.json" ] && echo "✅ Frontend package.json exists" || echo "❌ Frontend package.json missing"

echo ""
echo "� Checking dependencies..."
[ -d "backend/node_modules" ] && echo "✅ Backend dependencies installed" || echo "❌ Backend dependencies missing"
[ -d "frontend/node_modules" ] && echo "✅ Frontend dependencies installed" || echo "❌ Frontend dependencies missing"

echo ""
echo "�️  Testing database..."
cd backend
if npm run test-db 2>/dev/null; then
    echo "✅ Database connection working"
else
    echo "❌ Database connection failed"
fi
cd ..

echo ""
echo "�� Testing URLs (if servers are running)..."
timeout 3 curl -s http://localhost:5000/api/health >/dev/null 2>&1 && echo "✅ Backend responding" || echo "❌ Backend not responding"
timeout 3 curl -s http://localhost:3000 >/dev/null 2>&1 && echo "✅ Frontend responding" || echo "❌ Frontend not responding"

echo ""
echo "� System ready for: ./start.sh"
