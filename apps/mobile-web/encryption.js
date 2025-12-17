/**
 * End-to-end encryption for screen streaming (Browser version)
 * Uses Web Crypto API with AES-256-GCM
 * Key exchange uses ECDH (P-256)
 */

const ALGORITHM = { name: 'AES-GCM', length: 256 };
const KEY_USAGE = ['encrypt', 'decrypt'];
const IV_LENGTH = 12; // 96 bits for GCM
const EC_ALGORITHM = { name: 'ECDH', namedCurve: 'P-256' };

/**
 * Convert ArrayBuffer to base64
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a new ECDH key pair
 */
async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    EC_ALGORITHM,
    true, // extractable
    ['deriveKey', 'deriveBits']
  );

  // Export public key for sharing
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBase64 = bufferToBase64(publicKeyRaw);

  return {
    keyPair,
    publicKey: publicKeyBase64
  };
}

/**
 * Import a public key from base64
 */
async function importPublicKey(publicKeyBase64) {
  const keyData = base64ToBuffer(publicKeyBase64);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    EC_ALGORITHM,
    true,
    []
  );
}

/**
 * Derive a shared AES key from ECDH
 */
async function deriveSharedKey(privateKey, publicKey) {
  // First derive bits
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256 // 256 bits for AES-256
  );

  // Import as AES key
  return crypto.subtle.importKey(
    'raw',
    sharedBits,
    ALGORITHM,
    false, // not extractable
    KEY_USAGE
  );
}

/**
 * Generate random IV
 */
function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(data, key) {
  const iv = generateIV();
  const dataBuffer = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );

  // Combine IV + ciphertext (includes auth tag)
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return bufferToBase64(result.buffer);
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decrypt(encryptedData, key) {
  const data = new Uint8Array(base64ToBuffer(encryptedData));

  // Extract IV and ciphertext
  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decrypted;
}

/**
 * Decrypt a frame (returns base64 image data)
 */
async function decryptFrame(encryptedFrame, key) {
  const iv = new Uint8Array(base64ToBuffer(encryptedFrame.iv));
  const data = new Uint8Array(base64ToBuffer(encryptedFrame.data));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Convert back to base64 for image display
  return bufferToBase64(decrypted);
}

/**
 * Decrypt text data
 */
async function decryptText(encryptedData, key) {
  const decrypted = await decrypt(encryptedData, key);
  return new TextDecoder().decode(decrypted);
}

/**
 * Encryption context for managing session encryption
 */
class EncryptionContext {
  constructor() {
    this.keyPair = null;
    this.publicKey = null;
    this.sharedKey = null;
    this.peerPublicKey = null;
    this.isReady = false;
  }

  /**
   * Initialize encryption with a new key pair
   */
  async initialize() {
    const result = await generateKeyPair();
    this.keyPair = result.keyPair;
    this.publicKey = result.publicKey;
    return this.publicKey;
  }

  /**
   * Complete key exchange with peer's public key
   */
  async setRemotePublicKey(peerPublicKeyBase64) {
    if (!this.keyPair) {
      throw new Error('Must call initialize() first');
    }

    this.peerPublicKey = peerPublicKeyBase64;
    const importedPeerKey = await importPublicKey(peerPublicKeyBase64);
    this.sharedKey = await deriveSharedKey(this.keyPair.privateKey, importedPeerKey);
    this.isReady = true;

    console.log('[Encryption] Key exchange complete, E2E encryption ready');
    return true;
  }

  /**
   * Encrypt data
   */
  async encrypt(data) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return encrypt(data, this.sharedKey);
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return decrypt(encryptedData, this.sharedKey);
  }

  /**
   * Decrypt a frame
   */
  async decryptFrame(encryptedFrame) {
    if (!this.isReady) {
      // If not ready, assume unencrypted frame
      return encryptedFrame.frame || encryptedFrame;
    }

    if (!encryptedFrame.encrypted) {
      // Unencrypted frame (backwards compatibility)
      return encryptedFrame.frame || encryptedFrame;
    }

    return decryptFrame(encryptedFrame, this.sharedKey);
  }

  /**
   * Decrypt text
   */
  async decryptText(encryptedData) {
    if (!this.isReady) {
      throw new Error('Encryption not ready - complete key exchange first');
    }
    return decryptText(encryptedData, this.sharedKey);
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

  /**
   * Reset encryption state
   */
  reset() {
    this.keyPair = null;
    this.publicKey = null;
    this.sharedKey = null;
    this.peerPublicKey = null;
    this.isReady = false;
  }
}

// Export for use in app.js
window.EncryptionContext = EncryptionContext;
window.E2EEncryption = {
  generateKeyPair,
  importPublicKey,
  deriveSharedKey,
  encrypt,
  decrypt,
  decryptFrame,
  EncryptionContext
};
