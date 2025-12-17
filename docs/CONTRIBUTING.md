# Contributing to RemoteDevAI

Thank you for your interest in contributing to RemoteDevAI! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender identity and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race
- Ethnicity
- Age
- Religion
- Nationality

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behaviors include:**
- Harassment, trolling, or discriminatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Violations can be reported to conduct@remotedevai.com. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **Git** latest version
- **PostgreSQL** 14.x or higher (for backend development)
- **Redis** 6.x or higher (for backend development)
- **Anthropic API key** (for AI features)

### Find an Issue

1. Browse [open issues](https://github.com/Shjabbour/RemoteDevAI/issues)
2. Look for issues labeled:
   - `good first issue` - Great for newcomers
   - `help wanted` - Community contributions welcome
   - `bug` - Bug fixes needed
   - `enhancement` - New features

3. Comment on the issue to claim it
4. Wait for maintainer confirmation before starting work

### Ask Questions

- **General questions**: [Discussions](https://github.com/Shjabbour/RemoteDevAI/discussions)
- **Bug reports**: [Issues](https://github.com/Shjabbour/RemoteDevAI/issues)
- **Real-time chat**: [Discord](https://discord.gg/remotedevai)

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/RemoteDevAI.git
cd RemoteDevAI

# Add upstream remote
git remote add upstream https://github.com/Shjabbour/RemoteDevAI.git
```

### 2. Install Dependencies

```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..

# Desktop agent dependencies
cd desktop-agent
npm install
cd ..

# Mobile app dependencies (optional)
cd mobile-app
npm install
cd ..
```

### 3. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
# Required:
# - DATABASE_URL
# - REDIS_URL
# - ANTHROPIC_API_KEY
```

### 4. Set Up Database

```bash
# Create database
createdb remotedevai_dev

# Run migrations
npm run migrate

# Seed test data (optional)
npm run seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Desktop Agent (optional)
cd desktop-agent && npm run dev
```

### 6. Verify Setup

- Backend: http://localhost:3001/health
- Frontend: http://localhost:5173
- API docs: http://localhost:3001/api/docs

## Project Structure

```
RemoteDevAI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── package.json
│
├── src/                   # Backend (Node.js)
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   │   ├── agents/      # AI agent implementations
│   │   ├── GeminiService.js
│   │   └── ...
│   ├── middleware/       # Express middleware
│   ├── database/         # Database layer
│   ├── utils/            # Utilities
│   └── server.js         # Entry point
│
├── desktop-agent/         # Desktop agent (Electron)
│   ├── src/
│   │   ├── main/        # Main process
│   │   ├── renderer/    # Renderer process
│   │   └── mcp/         # MCP server implementation
│   └── package.json
│
├── mobile-app/            # Mobile app (React Native)
│   ├── src/
│   │   ├── screens/     # Screen components
│   │   ├── components/  # Shared components
│   │   └── services/    # API/services
│   ├── ios/             # iOS native code
│   ├── android/         # Android native code
│   └── package.json
│
├── docs/                  # Documentation
│   ├── README.md
│   ├── API.md
│   ├── ARCHITECTURE.md
│   └── ...
│
├── tests/                 # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── migrations/            # Database migrations
│   ├── 001_initial.sql
│   └── ...
│
├── scripts/               # Utility scripts
│   ├── setup.sh
│   └── ...
│
├── .github/               # GitHub workflows
│   └── workflows/
│
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Coding Standards

### JavaScript/TypeScript

Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript).

**Key points:**
- Use ES6+ features
- Prefer `const` over `let`, never `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use async/await over raw promises
- Use destructuring where appropriate

**Example:**

```javascript
// Good
const getUserById = async (userId) => {
  const { data } = await api.get(`/users/${userId}`);
  return data;
};

// Bad
function getUserById(userId) {
  return api.get('/users/' + userId).then(function(response) {
    return response.data;
  });
}
```

### React

- Use functional components with hooks
- No class components
- Use custom hooks for reusable logic
- Keep components small and focused
- Use prop-types or TypeScript for type checking

**Example:**

```javascript
// Good
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <Loading />;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
    </div>
  );
}
```

### Backend

- Use async/await for all async operations
- Return standardized JSON responses
- Handle errors with try/catch
- Use middleware for cross-cutting concerns
- Validate input with express-validator

**Example:**

```javascript
// routes/users.js
router.post('/', validateUser, async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      message: error.message
    });
  }
});
```

### Naming Conventions

- **Files**: camelCase for JS files, PascalCase for React components
  - `userService.js`
  - `UserProfile.jsx`

- **Variables**: camelCase
  - `const userId = '123';`

- **Constants**: UPPER_SNAKE_CASE
  - `const MAX_RETRIES = 3;`

- **Classes**: PascalCase
  - `class UserService { }`

- **Functions**: camelCase, verb-first
  - `getUserById()`, `createUser()`, `validateEmail()`

### Comments

```javascript
/**
 * Fetch user by ID from the database
 *
 * @param {string} userId - UUID of the user
 * @returns {Promise<Object>} User object
 * @throws {Error} If user not found
 */
async function getUserById(userId) {
  // Implementation
}
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix
```

Configuration in `.eslintrc.js`:
```javascript
module.exports = {
  extends: ['airbnb', 'airbnb/hooks'],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'react/jsx-filename-extension': [1, { extensions: ['.jsx', '.tsx'] }],
  },
};
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `perf`: Performance improvements

**Examples:**

```
feat(agents): add code generation agent

Implement the code generation agent that converts natural language
descriptions into code using Claude API.

- Add CodeGenerationAgent class
- Implement prompt engineering
- Add tests for basic scenarios

Closes #123
```

```
fix(api): handle null responses from database

When querying for non-existent users, the API was returning null
instead of an appropriate error. Now returns 404 with error message.

Fixes #456
```

### Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/).

Benefits:
- Auto-generate changelogs
- Semantic versioning
- Clear commit history

## Pull Request Process

### 1. Create a Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feat/add-code-review-agent

# Or bug fix branch
git checkout -b fix/api-null-response
```

Branch naming:
- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### 2. Make Changes

- Write code following [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation if needed
- Run tests locally

```bash
# Run tests
npm test

# Run linter
npm run lint

# Check types (if using TypeScript)
npm run type-check
```

### 3. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(agents): add code review agent"

# Or use interactive commit
git commit
```

### 4. Push to Your Fork

```bash
git push origin feat/add-code-review-agent
```

### 5. Open Pull Request

1. Go to [RemoteDevAI repository](https://github.com/Shjabbour/RemoteDevAI)
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] All tests pass locally
- [ ] I have updated CHANGELOG.md
```

5. Submit PR
6. Wait for review

### 6. Code Review

Reviewers will:
- Check code quality
- Verify tests pass
- Suggest improvements
- Approve or request changes

**Responding to feedback:**
```bash
# Make requested changes
git add .
git commit -m "refactor: address review feedback"
git push origin feat/add-code-review-agent
```

### 7. Merge

Once approved:
- Maintainer will merge PR
- Your branch will be deleted
- Changes will be in main branch

**Clean up:**
```bash
git checkout main
git pull upstream main
git branch -d feat/add-code-review-agent
```

## Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── services/
│   ├── utils/
│   └── ...
├── integration/       # Integration tests
│   ├── api/
│   └── ...
└── e2e/              # End-to-end tests
    └── ...
```

### Writing Tests

**Unit Test Example** (Jest):

```javascript
// tests/unit/services/userService.test.js
const userService = require('../../../src/services/userService');

describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      const user = await userService.createUser(userData);

      expect(user).toHaveProperty('id');
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
    });

    it('should throw error for duplicate email', async () => {
      const userData = { email: 'duplicate@example.com' };

      await userService.createUser(userData);

      await expect(
        userService.createUser(userData)
      ).rejects.toThrow('Email already exists');
    });
  });
});
```

**Integration Test Example**:

```javascript
// tests/integration/api/users.test.js
const request = require('supertest');
const app = require('../../../src/server');

