# Contributing to RemoteDevAI

Thank you for your interest in contributing to RemoteDevAI! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and considerate in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/RemoteDevAI.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Setting Up Your Environment

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development servers
npm run dev
```

### Making Changes

1. Make your changes in a feature branch
2. Write or update tests as needed
3. Ensure all tests pass: `npm test`
4. Lint your code: `npm run lint`
5. Format your code: `npm run format`

### Commit Guidelines

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```bash
git commit -m "feat: add voice command for debugging"
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific package
npm test -w apps/mobile
```

### Code Style

- Use TypeScript for new code
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update the CHANGELOG.md
5. Submit a pull request with a clear description

### PR Title Format

Follow the same format as commit messages:
```
feat: add new agent for code review
fix: resolve websocket connection issue
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Checklist
- [ ] My code follows the code style
- [ ] I have added tests
- [ ] All tests pass
- [ ] I have updated the documentation
```

## Project Structure

```
RemoteDevAI/
├── apps/           # Applications
├── packages/       # Shared packages
├── docs/          # Documentation
├── scripts/       # Build and deployment scripts
└── infra/         # Infrastructure configs
```

## Areas for Contribution

### High Priority
- Bug fixes
- Documentation improvements
- Test coverage
- Performance optimizations

### Feature Requests
- New AI agents
- Additional MCP tools
- Mobile app enhancements
- Desktop agent improvements

### Good First Issues
Look for issues labeled `good-first-issue` in the issue tracker.

## Development Guidelines

### TypeScript

- Use strict mode
- Define types for all function parameters and return values
- Avoid `any` type when possible

### React/React Native

- Use functional components with hooks
- Follow React best practices
- Keep components small and reusable

### API Design

- Follow RESTful principles
- Use consistent error handling
- Document all endpoints

### Testing

- Write unit tests for business logic
- Write integration tests for APIs
- Write E2E tests for critical flows

## Documentation

- Update README.md for user-facing changes
- Update API documentation for API changes
- Add JSDoc comments for public functions
- Update architecture docs for structural changes

## Versioning

We use semantic versioning (SemVer):
- MAJOR: Breaking changes
- MINOR: New features (backwards compatible)
- PATCH: Bug fixes (backwards compatible)

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Push tag to trigger CI/CD
5. Create GitHub release

## Need Help?

- Check existing documentation
- Search existing issues
- Ask in GitHub Discussions
- Reach out on Discord (link in README)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md
- GitHub contributors page

Thank you for contributing to RemoteDevAI!
