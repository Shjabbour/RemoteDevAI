# Test Scripts for RemoteDevAI

## Add these scripts to root package.json

```json
{
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "test:watch": "npm run test:watch --workspaces --if-present",
    "test:coverage": "npm run test:coverage --workspaces --if-present",
    "test:shared": "npm run test -w packages/shared",
    "test:agents": "npm run test -w packages/agents",
    "test:mcp-tools": "npm run test -w packages/mcp-tools",
    "test:cloud": "npm run test -w apps/cloud",
    "test:web": "npm run test -w apps/web",
    "test:mobile": "npm run test -w apps/mobile"
  }
}
```

## Add these scripts to packages/shared/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1"
  }
}
```

## Add these scripts to packages/agents/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1"
  }
}
```

## Add these scripts to packages/mcp-tools/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1"
  }
}
```

## Add these scripts to apps/cloud/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.11",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "jest-mock-extended": "^3.0.5",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1"
  }
}
```

## Add these scripts to apps/web/package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/ui": "^1.0.4",
    "jsdom": "^23.0.1",
    "vitest": "^1.0.4"
  }
}
```

## Add these scripts to apps/mobile/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-hooks": "^8.0.1",
    "@testing-library/react-native": "^12.4.2",
    "@types/jest": "^29.5.11",
    "jest": "^29.7.0",
    "jest-expo": "^50.0.1"
  }
}
```

## Installation Instructions

After adding scripts to package.json files, run:

```bash
# Install all dependencies
npm install

# Or install per package
cd packages/shared && npm install
cd packages/agents && npm install
cd packages/mcp-tools && npm install
cd apps/cloud && npm install
cd apps/web && npm install
cd apps/mobile && npm install
```

## Running Tests

From root directory:

```bash
# Run all tests
npm test

# Run tests for a specific package
npm run test:shared
npm run test:agents
npm run test:mcp-tools
npm run test:cloud
npm run test:web
npm run test:mobile

# Watch mode for all packages
npm run test:watch

# Coverage for all packages
npm run test:coverage
```
