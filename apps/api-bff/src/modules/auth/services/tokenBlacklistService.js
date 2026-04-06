/**
 * Token Blacklist Service
 * @module modules/auth/services/tokenBlacklistService
 * 
 * Manages JWT token blacklist for logout functionality
 * Uses in-memory storage (can be replaced with Redis in production)
 */

class TokenBlacklistService {
  constructor() {
    // In-memory storage for blacklisted tokens
    // Key: token, Value: expiration timestamp
    this.blacklist = new Map();
    
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Add token to blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresAt - Token expiration timestamp (ms)
   */
  addToken(token, expiresAt) {
    this.blacklist.set(token, expiresAt);
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} True if token is blacklisted
   */
  isBlacklisted(token) {
    if (!this.blacklist.has(token)) {
      return false;
    }

    const expiresAt = this.blacklist.get(token);
    const now = Date.now();

    // If token has expired, remove it from blacklist
    if (now > expiresAt) {
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Remove expired tokens from blacklist
   */
  cleanup() {
    const now = Date.now();
    let removedCount = 0;

    for (const [token, expiresAt] of this.blacklist.entries()) {
      if (now > expiresAt) {
        this.blacklist.delete(token);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[TokenBlacklist] Cleaned up ${removedCount} expired tokens`);
    }
  }

  /**
   * Get blacklist size
   * @returns {number} Number of blacklisted tokens
   */
  getSize() {
    return this.blacklist.size;
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  clear() {
    this.blacklist.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
module.exports = new TokenBlacklistService();
