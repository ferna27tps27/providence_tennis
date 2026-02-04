#!/bin/bash

# Phase 9: Test Summary Script
# Runs all test suites and generates a comprehensive report

set -e

cd "$(dirname "$0")/.."

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase 9: Comprehensive Test Suite Execution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run each test suite and capture results
echo "Running Unit Tests..."
npm run test:unit > /tmp/unit-tests.log 2>&1 || true

echo "Running Integration Tests..."
npm run test:integration > /tmp/integration-tests.log 2>&1 || true

echo "Running Smoke Tests..."
npm run test:smoke > /tmp/smoke-tests.log 2>&1 || true

echo "Running Performance Tests..."
npm run test:performance > /tmp/performance-tests.log 2>&1 || true

# Extract summary from each log
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Results Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for suite in unit integration smoke performance; do
    log_file="/tmp/${suite}-tests.log"
    if [ -f "$log_file" ]; then
        echo "📊 ${suite^} Tests:"
        grep -E "Test Files|Tests " "$log_file" | tail -1 || echo "  No results found"
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
