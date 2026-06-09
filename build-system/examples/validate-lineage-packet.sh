#!/bin/bash
# Validate lineage packet against schema

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <lineage-packet.json>"
  exit 1
fi

PACKET_FILE="$1"
SCHEMA_FILE="build-system/schemas/lineage-packet.schema.json"

echo "Validating lineage packet: $PACKET_FILE"
echo "Schema: $SCHEMA_FILE"
echo ""

# Check if files exist
if [ ! -f "$PACKET_FILE" ]; then
  echo "❌ Packet file not found: $PACKET_FILE"
  exit 1
fi

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi

# Validate JSON structure
echo "Checking JSON structure..."
if ! python3 -m json.tool "$PACKET_FILE" > /dev/null 2>&1; then
  echo "❌ Invalid JSON"
  exit 1
fi
echo "✓ Valid JSON"
echo ""

# Validate against schema
echo "Validating against schema..."
python3 -c "
import json
from jsonschema import validate, ValidationError

with open('$PACKET_FILE') as f:
  packet = json.load(f)

with open('$SCHEMA_FILE') as f:
  schema = json.load(f)

try:
  validate(instance=packet, schema=schema)
  print('✓ Schema validation passed')
except ValidationError as e:
  print(f'❌ Schema validation failed: {e.message}')
  exit(1)
"

echo ""

# Check required fields
echo "Checking required fields..."
python3 -c "
import json

with open('$PACKET_FILE') as f:
  packet = json.load(f)

required = ['artifact_id', 'agent_id', 'version', 'build_id', 'inputs', 'outputs', 'provenance']
for field in required:
  if field not in packet:
    print(f'❌ Missing required field: {field}')
    exit(1)
  print(f'✓ {field}: {packet[field]}')
"

echo ""
echo "✅ Lineage packet is valid!"
