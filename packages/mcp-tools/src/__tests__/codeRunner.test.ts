/**
 * Tests for code runner tool
 */

import { runCode, runInSandbox, validateCode } from '../tools/codeRunner';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, callback) => {
    callback(null, { stdout: 'output', stderr: '' });
  }),
  spawn: jest.fn()
}));

describe('codeRunner', () => {
  describe('runCode', () => {
    it('should execute JavaScript code', async () => {
      const result = await runCode({
        language: 'javascript',
        code: 'console.log("hello");',
        timeout: 5000
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute Python code', async () => {
      const result = await runCode({
        language: 'python',
        code: 'print("hello")',
        timeout: 5000
      });

      expect(result.success).toBe(true);
    });

    it('should handle execution timeout', async () => {
      const exec = require('child_process').exec;
      exec.mockImplementationOnce((cmd: any, opts: any, callback: any) => {
        setTimeout(() => callback(new Error('Timeout')), 100);
      });

      const result = await runCode({
        language: 'javascript',
        code: 'while(true){}',
        timeout: 50
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Timeout');
    });

    it('should handle syntax errors', async () => {
      const result = await runCode({
        language: 'javascript',
        code: 'invalid syntax here!@#',
        timeout: 5000
      });

      expect(result.success).toBe(false);
    });
  });

  describe('runInSandbox', () => {
    it('should run code in isolated environment', async () => {
      const result = await runInSandbox({
        language: 'javascript',
        code: 'console.log("sandboxed")',
        timeout: 5000
      });

      expect(result.success).toBe(true);
    });

    it('should prevent file system access', async () => {
      const result = await runInSandbox({
        language: 'javascript',
        code: 'require("fs").readFileSync("/etc/passwd")',
        timeout: 5000
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should limit memory usage', async () => {
      const result = await runInSandbox({
        language: 'javascript',
        code: 'const arr = new Array(1000000000);',
        timeout: 5000,
        maxMemory: 100 // 100MB
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validateCode', () => {
    it('should validate JavaScript syntax', () => {
      const result = validateCode('const x = 5;', 'javascript');
      expect(result.valid).toBe(true);
    });

    it('should detect syntax errors', () => {
      const result = validateCode('const x = ;', 'javascript');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate Python syntax', () => {
      const result = validateCode('x = 5', 'python');
      expect(result.valid).toBe(true);
    });
  });
});
