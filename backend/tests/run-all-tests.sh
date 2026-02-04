#!/bin/bash

# Phase 9: Comprehensive Test Runner
# Runs all tests: unit, integration, smoke, and performance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}  Phase 9: Comprehensive Test Suite${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd "$(dirname "$0")/.."

# Track results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} ${BOLD}Running ${suite_name} tests...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    if npm run $test_command 2>&1 | tee /tmp/test-output.log; then
        # Extract test counts from output
        local output=$(cat /tmp/test-output.log)
        local test_count=$(echo "$output" | grep -oP '\d+(?= passed)' | tail -1 || echo "0")
        local failed_count=$(echo "$output" | grep -oP '\d+(?= failed)' | tail -1 || echo "0")
        
        if [ -z "$test_count" ]; then
            test_count=0
        fi
        if [ -z "$failed_count" ]; then
            failed_count=0
        fi
        
        TOTAL_TESTS=$((TOTAL_TESTS + test_count))
        PASSED_TESTS=$((PASSED_TESTS + test_count - failed_count))
        FAILED_TESTS=$((FAILED_TESTS + failed_count))
        
        if [ "$failed_count" -eq 0 ]; then
            echo -e "\n${GREEN}✓ ${suite_name} tests: ${test_count} passed${NC}\n"
        else
            echo -e "\n${YELLOW}⚠ ${suite_name} tests: ${test_count} total, ${failed_count} failed${NC}\n"
        fi
    else
        echo -e "\n${RED}✗ ${suite_name} tests failed${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Run test suites
echo -e "${BOLD}${GREEN}Phase 9.1: Unit Tests${NC}\n"
run_test_suite "Unit" "test:unit"

echo -e "${BOLD}${GREEN}Phase 9.2: Integration Tests${NC}\n"
run_test_suite "Integration" "test:integration"

echo -e "${BOLD}${GREEN}Phase 9.3: Smoke Tests${NC}\n"
run_test_suite "Smoke" "test:smoke"

echo -e "${BOLD}${GREEN}Phase 9.4: Performance Tests${NC}\n"
run_test_suite "Performance" "test:performance"

# Summary
echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${BLUE}  Test Summary${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "  ${CYAN}Total Tests:${NC} ${TOTAL_TESTS}"
echo -e "  ${GREEN}Passed:${NC} ${PASSED_TESTS}"
echo -e "  ${RED}Failed:${NC} ${FAILED_TESTS}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}✗ Some tests failed${NC}\n"
    exit 1
fi
