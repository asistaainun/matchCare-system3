#!/bin/bash
echo "â¹ï¸  Stopping MatchCare..."

# Kill processes on specific ports (Windows style)
echo "í´§ Stopping backend (port 5000)..."
netstat -ano | findstr :5000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || echo "No process on port 5000"

echo "í´§ Stopping frontend (port 3000)..."  
netstat -ano | findstr :3000 | awk '{print $5}' | xargs -r taskkill //PID //F 2>/dev/null || echo "No process on port 3000"

# Alternative: kill by process name
taskkill //IM node.exe //F 2>/dev/null || true
taskkill //IM "npm.cmd" //F 2>/dev/null || true

echo "í»‘ MatchCare stopped"
