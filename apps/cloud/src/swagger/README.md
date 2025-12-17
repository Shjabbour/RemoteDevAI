# RemoteDevAI API Documentation

This directory contains the Swagger/OpenAPI documentation configuration for the RemoteDevAI Cloud API.

## Structure

```
swagger/
├── index.ts                  # Swagger setup and configuration
├── openapi.yaml              # Base OpenAPI 3.0 specification
├── routes-annotations.md     # Documentation for adding route annotations
├── schemas/                  # OpenAPI schema definitions
│   ├── auth.schema.yaml
│   ├── common.schema.yaml
│   ├── project.schema.yaml
│   ├── recording.schema.yaml
│   ├── relay.schema.yaml
│   ├── session.schema.yaml
│   ├── subscription.schema.yaml
│   └── user.schema.yaml
└── examples/                 # Request/response examples (future)
```

## Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `swagger-jsdoc` - Generate OpenAPI from JSDoc comments
- `swagger-ui-express` - Serve Swagger UI
- `js-yaml` - Parse YAML schema files

### 2. Add Swagger to server.ts

Add this import at the top of `server.ts`:

```typescript
import { setupSwagger } from './swagger';
```

Then add this line after setting up middleware and before mounting routes:

```typescript
// Setup API documentation
setupSwagger(app);
```

### 3. Add JSDoc Annotations to Routes

Each route file should include Swagger annotations. Example:

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to user account
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
 */
router.post('/login', ...)
```

See `routes-annotations.md` for complete examples for all endpoints.

## Accessing Documentation

Once set up, the API documentation is available at:

### Development
- **Swagger UI**: http://localhost:3000/api/docs
- **JSON Spec**: http://localhost:3000/api/docs.json
- **YAML Spec**: http://localhost:3000/api/docs.yaml

### Production
- **Swagger UI**: https://api.remotedevai.com/api/docs
- **JSON Spec**: https://api.remotedevai.com/api/docs.json
- **YAML Spec**: https://api.remotedevai.com/api/docs.yaml

## Generating Static Documentation

To generate static documentation files:

```bash
cd apps/cloud

# Generate OpenAPI JSON/YAML and HTML docs
npm run docs:generate

# Generate Postman collection
npm run docs:postman

# Generate all documentation
npm run docs:all
```

This creates files in `docs/api/`:
- `openapi.json` - OpenAPI spec in JSON format
- `openapi.yaml` - OpenAPI spec in YAML format
- `index.html` - Standalone Swagger UI page
- `RemoteDevAI-Postman-Collection.json` - Postman collection
- `RemoteDevAI-Environment.json` - Postman environment
- `README.md` - Documentation guide

## Schema Organization

Schemas are organized by domain:

### auth.schema.yaml
- `RegisterRequest`, `RegisterResponse`
- `LoginRequest`, `LoginResponse`
- `RefreshTokenRequest`, `RefreshTokenResponse`

### user.schema.yaml
- `User` - User model
- `UserProfile` - User profile with subscription
- `UserStatistics` - User statistics
- `UpdateProfileRequest`

### project.schema.yaml
- `Project` - Project model
- `CreateProjectRequest`
- `UpdateProjectRequest`
- `ProjectList` - Paginated projects
- `ProjectStatistics`

### session.schema.yaml
- `Session` - Session model
- `CreateSessionRequest`
- `UpdateSessionRequest`
- `SessionList` - Paginated sessions

### recording.schema.yaml
- `Recording` - Recording model
- `CreateRecordingRequest`
- `UpdateRecordingRequest`
- `RecordingList` - Paginated recordings
- `UploadUrlResponse`
- `DownloadUrlResponse`

### subscription.schema.yaml
- `Subscription` - Subscription model
- `SubscriptionStatus`
- `CreateCheckoutRequest`, `CheckoutResponse`
- `CreatePortalRequest`, `PortalResponse`
- `CancelSubscriptionRequest`
- `PricingPlans`

### relay.schema.yaml
- `DesktopAgent` - Desktop agent model
- `RelayMessageRequest`
- `ExecuteCommandRequest`
- `FileRequestRequest`, `FileSendRequest`
- `StartRecordingRequest`, `StopRecordingRequest`
- `PingResponse`

### common.schema.yaml
- `Pagination` - Pagination metadata
- `SuccessResponse` - Generic success response
- `ErrorResponse` - Generic error response
- `HealthCheckResponse`

## Adding New Endpoints

When adding a new endpoint:

1. **Add route file** in `src/routes/`

2. **Add JSDoc annotation** before the route handler:

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     summary: Description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/YourSchema'
 *     responses:
 *       200:
 *         description: Success
 */
```

3. **Add schemas** if needed in appropriate schema file

4. **Regenerate docs** by running `npm run docs:generate`

## Best Practices

### 1. Use Schema References
Always reference schemas instead of defining inline:
```yaml
# ✅ Good
schema:
  $ref: '#/components/schemas/User'

# ❌ Bad
schema:
  type: object
  properties:
    id: ...
```

### 2. Include Examples
Add examples to schemas for better documentation:
```yaml
User:
  properties:
    email:
      type: string
      example: "user@example.com"
```

### 3. Document All Responses
Include all possible responses, not just success:
```yaml
responses:
  200:
    description: Success
  400:
    $ref: '#/components/responses/ValidationError'
  401:
    $ref: '#/components/responses/UnauthorizedError'
  404:
    $ref: '#/components/responses/NotFoundError'
```

### 4. Tag Endpoints Properly
Use consistent tags to group endpoints:
- `Authentication` - Auth endpoints
- `Users` - User management
- `Projects` - Project management
- `Sessions` - Session management
- `Recordings` - Recording management
- `Payments` - Payment and subscription
- `Relay` - Desktop agent relay
- `Webhooks` - Webhook endpoints

### 5. Security Schemes
Mark authenticated endpoints:
```yaml
security:
  - bearerAuth: []
```

## Testing Documentation

### Manual Testing
1. Start the dev server: `npm run dev`
2. Open http://localhost:3000/api/docs
3. Click "Authorize" and enter a JWT token
4. Test endpoints using "Try it out"

### Validation
Validate your OpenAPI spec:
```bash
# Using online validator
# Upload openapi.json to: https://validator.swagger.io/

# Using CLI (if installed)
swagger-cli validate openapi.yaml
```

## Troubleshooting

### Swagger UI not loading
- Check that `setupSwagger(app)` is called in server.ts
- Verify the route is registered before 404 handler
- Check console for errors

### Schemas not appearing
- Ensure schema files are in `schemas/` directory
- Check that schema files have `.yaml` extension
- Verify schema structure matches OpenAPI 3.0 format

### Routes not showing
- Add JSDoc `@swagger` comments to route handlers
- Check that route files are in the `apis` array in swagger config
- Regenerate docs after changes

### Generate script fails
- Run `npm install` to ensure dependencies are installed
- Check TypeScript compilation: `npm run build`
- Verify file paths in script are correct

## Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [JSDoc to OpenAPI](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI Examples](https://github.com/OAI/OpenAPI-Specification/tree/main/examples)

## Support

For issues or questions about the API documentation:
- Open an issue on GitHub
- Contact the backend team
- Check the main project README
