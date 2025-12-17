import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface Config {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
  agentPath?: string;
  autoUpdate?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  userId?: string;
  email?: string;
}

export class ConfigManager {
  private configDir: string;
  private configPath: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.remotedevai');
    this.configPath = path.join(this.configDir, 'config.json');
  }

  /**
   * Ensure config directory exists
   */
  async ensureConfigDir(): Promise<void> {
    await fs.ensureDir(this.configDir);
  }

  /**
   * Read configuration file
   */
  async read(): Promise<Config> {
    try {
      await this.ensureConfigDir();
      if (await fs.pathExists(this.configPath)) {
        const data = await fs.readFile(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Write configuration file
   */
  async write(config: Config): Promise<void> {
    await this.ensureConfigDir();
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Update specific config values
   */
  async update(updates: Partial<Config>): Promise<Config> {
    const current = await this.read();
    const updated = { ...current, ...updates };
    await this.write(updated);
    return updated;
  }

  /**
   * Get a specific config value
   */
  async get<K extends keyof Config>(key: K): Promise<Config[K] | undefined> {
    const config = await this.read();
    return config[key];
  }

  /**
   * Set a specific config value
   */
  async set<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    await this.update({ [key]: value } as Partial<Config>);
  }

  /**
   * Delete configuration file
   */
  async delete(): Promise<void> {
    if (await fs.pathExists(this.configPath)) {
      await fs.remove(this.configPath);
    }
  }

  /**
   * Get config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get logs directory path
   */
  getLogsDir(): string {
    return path.join(this.configDir, 'logs');
  }

  /**
   * Get agent installation directory
   */
  getAgentDir(): string {
    return path.join(this.configDir, 'agent');
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const apiKey = await this.get('apiKey');
    return !!apiKey;
  }

  /**
   * Get default API URL based on environment
   */
  getDefaultApiUrl(): string {
    return process.env.REMOTEDEVAI_API_URL || 'https://api.remotedevai.com';
  }
}

export const configManager = new ConfigManager();
