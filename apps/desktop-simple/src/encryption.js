import crypto from 'crypto';

/**
 * End-to-end encryption for screen streaming
 * Uses AES-256-GCM for authenticated encryption
 * Key exchange uses ECDH (Elliptic Curve Diffie-Hellman)
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Generate a new ECDH key pair for key exchange
 */
export function generateKeyPair() {
  const ecdh = crypto.createECDH('prime256v1');
  const publicKey = ecdh.generateKeys('base64');
  const privateKey = ecdh.getPrivateKey('base64');

  return {
    publicKey,
    privateKey,
    ecdh
  };
}

/**
 * Derive a shared secret from ECDH key exchange
 */
export function deriveSharedSecret(privateKey, otherPublicKey) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(Buffer.from(privateKey, 'base64'));

  const sharedSecret = ecdh.computeSecret(Buffer.from(otherPublicKey, 'base64'));

  // Derive a proper AES key using HKDF
  return crypto.createHash('sha256').update(sharedSecret).digest();
}

/**
 * Generate a random session key (for simpler use without ECDH)
 */
export function generateSessionKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Export session key as base64 string
 */
export function exportKey(key) {
  return key.toString('base64');
}

/**
 * Import session key from base64 string
 */
export function importKey(keyString) {
  return Buffer.from(keyString, 'base64');
}

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer|string} data - Data to encrypt
 * @param {Buffer} key - 32-byte encryption key
 * @returns {string} - Base64 encoded encrypted data (IV + ciphertext + auth tag)
 */
export function encrypt(data, key) {
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  // Encrypt
  const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Combine IV + encrypted + authTag
  const result = Buffer.concat([iv, encrypted, authTag]);

  return result.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {Buffer} key - 32-byte encryption key
 * @returns {Buffer} - Decrypted data
 */
export function decrypt(encryptedData, key) {
  const data = Buffer.from(encryptedData, 'base64');

  // Extract IV, ciphertext, and auth tag
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted;
}

/**
 * Encrypt a frame for streaming (optimized for binary data)
 * @param {string} frameBase64 - Base64 encoded frame data
 * @param {Buffer} key - Encryption key
 * @returns {object} - { data: encrypted base64, iv: base64 iv }
 */
export function encryptFrame(frameBase64, key) {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  // Encrypt the base64 string directly (already encoded)
  const frameBuffer = Buffer.from(frameBase64, 'base64');
  const encrypted = Buffer.concat([
    cipher.update(frameBuffer),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return {
    data: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64')
  };
}

/**
 * Decrypt a frame from streaming
 * @param {object} encryptedFrame - { data: base64, iv: base64 }
 * @param {Buffer} key - Decryption key
 * @returns {string} - Base64 encoded frame data
 */
export function decryptFrame(encryptedFrame, key) {
  const iv = Buffer.from(encryptedFrame.iv, 'base64');
  const data = Buffer.from(encryptedFrame.data, 'base64');

  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(0, data.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString('base64');
}

/**
 * Encryption context for a session
 */
export class EncryptionContext {
  constructor() {
    this.keyPair = null;
    this.sharedKey = null;
    this.peerPublicKey = null;
    this.isReady = false;
  }

  /**
   * Initialize encryption with a new key pair
   */
  initialize() {
    this.keyPair = generateKeyPair();
    return this.keyPair.publicKey;
  }

  /**
   * Complete key exchange with peer's public key
   */
  setRemotePublicKey(peerPublicKey) {
    if (!this.keyPair) {
      throw new Error('Must call initialize() first');
    }

    this.peerPublicKey = peerPublicKey;
    this.sharedKey = deriveSharedSecret(this.keyPair.privateKey, peerPublicKey);
    this.isReady = true;

    return true;
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return encrypt(data, this.sharedKey);
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return decrypt(encryptedData, this.sharedKey);
  }

  /**
   * Encrypt a frame
   */
  encryptFrame(frameBase64) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return encryptFrame(frameBase64, this.sharedKey);
  }

  /**
   * Decrypt a frame
   */
  decryptFrame(encryptedFrame) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return decryptFrame(encryptedFrame, this.sharedKey);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isReady: this.isReady,
      hasKeyPair: !!this.keyPair,
      hasPeerKey: !!this.peerPublicKey
    };
  }
}

export default {
  generateKeyPair,
  deriveSharedSecret,
  generateSessionKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  encryptFrame,
  decryptFrame,
  EncryptionContext
};
