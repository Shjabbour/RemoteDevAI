# Installation & Setup Guide

## Prerequisites

- Node.js >= 18.x
- npm or yarn

## Installation

1. Navigate to the shared package directory:
```bash
cd packages/shared
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Build the package:
```bash
npm run build
# or
yarn build
```

## Development

For active development with auto-rebuild:

```bash
npm run dev
# or
yarn dev
```

## Type Checking

To check types without building:

```bash
npm run typecheck
# or
yarn typecheck
```

## Using in Other Packages

### In package.json

Add to your package.json dependencies:

```json
{
  "dependencies": {
    "@remotedevai/shared": "*"
  }
}
```

### In tsconfig.json

Add to your TypeScript config:

```json
{
  "compilerOptions": {
    "paths": {
      "@remotedevai/shared": ["../shared/src"]
    }
  }
}
```

## Importing Types

```typescript
import { User, Project, Session } from '@remotedevai/shared';
```

## Importing Utilities

```typescript
import { validateEmail, formatDate } from '@remotedevai/shared';
```

## Next Steps

1. Install dependencies: `npm install`
2. Build the package: `npm run build`
3. Use in other packages by adding as dependency
4. Import types and utilities as needed
