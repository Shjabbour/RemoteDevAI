#!/usr/bin/env ts-node

/**
 * Generate static API documentation from OpenAPI spec
 *
 * This script generates static documentation files in JSON and YAML formats
 * that can be hosted on a static site or imported into API documentation tools.
 *
 * Usage: npm run docs:generate
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import swaggerJsdoc from 'swagger-jsdoc';

// Load base OpenAPI spec
const baseSpecPath = path.join(__dirname, '../src/swagger/openapi.yaml');
const baseSpec = yaml.load(fs.readFileSync(baseSpecPath, 'utf8')) as any;

// Load all schema files
const schemaDir = path.join(__dirname, '../src/swagger/schemas');
const schemaFiles = fs.readdirSync(schemaDir).filter(file => file.endsWith('.yaml'));

schemaFiles.forEach((file) => {
  const schemaPath = path.join(schemaDir, file);
  const schema = yaml.load(fs.readFileSync(schemaPath, 'utf8')) as any;

  if (schema.components?.schemas) {
    baseSpec.components = baseSpec.components || {};
    baseSpec.components.schemas = {
      ...baseSpec.components.schemas,
      ...schema.components.schemas,
    };
  }
});

// Swagger JSDoc configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: baseSpec,
  apis: [
    path.join(__dirname, '../src/routes/*.ts'),
    path.join(__dirname, '../src/routes/*.js'),
  ],
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Create docs directory if it doesn't exist
const docsDir = path.join(__dirname, '../../../docs/api');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Write JSON spec
const jsonPath = path.join(docsDir, 'openapi.json');
fs.writeFileSync(jsonPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`✅ Generated JSON spec: ${jsonPath}`);

// Write YAML spec
const yamlPath = path.join(docsDir, 'openapi.yaml');
fs.writeFileSync(yamlPath, yaml.dump(swaggerSpec, { lineWidth: -1 }));
console.log(`✅ Generated YAML spec: ${yamlPath}`);

// Generate a simple HTML documentation page
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RemoteDevAI API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    #swagger-ui { max-width: 1400px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

const htmlPath = path.join(docsDir, 'index.html');
fs.writeFileSync(htmlPath, htmlContent);
console.log(`✅ Generated HTML documentation: ${htmlPath}`);

// Generate a README for the docs
const readmeContent = `# RemoteDevAI API Documentation

This directory contains the OpenAPI 3.0 specification for the RemoteDevAI Cloud API.

## Files

- **openapi.json** - OpenAPI specification in JSON format
- **openapi.yaml** - OpenAPI specification in YAML format
- **index.html** - Interactive Swagger UI documentation

## Viewing Documentation

### Local Viewing
Open \`index.html\` in your browser to view the interactive API documentation.

### Online Viewing
You can upload these files to any of these services:

1. **Swagger Editor**: https://editor.swagger.io/
   - Upload \`openapi.yaml\` or \`openapi.json\`

2. **Redoc**: https://redocly.github.io/redoc/
   - Use with the JSON or YAML file

3. **Postman**:
   - Import \`openapi.json\` to create a collection

## Updating Documentation

Documentation is auto-generated from:
- Base spec: \`apps/cloud/src/swagger/openapi.yaml\`
- Schemas: \`apps/cloud/src/swagger/schemas/*.yaml\`
- Route annotations: JSDoc comments in route files

To regenerate after changes:
\`\`\`bash
cd apps/cloud
npm run docs:generate
\`\`\`

## API Endpoint

The live API documentation is available at:
- Development: http://localhost:3000/api/docs
- Production: https://api.remotedevai.com/api/docs

You can also access the raw specs:
- JSON: http://localhost:3000/api/docs.json
- YAML: http://localhost:3000/api/docs.yaml

## Base URL

Development: \`http://localhost:3000\`
Production: \`https://api.remotedevai.com\`

## Authentication

Most endpoints require a Bearer token:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

Get a token by calling:
- \`POST /api/auth/register\` - Create account
- \`POST /api/auth/login\` - Login

## Support

For API support, contact: support@remotedevai.com
`;

const readmePath = path.join(docsDir, 'README.md');
fs.writeFileSync(readmePath, readmeContent);
console.log(`✅ Generated README: ${readmePath}`);

console.log('\n🎉 API documentation generated successfully!');
console.log(`📁 Output directory: ${docsDir}`);
console.log('\nYou can now:');
console.log('  1. Open index.html in your browser');
console.log('  2. Import openapi.json into Postman');
console.log('  3. Upload openapi.yaml to Swagger Editor');
