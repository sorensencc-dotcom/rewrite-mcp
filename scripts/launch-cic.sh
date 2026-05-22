#!/bin/bash
# launch-cic.sh
# One-click launcher script for CIC Control Plane

# Navigate to the workspace root
cd /mnt/c/dev

# Set environment variables (using the same hardened configuration we verified)
export CP_GOOGLE_CLIENT_ID="801446490180-h3oaobgjrf4pp57er7ho5ug1om9qfcp9.apps.googleusercontent.com"
export CP_ALLOWED_EMAILS="sorensencc@gmail.com"
export CP_TELEMETRY_URL="http://localhost:4310"
export CP_REGION="us-east"
export CP_AUTH_DISABLED="true"
export NODE_PATH="node_modules"

echo "✦ Launching CIC Control Plane..."

# Start the control plane
cd rewrite-mcp/apps/control-plane
npm start &

# Wait a moment for server to boot
sleep 2

# Open the dashboard in the default browser
echo "✦ Opening Dashboard: http://localhost:3000/dashboard"
xdg-open http://localhost:3000/dashboard
