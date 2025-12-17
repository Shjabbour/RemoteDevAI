# Swagger/OpenAPI Integration Guide

This guide explains how to integrate the Swagger/OpenAPI documentation into your RemoteDevAI Cloud backend.

## Quick Start

### 1. Setup is Already Complete

All required files and dependencies have been created:

✅ Dependencies installed:
- `swagger-jsdoc`
- `swagger-ui-express`
- `js-yaml`

✅ Files created:
- `src/swagger/index.ts` - Swagger configuration
- `src/swagger/openapi.yaml` - Base OpenAPI spec
- `src/swagger/schemas/*.yaml` - All schema definitions
- `scripts/generate-api-docs.ts` - Static docs generator
- `scripts/generate-postman.ts` - Postman collection generator

### 2. Integrate Swagger into Server

**Option A: Add to existing server.ts**

Add this import:
```typescript
import { setupSwagger } from './swagger';
```

Add this line after middleware setup (around line 67, after body parsing):
```typescript
// Setup API documentation
setupSwagger(app);
```

**Option B: Quick copy-paste integration**

Add this code block to `server.ts` after line 57 (after body parsing):

```typescript
// Setup Swagger API Documentation
import { setupSwagger } from './swagger';
setupSwagger(app);
```

### 3. Add Script Commands to package.json

Add these scripts to the `scripts` section in `package.json`:

```json
"docs:generate": "tsx scripts/generate-api-docs.ts",
"docs:postman": "tsx scripts/generate-postman.ts",
"docs:all": "npm run docs:generate && npm run docs:postman"
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Access Documentation

Open your browser to:
- **Swagger UI**: http://localhost:3000/api/docs
- **JSON Spec**: http://localhost:3000/api/docs.json
- **YAML Spec**: http://localhost:3000/api/docs.yaml

## Adding Route Annotations

Currently, route files have basic comments. To get full Swagger documentation, you need to add JSDoc annotations.

### Example: Annotating the Login Route

**Before:**
```typescript
/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', authLimiter, validateBody(schemas.login), async (req, res) => {
  // ... handler code
});
```

**After:**
```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to user account
 *     description: Authenticate user with email and password. Returns JWT tokens for API access.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 */
router.post('/login', authLimiter, validateBody(schemas.login), async (req, res) => {
  // ... handler code
});
```

### Complete Annotations Reference

See `src/swagger/routes-annotations.md` for complete examples for every endpoint in the API.

## Generate Static Documentation

Generate standalone documentation files that can be hosted or distributed:

```bash
# Generate all documentation
npm run docs:all

# Or individually:
npm run docs:generate  # OpenAPI JSON/YAML + HTML
npm run docs:postman   # Postman collection
```

Output location: `docs/api/`

Files generated:
- `openapi.json` - OpenAPI spec (JSON)
- `openapi.yaml` - OpenAPI spec (YAML)
- `index.html` - Standalone Swagger UI
- `RemoteDevAI-Postman-Collection.json` - Postman collection
- `RemoteDevAI-Environment.json` - Postman environment
- `README.md` - Documentation guide

## Testing the Documentation

### 1. Visual Check
- Open http://localhost:3000/api/docs
- Verify all endpoints are listed
- Check that schemas are properly linked
- Test the "Try it out" feature

### 2. Authentication Testing
- Click "Authorize" button in Swagger UI
- Enter a JWT token (get one from `/api/auth/login`)
- Test authenticated endpoints

### 3. Import to Postman
```bash
# Generate Postman collection
npm run docs:postman

# Then in Postman:
# 1. Click "Import"
# 2. Select docs/api/RemoteDevAI-Postman-Collection.json
# 3. Import docs/api/RemoteDevAI-Environment.json
# 4. Set jwt_token variable after logging in
```

## CI/CD Integration

### GitHub Actions Example

Add to `.github/workflows/docs.yml`:

```yaml
name: Generate API Docs

on:
  push:
    branches: [main, master]
    paths:
      - 'apps/cloud/src/routes/**'
      - 'apps/cloud/src/swagger/**'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd apps/cloud
          npm install --legacy-peer-deps

      - name: Generate documentation
        run: |
          cd apps/cloud
          npm run docs:all

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/api
```

### Docker Integration

Add to your Dockerfile:

```dockerfile
# Generate API docs during build
RUN npm run docs:generate

# Serve static docs alongside API
COPY docs/api /app/public/docs
```

## Customization

### Branding

Edit `src/swagger/index.ts` to customize Swagger UI:

```typescript
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar {
      background-color: #your-brand-color;
    }
    .swagger-ui .info .title {
      color: #your-color;
    }
  `,
  customSiteTitle: 'Your Company API Docs',
  customfavIcon: '/your-favicon.ico',
};
```

### Server URLs

Edit `src/swagger/openapi.yaml`:

```yaml
servers:
  - url: http://localhost:3000
    description: Local development
  - url: https://staging-api.yourcompany.com
    description: Staging
  - url: https://api.yourcompany.com
    description: Production
```

### Contact Information

Edit `src/swagger/openapi.yaml`:

