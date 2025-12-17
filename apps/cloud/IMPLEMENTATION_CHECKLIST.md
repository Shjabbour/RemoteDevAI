# Swagger Documentation - Implementation Checklist

Quick checklist to get the API documentation up and running.

## ✅ Prerequisites (Already Done)
- [x] Dependencies installed (swagger-jsdoc, swagger-ui-express, js-yaml)
- [x] Swagger configuration created (`src/swagger/index.ts`)
- [x] OpenAPI specification created (`src/swagger/openapi.yaml`)
- [x] All schema definitions created (`src/swagger/schemas/*.yaml`)
- [x] Documentation scripts created (`scripts/generate-*.ts`)
- [x] Integration guides written

## 📋 Implementation Steps (To Do)

### Step 1: Integrate Swagger into Server (5 minutes)

**File:** `apps/cloud/src/server.ts`

1. **Add import** (around line 7, with other imports):
```typescript
import { setupSwagger } from './swagger';
```

2. **Call setup function** (after line 57, after body parsing middleware):
```typescript
// Setup API Documentation
setupSwagger(app);
```

**Expected Result:**
- Server starts without errors
- Console shows: "📚 API Documentation available at..."

### Step 2: Add NPM Scripts (2 minutes)

**File:** `apps/cloud/package.json`

Add these to the `"scripts"` section:
```json
"docs:generate": "tsx scripts/generate-api-docs.ts",
"docs:postman": "tsx scripts/generate-postman.ts",
"docs:all": "npm run docs:generate && npm run docs:postman"
```

**Expected Result:**
- `npm run docs:generate` works
- `npm run docs:postman` works
- `npm run docs:all` works

### Step 3: Test Documentation (5 minutes)

1. **Start the server:**
```bash
cd apps/cloud
npm run dev
```

2. **Open Swagger UI:**
```
http://localhost:3000/api/docs
```

**Expected Result:**
- Swagger UI loads
- All endpoint tags visible (Authentication, Users, Projects, etc.)
- Schemas are loaded
- Can view endpoints (even without annotations)

3. **Test JSON/YAML endpoints:**
```
http://localhost:3000/api/docs.json
http://localhost:3000/api/docs.yaml
```

**Expected Result:**
- JSON spec downloads/displays
- YAML spec downloads/displays

### Step 4: Generate Static Documentation (5 minutes)

```bash
cd apps/cloud
npm run docs:all
```

**Expected Result:**
- `docs/api/` directory created
- Files generated:
  - `openapi.json`
  - `openapi.yaml`
  - `index.html`
  - `RemoteDevAI-Postman-Collection.json`
  - `RemoteDevAI-Environment.json`
  - `README.md`

### Step 5: Test Postman Collection (10 minutes)

1. **Open Postman**
2. **Click Import**
3. **Import:** `docs/api/RemoteDevAI-Postman-Collection.json`
4. **Import:** `docs/api/RemoteDevAI-Environment.json`
5. **Select "RemoteDevAI Environment"** in environment dropdown
6. **Test login:**
   - Open "Authentication" folder
   - Run "Login to user account"
   - Copy the token from response
7. **Set JWT token:**
   - Click environment variables
   - Set `jwt_token` to the token you copied
8. **Test authenticated endpoint:**
   - Try any endpoint in Projects, Sessions, etc.

**Expected Result:**
- Collection imports successfully
- Environment variables work
- Authentication works
- Endpoints return expected responses

## 🎯 Optional Steps (Enhanced Documentation)

### Option A: Add Route Annotations (Recommended)

For full interactive "Try it out" functionality, add JSDoc annotations to routes.

**Reference:** `src/swagger/routes-annotations.md`

**Example:**
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

**Time:** 2-3 hours to annotate all routes
**Benefit:** Complete interactive documentation with examples

### Option B: Set Up CI/CD Documentation Generation

**File:** `.github/workflows/docs.yml`

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

