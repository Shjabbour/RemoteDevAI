/**
 * File preview and visualization tools
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import {
  ToolResponse,
  ImageData,
  PreviewFileParams,
  PreviewDiffParams,
  PreviewDirectoryParams,
} from '../types.js';

/**
 * Preview file (image, text, or code)
 *
 * @example
 * const result = await previewFile({
 *   path: './image.png',
 *   format: 'image'
 * });
 */
export async function previewFile(
  params: PreviewFileParams
): Promise<ToolResponse<ImageData | string>> {
  try {
    const { path: filePath, format = 'image', maxLines } = params;

    // Check if file exists
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    // Determine file type
    const ext = path.extname(filePath).toLowerCase();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'];
    const isImage = imageExtensions.includes(ext);

    if (isImage) {
      // Handle image files
      const buffer = await fs.readFile(filePath);
      let image = sharp(buffer);

      // Optimize image
      if (stats.size > 1024 * 1024) {
        // Resize large images
        image = image.resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const outputBuffer = await image.png().toBuffer();
      const metadata = await sharp(outputBuffer).metadata();

      return {
        success: true,
        data: {
          base64: outputBuffer.toString('base64'),
          mimeType: 'image/png',
          width: metadata.width || 0,
          height: metadata.height || 0,
          size: outputBuffer.length,
        },
        message: `Image preview: ${path.basename(filePath)}`,
      };
    }

    // Handle text files
    let content = await fs.readFile(filePath, 'utf-8');

    if (maxLines) {
      const lines = content.split('\n');
      content = lines.slice(0, maxLines).join('\n');
      if (lines.length > maxLines) {
        content += `\n... (${lines.length - maxLines} more lines)`;
      }
    }

    if (format === 'base64') {
      return {
        success: true,
        data: Buffer.from(content).toString('base64'),
        message: `Text file preview: ${path.basename(filePath)}`,
      };
    }

    return {
      success: true,
      data: content,
      message: `Text file preview: ${path.basename(filePath)} (${content.split('\n').length} lines)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview file',
      message: 'File preview failed',
    };
  }
}

/**
 * Preview diff between two files
 *
 * @example
 * const result = await previewDiff({
 *   oldPath: './old.txt',
 *   newPath: './new.txt',
 *   format: 'unified'
 * });
 */
export async function previewDiff(
  params: PreviewDiffParams
): Promise<ToolResponse<string>> {
  try {
    const { oldPath, newPath, format = 'unified' } = params;

    const oldContent = await fs.readFile(oldPath, 'utf-8');
    const newContent = await fs.readFile(newPath, 'utf-8');

    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = '';

    switch (format) {
      case 'unified':
        diff = generateUnifiedDiff(oldLines, newLines, oldPath, newPath);
        break;

      case 'split':
        diff = generateSplitDiff(oldLines, newLines);
        break;

      case 'visual':
        diff = generateVisualDiff(oldLines, newLines);
        break;
    }

    return {
      success: true,
      data: diff,
      message: `Diff generated (${format} format)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate diff',
      message: 'Diff generation failed',
    };
  }
}

/**
 * Generate unified diff format
 */
function generateUnifiedDiff(
  oldLines: string[],
  newLines: string[],
  oldPath: string,
  newPath: string
): string {
  const diff: string[] = [];
  diff.push(`--- ${oldPath}`);
  diff.push(`+++ ${newPath}`);

  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push(` ${oldLines[i]}`);
      i++;
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      diff.push(`-${oldLines[i]}`);
      i++;
    } else if (j < newLines.length) {
      diff.push(`+${newLines[j]}`);
      j++;
    }
  }

  return diff.join('\n');
}

/**
 * Generate split diff format
 */
function generateSplitDiff(oldLines: string[], newLines: string[]): string {
  const maxLength = Math.max(oldLines.length, newLines.length);
  const diff: string[] = [];
  const width = 80;

  diff.push('OLD'.padEnd(width) + ' | ' + 'NEW');
  diff.push('-'.repeat(width) + ' | ' + '-'.repeat(width));

  for (let i = 0; i < maxLength; i++) {
    const oldLine = (oldLines[i] || '').substring(0, width - 1).padEnd(width);
    const newLine = (newLines[i] || '').substring(0, width - 1).padEnd(width);
    diff.push(`${oldLine} | ${newLine}`);
  }

  return diff.join('\n');
}

/**
 * Generate visual diff format
 */
function generateVisualDiff(oldLines: string[], newLines: string[]): string {
  const diff: string[] = [];

  diff.push('=== Visual Diff ===\n');

  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diff.push(`  ${oldLines[i]}`);
      i++;
      j++;
    } else if (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
      diff.push(`- ${oldLines[i]}`);
      i++;
    } else if (j < newLines.length) {
      diff.push(`+ ${newLines[j]}`);
      j++;
    }
  }

  return diff.join('\n');
}

/**
 * Preview directory structure
 *
 * @example
 * const result = await previewDirectory({
 *   path: './src',
 *   depth: 3,
 *   includeHidden: false
 * });
 */
export async function previewDirectory(
  params: PreviewDirectoryParams
): Promise<ToolResponse<string>> {
  try {
    const { path: dirPath, depth = 3, includeHidden = false } = params;

    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error('Path is not a directory');
    }

    const tree = await buildDirectoryTree(dirPath, depth, includeHidden);

    return {
      success: true,
      data: tree,
      message: `Directory tree for: ${path.basename(dirPath)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview directory',
      message: 'Directory preview failed',
    };
  }
}

/**
 * Build directory tree recursively
 */
async function buildDirectoryTree(
  dirPath: string,
  maxDepth: number,
  includeHidden: boolean,
  currentDepth: number = 0,
  prefix: string = ''
): Promise<string> {
  if (currentDepth >= maxDepth) {
    return '';
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const filtered = entries.filter(entry => {
    if (!includeHidden && entry.name.startsWith('.')) {
      return false;
    }
    return true;
  });

  const lines: string[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const entry = filtered[i];
    const isLast = i === filtered.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const nextPrefix = prefix + (isLast ? '    ' : '│   ');

    const icon = entry.isDirectory() ? '📁' : '📄';
    lines.push(`${prefix}${connector}${icon} ${entry.name}`);

    if (entry.isDirectory()) {
      const subPath = path.join(dirPath, entry.name);
      const subTree = await buildDirectoryTree(
        subPath,
        maxDepth,
        includeHidden,
        currentDepth + 1,
        nextPrefix
      );
      if (subTree) {
        lines.push(subTree);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Get file metadata
 *
 * @example
 * const metadata = await getFileMetadata({ path: './file.txt' });
 */
export async function getFileMetadata(params: {
  path: string;
}): Promise<ToolResponse<{
  size: number;
  created: Date;
  modified: Date;
  extension: string;
  type: string;
}>> {
  try {
    const stats = await fs.stat(params.path);
    const ext = path.extname(params.path);

    const type = stats.isDirectory()
      ? 'directory'
      : stats.isFile()
      ? 'file'
      : stats.isSymbolicLink()
      ? 'symlink'
      : 'unknown';

    return {
      success: true,
      data: {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: ext,
        type,
      },
      message: `Metadata for: ${path.basename(params.path)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get metadata',
      message: 'Metadata retrieval failed',
    };
  }
}
