#!/bin/bash
echo "Ì∫Ä Starting MatchCare..."

# Create logs directory
mkdir -p logs

# Kill existing processes on ports
echo "Ì¥ß Checking ports..."
netstat -ano | findstr :5000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || true
netstat -ano | findstr :3000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || true

# Start backend
echo "Ì≥ä Starting backend server..."
cd backend
start /min cmd /c "npm run dev > ../logs/backend.log 2>&1"
echo "‚úÖ Backend starting..."

# Wait for backend
echo "‚è≥ Waiting 5 seconds for backend..."
sleep 5

# Start frontend
echo "Ìºê Starting frontend server..."
cd ../frontend
start /min cmd /c "set BROWSER=none && npm start > ../logs/frontend.log 2>&1"
echo "‚úÖ Frontend starting..."

echo ""
echo "Ìæâ MatchCare is starting up!"
echo "Ì≥ä Backend:  http://localhost:5000"
echo "Ìºê Frontend: http://localhost:3000"
echo ""
echo "‚è≥ Please wait 30 seconds for full startup..."
echo "Ì≥ù Check logs: tail -f logs/backend.log"
echo "‚èπÔ∏è  To stop: ./stop.sh"
