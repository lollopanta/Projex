/**
 * ============================================
 * EMAIL VERIFICATION TOKEN MODEL
 * Stores email verification tokens with expiration
 * ============================================
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const emailVerificationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  lookupToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours (MongoDB TTL)
  }
});

// Static method to generate and create token
emailVerificationTokenSchema.statics.generateToken = async function(userId) {
  // Generate secure random token (64 chars for lookup + verification)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const lookupToken = rawToken.substring(0, 16); // First 16 chars for lookup
  const verificationToken = rawToken.substring(16); // Remaining for verification
  
  // Hash the verification part
  const tokenHash = await bcrypt.hash(verificationToken, 10);
  
  // Delete any existing token for this user
  await this.deleteOne({ userId });
  
  // Create new token
  const tokenDoc = new this({
    userId,
    lookupToken,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });
  
  await tokenDoc.save();
  
  // Return full raw token for email
  return rawToken;
};

// Method to verify token
emailVerificationTokenSchema.statics.verifyToken = async function(rawToken) {
  if (!rawToken || rawToken.length !== 64) {
    return { valid: false, userId: null };
  }
  
  const lookupToken = rawToken.substring(0, 16);
  const verificationToken = rawToken.substring(16);
  
  // Find token by lookup
  const tokenDoc = await this.findOne({ lookupToken });
  
  if (!tokenDoc) {
    return { valid: false, userId: null };
  }
  
  // Check expiration
  if (tokenDoc.expiresAt < new Date()) {
    await this.deleteOne({ _id: tokenDoc._id });
    return { valid: false, userId: null, reason: 'expired' };
  }
  
  // Verify token
  const isValid = await bcrypt.compare(verificationToken, tokenDoc.tokenHash);
  
  if (isValid) {
    const userId = tokenDoc.userId;
    // Delete token after successful verification
    await this.deleteOne({ _id: tokenDoc._id });
    return { valid: true, userId };
  }
  
  return { valid: false, userId: null, reason: 'invalid' };
};

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);
