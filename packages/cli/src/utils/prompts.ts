import inquirer from 'inquirer';

export interface PromptOptions {
  message: string;
  default?: string | boolean;
  choices?: string[];
  validate?: (input: string) => boolean | string;
}

/**
 * Prompt for text input
 */
export async function promptText(options: PromptOptions): Promise<string> {
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message: options.message,
      default: options.default,
      validate: options.validate,
    },
  ]);
  return answer;
}

/**
 * Prompt for password input
 */
export async function promptPassword(options: PromptOptions): Promise<string> {
  const { answer } = await inquirer.prompt([
    {
      type: 'password',
      name: 'answer',
      message: options.message,
      validate: options.validate,
    },
  ]);
  return answer;
}

/**
 * Prompt for confirmation
 */
export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  const { answer } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'answer',
      message,
      default: defaultValue,
    },
  ]);
  return answer;
}

/**
 * Prompt for selection from list
 */
export async function promptSelect(message: string, choices: string[]): Promise<string> {
  const { answer } = await inquirer.prompt([
    {
      type: 'list',
      name: 'answer',
      message,
      choices,
    },
  ]);
  return answer;
}

/**
 * Prompt for multiple selections
 */
export async function promptMultiSelect(message: string, choices: string[]): Promise<string[]> {
  const { answer } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'answer',
      message,
      choices,
    },
  ]);
  return answer;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean | string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return true;
}

/**
 * Validate not empty
 */
export function validateNotEmpty(value: string): boolean | string {
  if (!value || value.trim().length === 0) {
    return 'This field is required';
  }
  return true;
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean | string {
  try {
    new URL(url);
    return true;
  } catch {
    return 'Please enter a valid URL';
  }
}

/**
 * Validate port number
 */
export function validatePort(port: string): boolean | string {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || port > 65535) {
    return 'Please enter a valid port number (1-65535)';
  }
  return true;
}