```yaml
info:
  contact:
    name: Your Team
    email: api@yourcompany.com
    url: https://yourcompany.com/support
```

## Advanced Features

### Request Examples

Add multiple examples to requests:

```yaml
requestBody:
  content:
    application/json:
      schema:
        $ref: '#/components/schemas/LoginRequest'
      examples:
        basicLogin:
          summary: Basic login
          value:
            email: "user@example.com"
            password: "password123"
        adminLogin:
          summary: Admin login
          value:
            email: "admin@example.com"
            password: "adminpass"
```

### Response Examples

Add examples to responses:

```yaml
responses:
  200:
    description: Success
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/User'
        examples:
          freeUser:
            summary: Free tier user
            value:
              id: "123"
              email: "user@example.com"
              subscriptionTier: "FREE"
          proUser:
            summary: Pro tier user
            value:
              id: "456"
              email: "pro@example.com"
              subscriptionTier: "PRO"
```

### Webhooks Documentation

Add webhook events to `openapi.yaml`:

```yaml
webhooks:
  subscriptionUpdated:
    post:
      summary: Subscription updated webhook
      description: Sent when a user's subscription changes
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                event:
                  type: string
                  example: "subscription.updated"
                data:
                  $ref: '#/components/schemas/Subscription'
```

### Code Generation

Generate client SDKs from OpenAPI spec:

```bash
# TypeScript/JavaScript
npm install -g openapi-typescript-codegen
openapi --input docs/api/openapi.json --output src/client

# Python
pip install openapi-python-client
openapi-python-client generate --url http://localhost:3000/api/docs.json

# Go
go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@latest
oapi-codegen -package api docs/api/openapi.yaml > api/client.go
```

## Troubleshooting

### "Cannot find module './swagger'"

**Solution**: Ensure `src/swagger/index.ts` exists and is properly exported.

```typescript
// Check that index.ts has this at the bottom:
export { swaggerSpec };
export default setupSwagger;
```

### Schemas not appearing in Swagger UI

**Solution**: Check schema file format:

```yaml
# ✅ Correct format
components:
  schemas:
    YourSchema:
      type: object
      properties: ...

# ❌ Wrong format
YourSchema:
  type: object
  properties: ...
```

### Routes not showing up

**Solution**: Ensure JSDoc annotations use `@swagger` tag and match the route exactly:

```typescript
/**
 * @swagger
 * /api/auth/login:  # Must match the exact route path
 *   post:           # Must match the HTTP method
 */
router.post('/login', ...)
```

### "Failed to load API definition"

**Solution**: Validate your OpenAPI spec:

```bash
# Using npx
npx swagger-cli validate src/swagger/openapi.yaml

# Or online
# Upload to https://editor.swagger.io
```

### TypeScript errors in swagger files

**Solution**: Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

## Migration from Existing Docs

If you have existing API documentation:

### From JSDoc

JSDoc comments are compatible. Just add `@swagger` tag:

```typescript
// Before
/**
 * Login endpoint
 * @param {LoginRequest} req.body - Login credentials
 * @returns {LoginResponse} - Auth tokens
 */

// After (add Swagger annotation above)
/**
 * @swagger
 * /api/auth/login:
 *   post: ...
 */
/**
 * Login endpoint
 * @param {LoginRequest} req.body - Login credentials
 * @returns {LoginResponse} - Auth tokens
 */
```

### From Postman

Export Postman collection → Convert to OpenAPI:

```bash
npm install -g postman-to-openapi
p2o collection.json -f openapi.yaml
```

Then merge into your OpenAPI spec.

### From README/Markdown

Copy request/response examples from README into OpenAPI examples.

## Maintenance

### When Adding New Endpoints

1. Write the route handler
2. Add JSDoc `@swagger` annotation
3. Create/update schemas if needed
4. Run `npm run docs:generate`
5. Test in Swagger UI
6. Commit schema files with code

### When Updating Existing Endpoints

1. Update route handler
2. Update JSDoc annotation
3. Update schema if request/response changed
4. Regenerate docs
5. Test changes

### Regular Maintenance

- Review and update examples quarterly
- Keep server URLs current
- Update API version when making breaking changes
- Ensure all new endpoints are documented

## Best Practices

1. **Document as you code**: Add Swagger annotations when writing routes
2. **Use examples**: Real examples make docs more useful
3. **Reference schemas**: Don't define schemas inline
4. **Include error responses**: Document all possible responses
5. **Test regularly**: Use "Try it out" to verify docs match reality
6. **Keep in sync**: Regenerate docs after schema changes
7. **Version properly**: Use semantic versioning for API changes

## Resources

- [Swagger Documentation README](src/swagger/README.md)
- [Route Annotations Guide](src/swagger/routes-annotations.md)
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)
- [Swagger UI Docs](https://swagger.io/docs/open-source-tools/swagger-ui/)
- [JSDoc to OpenAPI](https://github.com/Surnet/swagger-jsdoc)

## Support

For help with Swagger integration:
- Check the troubleshooting section above
- Review example annotations in `routes-annotations.md`
- Open an issue on GitHub
- Contact the backend team
