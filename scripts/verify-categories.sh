#!/bin/bash
# V3 Phase 3 verification — end-to-end product creation with dynamic category fields.
set -e
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null || true
sleep 1

# Start dev server in background
nohup node_modules/.bin/next dev -p 3000 > dev.log 2>&1 &
SRV_PID=$!
disown $SRV_PID
echo "[verify] server PID: $SRV_PID"

# Poll for readiness
for i in {1..40}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "302" ]; then
    echo "[verify] server ready after ${i}s (HTTP $CODE)"
    break
  fi
  sleep 1
done

sleep 2
grep -i "prisma cache" dev.log | tail -1 || true

echo ""
echo "=== STEP 1: Login as sarine@biocosmetique.sn ==="
# Hit the login page first to establish session
curl -s -c /tmp/verifscan_cookies.txt -o /dev/null http://localhost:3000/login
# Get CSRF token
CSRF=$(curl -s -b /tmp/verifscan_cookies.txt -c /tmp/verifscan_cookies.txt http://localhost:3000/api/auth/csrf | grep -oE '"csrfToken":"[^"]+"' | cut -d'"' -f4)
echo "CSRF token: ${CSRF:0:20}..."

# Submit credentials
curl -s -b /tmp/verifscan_cookies.txt -c /tmp/verifscan_cookies.txt \
  -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=sarine@biocosmetique.sn&password=Demo1234!&csrfToken=${CSRF}&callbackUrl=http%3A%2F%2Flocalhost%3A3000%2Fdashboard&json=true" \
  -o /tmp/login_resp.txt -w "Login HTTP: %{http_code}\n"

# Verify we have a session token
SESSION_TOKEN=$(grep -E "next-auth\.session-token" /tmp/verifscan_cookies.txt | awk '{print $7}')
echo "Session token set: $([ -n "$SESSION_TOKEN" ] && echo 'yes' || echo 'no')"

echo ""
echo "=== STEP 2: POST /api/products with V3 Phase 3 fields (fruits-legumes, isExport=true) ==="
CREATE_RESP=$(curl -s -b /tmp/verifscan_cookies.txt -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mangues Kent Bio Premium (Test V3)",
    "brand": "Sarine Bio Cosmétiques",
    "description": "Mangues Kent biologiques fraîches exportées vers l Europe",
    "weight": "5 kg",
    "categoryId": "fruits-legumes",
    "isExport": true,
    "categoryData": {
      "variety": "Mangue Kent",
      "originCountry": "Sénégal",
      "originRegion": "Casamance",
      "harvestDate": "2024-10-15",
      "harvestMethod": "Manuelle",
      "caliber": "Extra",
      "brixDegree": 14,
      "organic": true,
      "storageTemperature": 8,
      "shelfLifeDays": 21,
      "packaging": "Cagette",
      "plotReference": "PARCEL-A12"
    },
    "exportData": {
      "destinationCountry": "France",
      "incoterm": "FOB",
      "customsCode": "08045000"
    },
    "certifications": [
      {"name": "GlobalGAP", "issuer": "FoodPLUS", "validUntil": "2025-12-31"},
      {"name": "Bio Européen", "issuer": "Ecocert", "validUntil": "2026-06-30"}
    ],
    "isPublic": true,
    "status": "ACTIVE"
  }' \
  -w "\nHTTP_CODE:%{http_code}")
echo "Create response:"
echo "$CREATE_RESP" | head -30
HTTP_CODE=$(echo "$CREATE_RESP" | tail -1)
echo "Create HTTP: $HTTP_CODE"

# Extract product ID
PRODUCT_ID=$(echo "$CREATE_RESP" | head -1 | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "Created product ID: $PRODUCT_ID"

echo ""
echo "=== STEP 3: Direct DB verification ==="
if [ -n "$PRODUCT_ID" ]; then
  bun run scripts/verify-product.ts "$PRODUCT_ID"
else
  echo "No product ID extracted — skipping DB verification"
fi

echo ""
echo "=== DONE — killing dev server ==="
kill $SRV_PID 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
echo "[verify] complete"
