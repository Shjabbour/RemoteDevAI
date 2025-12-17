#!/usr/bin/env node

/**
 * API v1 to v2 Migration Script
 *
 * This script helps migrate client code from API v1 to v2
 * It performs static analysis and suggests changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface MigrationIssue {
  file: string;
  line: number;
  type: 'breaking-change' | 'deprecation' | 'suggestion';
  message: string;
  before: string;
  after: string;
}

class ApiMigrationTool {
  private issues: MigrationIssue[] = [];

  /**
   * Analyze a file for v1 API usage
   */
  analyzeFile(filePath: string): void {
    console.log(`Analyzing: ${filePath}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for v1 API endpoints
      if (line.includes('/api/v1/')) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'suggestion',
          message: 'Update API endpoint to v2',
          before: line.trim(),
          after: line.replace('/api/v1/', '/api/v2/').trim(),
        });
      }

      // Check for old auth response format
      if (line.includes('.token')) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'breaking-change',
          message: 'Auth response changed: use .accessToken instead of .token',
          before: line.trim(),
          after: line.replace('.token', '.accessToken').trim(),
        });
      }

      // Check for old error handling
      if (line.match(/data\.error\s*&&\s*typeof\s+data\.error\s*===\s*['"]string['"]/)) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'breaking-change',
          message: 'Error structure changed: error is now an object with code and message',
          before: line.trim(),
          after: 'if (data.error && data.error.code)',
        });
      }

      // Check for old pagination structure
      if (line.match(/\bdata\.total\b|\bdata\.page\b|\bdata\.limit\b/)) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'breaking-change',
          message: 'Pagination structure changed: use data.pagination.* instead',
          before: line.trim(),
          after: line
            .replace(/data\.total/g, 'data.pagination.total')
            .replace(/data\.page/g, 'data.pagination.page')
            .replace(/data\.limit/g, 'data.pagination.limit')
            .trim(),
        });
      }

      // Check for refresh token endpoint
      if (line.includes('/auth/refresh') && line.includes('{ token }')) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          type: 'breaking-change',
          message: 'Refresh token request changed: use refreshToken instead of token',
          before: line.trim(),
          after: line.replace('{ token }', '{ refreshToken }').trim(),
        });
      }
    });
  }

  /**
   * Analyze a directory recursively
   */
  analyzeDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): void {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and build directories
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist' && file !== 'build') {
          this.analyzeDirectory(filePath, extensions);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          this.analyzeFile(filePath);
        }
      }
    }
  }

  /**
   * Generate migration report
   */
  generateReport(): string {
    const breakingChanges = this.issues.filter((i) => i.type === 'breaking-change');
    const deprecations = this.issues.filter((i) => i.type === 'deprecation');
    const suggestions = this.issues.filter((i) => i.type === 'suggestion');

    let report = '# API v1 to v2 Migration Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `- Breaking Changes: ${breakingChanges.length}\n`;
    report += `- Deprecations: ${deprecations.length}\n`;
    report += `- Suggestions: ${suggestions.length}\n`;
    report += `- Total Issues: ${this.issues.length}\n\n`;

    if (breakingChanges.length > 0) {
      report += `## Breaking Changes (${breakingChanges.length})\n\n`;
      report += 'These changes MUST be addressed before upgrading to v2:\n\n';

      for (const issue of breakingChanges) {
        report += `### ${issue.file}:${issue.line}\n\n`;
        report += `**Issue:** ${issue.message}\n\n`;
        report += '```typescript\n';
        report += `// Before:\n${issue.before}\n\n`;
        report += `// After:\n${issue.after}\n`;
        report += '```\n\n';
      }
    }

    if (deprecations.length > 0) {
      report += `## Deprecations (${deprecations.length})\n\n`;
      report += 'These features are deprecated and should be updated:\n\n';

      for (const issue of deprecations) {
        report += `### ${issue.file}:${issue.line}\n\n`;
        report += `**Issue:** ${issue.message}\n\n`;
        report += '```typescript\n';
        report += `// Before:\n${issue.before}\n\n`;
        report += `// After:\n${issue.after}\n`;
        report += '```\n\n';
      }
    }

    if (suggestions.length > 0) {
      report += `## Suggestions (${suggestions.length})\n\n`;
      report += 'These changes are recommended but not required:\n\n';

      const fileMap = new Map<string, MigrationIssue[]>();
      for (const issue of suggestions) {
        if (!fileMap.has(issue.file)) {
          fileMap.set(issue.file, []);
        }
        fileMap.get(issue.file)!.push(issue);
      }

      for (const [file, issues] of fileMap) {
        report += `### ${file}\n\n`;
        for (const issue of issues) {
          report += `- Line ${issue.line}: ${issue.message}\n`;
        }
        report += '\n';
      }
    }

    report += `## Next Steps\n\n`;
    report += `1. Review all breaking changes and update code accordingly\n`;
    report += `2. Test your application with v2 API endpoints\n`;
    report += `3. Update authentication flow to use accessToken and refreshToken\n`;
    report += `4. Update error handling to use new error structure\n`;
    report += `5. Update pagination handling to use new structure\n`;
    report += `6. Run tests to verify all changes\n`;
    report += `7. Deploy and monitor for issues\n\n`;

    report += `## Additional Resources\n\n`;
    report += `- [API Changelog](../docs/API_CHANGELOG.md)\n`;
    report += `- [Migration Guide](../docs/MIGRATION_GUIDE.md)\n`;
    report += `- [API v2 Documentation](../docs/API_V2.md)\n`;

    return report;
  }

  /**
   * Apply automatic fixes (use with caution)
   */
  autoFix(filePath: string, dryRun: boolean = true): void {
    console.log(`${dryRun ? '[DRY RUN]' : '[APPLYING]'} Auto-fixing: ${filePath}`);

    let content = fs.readFileSync(filePath, 'utf-8');

    // Apply safe automatic fixes
    content = content.replace(/\/api\/v1\//g, '/api/v2/');
    content = content.replace(/\.token\b/g, '.accessToken');
    content = content.replace(/\{\s*token\s*\}/g, '{ refreshToken }');

    if (!dryRun) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Applied fixes to ${filePath}`);
    } else {
      console.log(`Would apply fixes to ${filePath}`);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: node migrate-api-v1-to-v2.ts <directory> [--auto-fix] [--no-dry-run]');
  console.log('');
  console.log('Options:');
  console.log('  --auto-fix     Apply automatic fixes');
  console.log('  --no-dry-run   Actually apply fixes (use with --auto-fix)');
  console.log('');
  console.log('Example:');
  console.log('  node migrate-api-v1-to-v2.ts ./src');
  console.log('  node migrate-api-v1-to-v2.ts ./src --auto-fix');
  console.log('  node migrate-api-v1-to-v2.ts ./src --auto-fix --no-dry-run');
  process.exit(1);
}

const targetDir = args[0];
const autoFix = args.includes('--auto-fix');
const dryRun = !args.includes('--no-dry-run');

if (!fs.existsSync(targetDir)) {
  console.error(`Error: Directory not found: ${targetDir}`);
  process.exit(1);
}

console.log('API v1 to v2 Migration Tool');
console.log('==========================\n');
console.log(`Target: ${targetDir}`);
console.log(`Auto-fix: ${autoFix ? 'Yes' : 'No'}`);
console.log(`Dry run: ${dryRun ? 'Yes' : 'No'}\n`);

const tool = new ApiMigrationTool();
tool.analyzeDirectory(targetDir);

const report = tool.generateReport();
console.log(report);

// Save report
const reportPath = path.join(process.cwd(), 'migration-report.md');
fs.writeFileSync(reportPath, report, 'utf-8');
console.log(`\nReport saved to: ${reportPath}`);

// Apply auto-fixes if requested
if (autoFix) {
  console.log('\nApplying automatic fixes...\n');

  const files = new Set(tool['issues'].map((i) => i.file));
  for (const file of files) {
    tool.autoFix(file, dryRun);
  }

  if (dryRun) {
    console.log('\n⚠️  This was a dry run. Use --no-dry-run to apply changes.');
  } else {
    console.log('\n✓ Automatic fixes applied!');
    console.log('⚠️  Please review changes and test thoroughly before committing.');
  }
}

console.log('\n✓ Migration analysis complete!');
