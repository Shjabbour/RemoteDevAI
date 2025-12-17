import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

// Load base OpenAPI spec
const baseSpec = yaml.load(
  fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8')
) as any;

// Load all schema files
const schemaFiles = [
  'common.schema.yaml',
  'auth.schema.yaml',
  'user.schema.yaml',
  'project.schema.yaml',
  'session.schema.yaml',
  'recording.schema.yaml',
  'subscription.schema.yaml',
  'relay.schema.yaml',
];

// Merge schemas into base spec
schemaFiles.forEach((file) => {
  const schemaPath = path.join(__dirname, 'schemas', file);
  if (fs.existsSync(schemaPath)) {
    const schema = yaml.load(fs.readFileSync(schemaPath, 'utf8')) as any;
    if (schema.components?.schemas) {
      baseSpec.components = baseSpec.components || {};
      baseSpec.components.schemas = {
        ...baseSpec.components.schemas,
        ...schema.components.schemas,
      };
    }
  }
});

// Swagger JSDoc configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: baseSpec,
  apis: [
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../routes/*.js'),
  ],
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Custom Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
    .swagger-ui .scheme-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
  `,
  customSiteTitle: 'RemoteDevAI API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      theme: 'monokai',
    },
  },
};

/**
 * Setup Swagger documentation for Express app
 * @param app Express application instance
 */
export const setupSwagger = (app: Express): void => {
  // Serve Swagger UI at /api/docs
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)
  );

  // Serve raw OpenAPI spec as JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve raw OpenAPI spec as YAML
  app.get('/api/docs.yaml', (req, res) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.send(yaml.dump(swaggerSpec));
  });

  console.log('📚 API Documentation available at:');
  console.log('   - Swagger UI: /api/docs');
  console.log('   - JSON spec: /api/docs.json');
  console.log('   - YAML spec: /api/docs.yaml');
};

export { swaggerSpec };
export default setupSwagger;
