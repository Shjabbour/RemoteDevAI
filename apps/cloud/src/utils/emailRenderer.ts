import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import juice from 'juice';

// Cache for compiled templates
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // Format date helper
  Handlebars.registerHelper('formatDate', (date: Date | string) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Format currency helper
  Handlebars.registerHelper('formatCurrency', (amount: number) => {
    return `$${amount.toFixed(2)}`;
  });

  // Uppercase helper
  Handlebars.registerHelper('uppercase', (str: string) => {
    return str.toUpperCase();
  });

  // Conditional helper
  Handlebars.registerHelper('eq', (a: any, b: any) => {
    return a === b;
  });

  // Current year helper
  Handlebars.registerHelper('currentYear', () => {
    return new Date().getFullYear();
  });

  // Pluralize helper
  Handlebars.registerHelper('pluralize', (count: number, singular: string, plural: string) => {
    return count === 1 ? singular : plural;
  });
}

// Register helpers once
registerHelpers();

/**
 * Load and compile a template file
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  const templatesDir = path.join(__dirname, '../templates/emails');
  const templatePath = path.join(templatesDir, `${templateName}.html`);

  try {
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(templateContent);

    // Cache the compiled template
    templateCache.set(templateName, compiledTemplate);

    return compiledTemplate;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    throw new Error(`Template ${templateName} not found`);
  }
}

/**
 * Load a component partial
 */
async function loadComponent(componentName: string): Promise<string> {
  const componentsDir = path.join(__dirname, '../templates/emails/components');
  const componentPath = path.join(componentsDir, `${componentName}.html`);

  try {
    return await fs.readFile(componentPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading component ${componentName}:`, error);
    throw new Error(`Component ${componentName} not found`);
  }
}

/**
 * Register all partials
 */
async function registerPartials() {
  const components = ['header', 'footer', 'button', 'card'];

  for (const component of components) {
    try {
      const content = await loadComponent(component);
      Handlebars.registerPartial(component, content);
    } catch (error) {
      console.warn(`Failed to register partial ${component}:`, error);
    }
  }
}

/**
 * Convert HTML to plain text
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Render email template with variables
 */
export async function renderEmail(
  templateName: string,
  variables: Record<string, any> = {}
): Promise<{ html: string; text: string }> {
  try {
    // Register partials if not already registered
    await registerPartials();

    // Add default variables
    const defaultVariables = {
      appName: 'RemoteDevAI',
      appUrl: process.env.WEB_URL || 'https://remotedevai.com',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@remotedevai.com',
      unsubscribeUrl: variables.unsubscribeUrl || `${process.env.WEB_URL || 'https://remotedevai.com'}/unsubscribe`,
      currentYear: new Date().getFullYear(),
      ...variables,
    };

    // Load and compile template
    const template = await loadTemplate(templateName);

    // Render template with variables
    let html = template(defaultVariables);

    // Inline CSS for email compatibility
    html = juice(html, {
      removeStyleTags: false,
      preserveMediaQueries: true,
      preserveFontFaces: true,
    });

    // Generate plain text version
    const text = htmlToText(html);

    return { html, text };
  } catch (error) {
    console.error(`Error rendering email template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Preview email template (for testing)
 */
export async function previewEmail(templateName: string, variables: Record<string, any> = {}): Promise<string> {
  const { html } = await renderEmail(templateName, variables);
  return html;
}

/**
 * List all available email templates
 */
export async function listTemplates(): Promise<string[]> {
  const templatesDir = path.join(__dirname, '../templates/emails');

  try {
    const files = await fs.readdir(templatesDir);
    return files
      .filter((file) => file.endsWith('.html') && !file.startsWith('base'))
      .map((file) => file.replace('.html', ''));
  } catch (error) {
    console.error('Error listing templates:', error);
    return [];
  }
}

/**
 * Clear template cache (useful in development)
 */
export function clearTemplateCache() {
  templateCache.clear();
  console.log('Template cache cleared');
}

export default {
  renderEmail,
  previewEmail,
  listTemplates,
  clearTemplateCache,
};