describe('User API', () => {
  let authToken;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    authToken = res.body.data.tokens.accessToken;
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newuser@example.com',
          name: 'New User'
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('id');
    });
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- tests/unit/services/userService.test.js

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

### Test Coverage

Aim for:
- **Overall**: 80%+ coverage
- **New code**: 90%+ coverage
- **Critical paths**: 100% coverage

Check coverage:
```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

## Documentation

### Code Documentation

- Add JSDoc comments for all public functions
- Document complex logic
- Explain "why" not just "what"

### User Documentation

When adding features, update:
- `docs/README.md` - Overview
- `docs/API.md` - API changes
- `docs/AGENTS.md` - Agent changes
- `README.md` - If user-facing

### Changelog

Update `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- Code review agent for automated code reviews (#123)

### Fixed
- API null response handling (#456)

### Changed
- Updated dependencies to latest versions
```

## Community

### Communication Channels

- **GitHub Discussions**: [Discussions](https://github.com/Shjabbour/RemoteDevAI/discussions)
- **Discord**: [discord.gg/remotedevai](https://discord.gg/remotedevai)
- **Twitter**: [@RemoteDevAI](https://twitter.com/RemoteDevAI)
- **Email**: community@remotedevai.com

### Weekly Sync

- **When**: Every Thursday, 3PM UTC
- **Where**: Discord voice channel
- **What**: Discuss ongoing work, blockers, plans

### Contributor Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project README
- Annual contributor highlights

## Questions?

- Check the [FAQ](https://remotedevai.com/faq)
- Search [existing issues](https://github.com/Shjabbour/RemoteDevAI/issues)
- Ask in [Discussions](https://github.com/Shjabbour/RemoteDevAI/discussions)
- Join [Discord](https://discord.gg/remotedevai)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to RemoteDevAI!**
