# @remotedevai/shared

Shared TypeScript types, utilities, and schemas for RemoteDevAI applications.

## Overview

This package contains:

- **Types**: Comprehensive TypeScript interfaces and enums for all domain entities
- **Schemas**: Zod validation schemas for runtime type checking
- **Utilities**: Helper functions for validation, formatting, error handling, and more
- **Constants**: Shared constants and configuration values

## Installation

```bash
npm install @remotedevai/shared
# or
yarn add @remotedevai/shared
```

## Usage

### Types

```typescript
import {
  User,
  Project,
  Session,
  Recording,
  AgentType,
  SocketEvents
} from '@remotedevai/shared';
```

### Schemas

```typescript
import { userSchema, createProjectSchema } from '@remotedevai/shared';

// Validate data at runtime
const result = userSchema.safeParse(userData);
```

### Utilities

```typescript
import {
  validateEmail,
  formatDate,
  formatFileSize,
  ValidationError
} from '@remotedevai/shared';
```

## License

MIT
