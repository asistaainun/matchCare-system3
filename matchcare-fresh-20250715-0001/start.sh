#!/bin/bash
echo "� Starting MatchCare..."

# Create logs directory
mkdir -p logs

# Kill existing processes on ports
echo "� Checking ports..."
netstat -ano | findstr :5000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || true
netstat -ano | findstr :3000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || true

# Start backend
echo "� Starting backend server..."
cd backend
start /min cmd /c "npm run dev > ../logs/backend.log 2>&1"
echo "✅ Backend starting..."

# Wait for backend
echo "⏳ Waiting 5 seconds for backend..."
sleep 5

# Start frontend
echo "� Starting frontend server..."
cd ../frontend
start /min cmd /c "set BROWSER=none && npm start > ../logs/frontend.log 2>&1"
echo "✅ Frontend starting..."

echo ""
echo "� MatchCare is starting up!"
echo "� Backend:  http://localhost:5000"
echo "� Frontend: http://localhost:3000"
echo ""
echo "⏳ Please wait 30 seconds for full startup..."
echo "� Check logs: tail -f logs/backend.log"
echo "⏹️  To stop: ./stop.sh"
