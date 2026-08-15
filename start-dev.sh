#!/bin/bash
# Robust dev server launcher — double-fork daemonization.
# Usage: ./start-dev.sh
# Kills any existing next dev, then starts a new one detached from this shell.
set -e
cd /home/z/my-project

# Kill any existing next dev processes
pkill -f "next dev" 2>/dev/null || true
sleep 1

# Clear the log
> /home/z/my-project/dev.log

# Start the dev server in a fully detached session:
# - setsid: new session (no controlling terminal, survives parent exit)
# - nohup: ignore SIGHUP
# - redirect all 3 std streams away from this shell
# - & : background
# - disown: remove from this shell's job table
setsid nohup ./node_modules/.bin/next dev -p 3000 \
  > /home/z/my-project/dev.log 2>&1 < /dev/null &
disown 2>/dev/null || true

# Don't wait — return immediately. The caller can poll dev.log.
echo "Dev server starting (PID will appear in dev.log)."
exit 0
