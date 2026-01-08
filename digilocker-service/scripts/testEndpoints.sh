#!/bin/bash

# Test script for DigiLocker Service endpoints
# Usage: ./scripts/testEndpoints.sh

BASE_URL="http://localhost:3000"
USER_ID="test-user-123"

echo "==================================="
echo "DigiLocker Service - API Test Script"
echo "==================================="
echo ""

# Generate JWT token
echo "Generating JWT token for userId: $USER_ID"
TOKEN=$(node scripts/generateToken.js $USER_ID | grep -A 1 "Token:" | tail -n 1)
echo "Token: $TOKEN"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "GET $BASE_URL/health"
curl -X GET "$BASE_URL/health" -w "\nStatus: %{http_code}\n\n"

# Test 2: Get Auth URL (Protected)
echo "Test 2: Get DigiLocker Auth URL (Protected)"
echo "GET $BASE_URL/digilocker/auth-url"
curl -X GET "$BASE_URL/digilocker/auth-url" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Unauthorized Access
echo "Test 3: Unauthorized Access (No Token)"
echo "GET $BASE_URL/digilocker/auth-url"
curl -X GET "$BASE_URL/digilocker/auth-url" \
  -w "\nStatus: %{http_code}\n\n"

echo "==================================="
echo "Tests completed!"
echo "==================================="
