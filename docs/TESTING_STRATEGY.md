# Testing Strategy

## Overview

- **Framework:** Vitest
- **Unit tests:** `backend/src/__tests__/`
- **Integration tests:** `backend/tests/integration/`
- **Smoke tests:** `backend/tests/smoke/`
- **Performance tests:** `backend/tests/performance/`

## Running Tests

```bash
cd backend

# All tests
npm run test:all

# By category
npm test                    # Unit tests
npm run test:integration    # Integration
npm run test:smoke          # Smoke
npm run test:performance    # Performance
```

## Test Coverage

- Unit: time ranges, file locking, cache, members, validation, API
- Integration: auth flow, payments, reservations, member-reservation, roles, journal API
- Smoke: health, CRUD, filters, errors
- Performance: response time and throughput checks

## Environment

Tests use isolated temp data dirs. Use Stripe test keys and mock email where needed.
