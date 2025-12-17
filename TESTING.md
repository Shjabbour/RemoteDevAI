# Testing Guide for RemoteDevAI

This document provides comprehensive information about the test suite for the RemoteDevAI project.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Configuration](#test-configuration)
- [Writing Tests](#writing-tests)
- [Mocking Guidelines](#mocking-guidelines)
- [Coverage Requirements](#coverage-requirements)

## Overview

RemoteDevAI uses a comprehensive testing strategy with:

- **Jest** for backend packages (`packages/shared`, `packages/agents`, `packages/mcp-tools`, `apps/cloud`)
- **Vitest** for frontend packages (`apps/web`)
- **Jest with React Native** for mobile (`apps/mobile`)

## Test Structure

```
RemoteDevAI/
├── packages/
│   ├── shared/
│   │   ├── src/__tests__/
│   │   │   ├── validation.test.ts
│   │   │   ├── formatting.test.ts
│   │   │   ├── errors.test.ts
│   │   │   ├── schemas.test.ts
│   │   │   └── testUtils.ts
│   │   └── jest.config.js
│   ├── agents/
│   │   ├── src/__tests__/
│   │   │   ├── setup.ts
│   │   │   ├── testUtils.ts
│   │   │   ├── BaseAgent.test.ts
│   │   │   └── VoiceTranscriptionAgent.test.ts
│   │   └── jest.config.js
│   └── mcp-tools/
│       ├── src/__tests__/
│       │   ├── screenCapture.test.ts
│       │   └── codeRunner.test.ts
│       └── jest.config.js
└── apps/
    ├── cloud/
    │   ├── src/__tests__/
    │   │   ├── setup.ts
    │   │   ├── testUtils.ts
    │   │   ├── __mocks__/
    │   │   │   ├── prisma.ts
    │   │   │   ├── stripe.ts
    │   │   │   └── socket.io.ts
    │   │   ├── routes/
    │   │   │   └── auth.test.ts
    │   │   └── middleware/
    │   │       └── auth.test.ts
    │   └── jest.config.js
    ├── web/
    │   ├── src/__tests__/
    │   │   ├── setup.ts
    │   │   ├── components/
    │   │   │   └── Button.test.tsx
    │   │   └── lib/
    │   │       └── api.test.ts
    │   └── vitest.config.ts
    └── mobile/
        ├── src/__tests__/
        │   ├── setup.ts
        │   ├── stores/
        │   │   └── authStore.test.ts
        │   └── hooks/
        │       └── useVoiceRecording.test.ts
        └── jest.config.js
```

## Running Tests

### Run All Tests

```bash
# Run all tests across all packages
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage reports
npm run test:coverage
```

### Run Tests for Specific Packages

```bash
# Shared utilities
npm run test:shared

# Agent system
npm run test:agents

# MCP tools
npm run test:mcp-tools

# Cloud backend
npm run test:cloud

# Web frontend
npm run test:web

# Mobile app
npm run test:mobile
```

### Run Tests Within a Package

```bash
# Navigate to package directory
cd packages/shared

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Test Configuration

### Jest Configuration (Backend)

Each backend package has a `jest.config.js` file:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
```

### Vitest Configuration (Frontend)

Web app uses `vitest.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}']
  }
});
```

## Writing Tests

### Test Structure

Follow this pattern for all tests:

```typescript
describe('ComponentOrFunction', () => {
  // Setup
  beforeEach(() => {
    // Reset state, clear mocks
  });

  afterEach(() => {
    // Cleanup
  });

  describe('feature or method', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      // Test edge cases
    });

    it('should handle errors', () => {
      // Test error handling
    });
  });
});
```

### Unit Tests Example

```typescript
// packages/shared/src/__tests__/validation.test.ts
import { validateEmail } from '../utils/validation';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### Component Tests Example

```typescript
// apps/web/src/__tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '@/components/Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Agent Tests Example

```typescript
// packages/agents/src/__tests__/BaseAgent.test.ts
import { BaseAgent } from '../base/BaseAgent';

class TestAgent extends BaseAgent {
  protected async process(message, context) {
    return this.createSuccessResponse({ processed: true });
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;

  beforeEach(async () => {
    agent = new TestAgent(config);
    await agent.initialize();
  });

  it('should initialize successfully', () => {
    expect(agent.getStatus().initialized).toBe(true);
  });
});
```

## Mocking Guidelines

### Mock External Services

```typescript
// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock API calls
jest.mock('../api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'mock' }))
}));
```

### Mock Files

Create mock files in `__mocks__` directory:

```typescript
// apps/cloud/src/__tests__/__mocks__/prisma.ts
import { mockDeep, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});

export default prismaMock;
```

### Use Test Utilities

```typescript
// Use provided test utilities
import { createMockUser, createMockRequest } from '../testUtils';

const user = createMockUser({ email: 'test@example.com' });
const req = createMockRequest({ body: { name: 'Test' } });
```

## Coverage Requirements

### Minimum Coverage Thresholds

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Generate Coverage Report

```bash
npm run test:coverage
```

View coverage reports:
- Text summary in console
- HTML report in `coverage/` directory
- LCOV report for CI/CD integration

### Exclude from Coverage

Files excluded from coverage:
- Type definitions (`*.d.ts`)
- Entry points (`index.ts`, `main.ts`, `App.tsx`)
- Test files and utilities
- Configuration files

## Best Practices

### 1. Test Naming

- Use descriptive test names that explain what is being tested
- Follow the pattern: "should [expected behavior] when [condition]"

```typescript
it('should return user when valid token is provided', () => {
  // test
});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should calculate total', () => {
  // Arrange
  const items = [10, 20, 30];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(60);
});
```

### 3. Test Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Don't rely on test execution order

### 4. Mock Responsibly

- Mock external dependencies (APIs, databases)
- Don't mock the code you're testing
- Keep mocks simple and focused

### 5. Test Edge Cases

- Empty inputs
- Null/undefined values
- Boundary conditions
- Error scenarios

### 6. Async Testing

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Upload coverage
        run: npm run test:coverage
```

## Debugging Tests

### Run Single Test File

```bash
npm test -- validation.test.ts
```

### Run Specific Test

```bash
npm test -- -t "should validate email"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this documentation if needed

## Support

For questions about testing:
- Check existing test examples
- Review this documentation
- Open an issue on GitHub
