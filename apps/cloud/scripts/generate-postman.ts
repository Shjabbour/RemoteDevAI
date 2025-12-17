#!/usr/bin/env ts-node

/**
 * Generate Postman Collection from OpenAPI spec
 *
 * This script converts the OpenAPI specification into a Postman Collection v2.1
 * that can be imported directly into Postman for API testing.
 *
 * Usage: npm run postman:generate
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
const openApiSpec = swaggerJsdoc(swaggerOptions);

// Convert OpenAPI to Postman Collection
interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: any[];
    url: {
      raw: string;
      host: string[];
      path: string[];
      query?: any[];
    };
    body?: {
      mode: string;
      raw: string;
    };
    description?: string;
  };
}

interface PostmanFolder {
  name: string;
  item: (PostmanItem | PostmanFolder)[];
}

const collection: any = {
  info: {
    name: 'RemoteDevAI Cloud API',
    description: openApiSpec.info.description,
    version: openApiSpec.info.version,
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: '{{jwt_token}}',
        type: 'string',
      },
    ],
  },
  variable: [
    {
      key: 'base_url',
      value: 'http://localhost:3000',
      type: 'string',
    },
    {
      key: 'jwt_token',
      value: '',
      type: 'string',
    },
  ],
  item: [] as PostmanFolder[],
};

// Group requests by tag
const folders: { [key: string]: PostmanItem[] } = {};

// Parse OpenAPI paths
for (const [path, pathItem] of Object.entries(openApiSpec.paths || {})) {
  for (const [method, operation] of Object.entries(pathItem as any)) {
    if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
      const op = operation as any;
      const tag = op.tags?.[0] || 'Other';

      if (!folders[tag]) {
        folders[tag] = [];
      }

      const postmanPath = path.replace(/\{([^}]+)\}/g, ':$1'); // Convert {id} to :id
      const pathParts = postmanPath.split('/').filter(Boolean);

      const item: PostmanItem = {
        name: op.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
            },
          ],
          url: {
            raw: `{{base_url}}${path}`,
            host: ['{{base_url}}'],
            path: pathParts,
          },
          description: op.description,
        },
      };

      // Add query parameters
      if (op.parameters) {
        const queryParams = op.parameters.filter((p: any) => p.in === 'query');
        if (queryParams.length > 0) {
          item.request.url.query = queryParams.map((p: any) => ({
            key: p.name,
            value: p.example || '',
            description: p.description,
            disabled: !p.required,
          }));
        }
      }

      // Add request body
      if (op.requestBody) {
        const content = op.requestBody.content?.['application/json'];
        if (content) {
          let example = {};

          // Try to extract example from schema
          if (content.examples) {
            const exampleKey = Object.keys(content.examples)[0];
            example = content.examples[exampleKey]?.value || {};
          } else if (content.schema?.$ref) {
            // Extract example from referenced schema
            const schemaName = content.schema.$ref.split('/').pop();
            const schema = openApiSpec.components?.schemas?.[schemaName];
            if (schema) {
              example = generateExampleFromSchema(schema);
            }
          }

          item.request.body = {
            mode: 'raw',
            raw: JSON.stringify(example, null, 2),
          };
        }
      }

      folders[tag].push(item);
    }
  }
}

// Helper function to generate example from schema
function generateExampleFromSchema(schema: any): any {
  if (schema.example) return schema.example;

  if (schema.type === 'object' && schema.properties) {
    const example: any = {};
    for (const [propName, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as any;
      example[propName] = propSchema.example || '';
    }
    return example;
  }

  return {};
}

// Add folders to collection
for (const [folderName, items] of Object.entries(folders)) {
  collection.item.push({
    name: folderName,
    item: items,
  });
}

// Create docs directory if it doesn't exist
const docsDir = path.join(__dirname, '../../../docs/api');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Write Postman collection
const collectionPath = path.join(docsDir, 'RemoteDevAI-Postman-Collection.json');
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log(`✅ Generated Postman collection: ${collectionPath}`);

// Generate environment file
const environment = {
  id: 'remotedevai-environment',
  name: 'RemoteDevAI Environment',
  values: [
    {
      key: 'base_url',
      value: 'http://localhost:3000',
      type: 'default',
      enabled: true,
    },
    {
      key: 'jwt_token',
      value: '',
      type: 'secret',
      enabled: true,
    },
    {
      key: 'user_id',
      value: '',
      type: 'default',
      enabled: true,
    },
  ],
  _postman_variable_scope: 'environment',
};

const envPath = path.join(docsDir, 'RemoteDevAI-Environment.json');
fs.writeFileSync(envPath, JSON.stringify(environment, null, 2));
console.log(`✅ Generated Postman environment: ${envPath}`);

console.log('\n🎉 Postman collection generated successfully!');
console.log('\nImport into Postman:');
console.log('  1. Open Postman');
console.log('  2. Click "Import" button');
console.log(`  3. Select "${collectionPath}"`);
console.log(`  4. Select "${envPath}" (environment)`);
console.log('  5. Set your jwt_token variable after logging in');
