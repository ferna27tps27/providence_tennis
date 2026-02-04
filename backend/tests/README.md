# Backend Tests

Run from `backend/`:

```bash
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run test:smoke       # Smoke tests
npm run test:performance # Performance tests
npm run test:all         # All of the above
```

**Full testing guide:** [docs/TESTING_STRATEGY.md](../../docs/TESTING_STRATEGY.md)

Structure: `integration/`, `smoke/`, `performance/`. Unit tests live in `src/__tests__/`.