**Time:** 30 minutes
**Benefit:** Auto-generated docs hosted on GitHub Pages

### Option C: Generate Client SDKs

```bash
# TypeScript SDK
npm install -g openapi-typescript-codegen
openapi --input docs/api/openapi.json --output src/sdk

# Python SDK
pip install openapi-python-client
openapi-python-client generate --url http://localhost:3000/api/docs.json

# Go SDK
go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@latest
oapi-codegen -package api docs/api/openapi.yaml > api/client.go
```

**Time:** 1 hour
**Benefit:** Type-safe client libraries

## 🔍 Verification Checklist

After implementation, verify these work:

### Swagger UI
- [ ] Swagger UI loads at `/api/docs`
- [ ] All endpoint groups (tags) are visible
- [ ] Schemas load correctly
- [ ] "Authorize" button works
- [ ] Can expand endpoints and see details

### API Specs
- [ ] JSON spec available at `/api/docs.json`
- [ ] YAML spec available at `/api/docs.yaml`
- [ ] Specs are valid (test at https://editor.swagger.io/)

### Static Documentation
- [ ] `npm run docs:generate` works without errors
- [ ] Files created in `docs/api/`
- [ ] `index.html` opens and works in browser
- [ ] OpenAPI spec is valid

### Postman
- [ ] Collection imports without errors
- [ ] Environment variables work
- [ ] Authentication flow works
- [ ] Can call authenticated endpoints

### Integration
- [ ] Server starts without errors
- [ ] Console shows documentation URLs
- [ ] No TypeScript errors
- [ ] Documentation accessible in production

## 🐛 Troubleshooting

### Issue: "Cannot find module './swagger'"
**Solution:** Check that `src/swagger/index.ts` exists and has proper exports

### Issue: Swagger UI shows "Failed to load API definition"
**Solution:** Run `npm install --legacy-peer-deps` to install dependencies

### Issue: Schemas not appearing
**Solution:** Check schema files are in `src/swagger/schemas/` with `.yaml` extension

### Issue: Routes not showing
**Solution:** Routes will show after adding `@swagger` JSDoc annotations

### Issue: TypeScript errors
**Solution:** Ensure `js-yaml` and `@types/js-yaml` are installed

## 📊 Success Metrics

You'll know it's working when:

✅ Swagger UI loads with all endpoint groups visible
✅ Can download JSON and YAML specs
✅ Static docs generation works
✅ Postman collection imports and works
✅ Authentication in Swagger UI works
✅ Can make successful API calls through Swagger UI

## 📚 Resources

- **Quick Start:** `SWAGGER_INTEGRATION.md`
- **Full Guide:** `src/swagger/README.md`
- **Route Examples:** `src/swagger/routes-annotations.md`
- **Summary:** `API_DOCUMENTATION_SUMMARY.md`

## 🎉 Next Steps After Implementation

1. **Share with team:** Send documentation URL
2. **Update README:** Add link to API docs
3. **Add to onboarding:** Include in developer onboarding
4. **Set up automation:** Configure CI/CD for docs
5. **Gather feedback:** Ask team for improvements
6. **Keep updated:** Update docs with new endpoints

## ⏱️ Time Estimates

- **Minimum implementation:** 15 minutes (Steps 1-3)
- **Full basic setup:** 30 minutes (Steps 1-5)
- **With route annotations:** 3-4 hours
- **With CI/CD:** +30 minutes
- **With SDKs:** +1 hour

## 🚀 Quick Start (TL;DR)

```bash
# 1. Add these 2 lines to server.ts:
import { setupSwagger } from './swagger';
setupSwagger(app);  # Add after middleware setup

# 2. Add scripts to package.json (see above)

# 3. Restart server
npm run dev

# 4. Open browser
http://localhost:3000/api/docs

# 5. Generate static docs
npm run docs:all

# Done! ✅
```

---

**Questions?** Check `SWAGGER_INTEGRATION.md` for detailed help.
