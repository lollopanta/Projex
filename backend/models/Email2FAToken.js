/**
 * ============================================
 * EMAIL 2FA TOKEN MODEL
 * Stores email-based 2FA OTP codes with expiration
 * ============================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const email2FATokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5 // Max verification attempts
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto-delete after 10 minutes (MongoDB TTL)
  }
});

// Hash code before saving
email2FATokenSchema.pre('save', async function(next) {
  if (!this.isModified('code')) return next();
  this.code = await bcrypt.hash(this.code, 10);
  next();
});

// Static method to generate and create code
email2FATokenSchema.statics.generateCode = async function(userId) {
  // Generate 6-digit code
  const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Delete any existing code for this user
  await this.deleteOne({ userId });
  
  // Create new code (will be hashed by pre-save hook)
  const codeDoc = new this({
    userId,
    code: rawCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });
  
  await codeDoc.save();
  
  // Return raw code for email (hashed version is stored)
  return rawCode;
};

// Method to verify code
email2FATokenSchema.statics.verifyCode = async function(userId, rawCode) {
  const codeDoc = await this.findOne({ userId });
  
  if (!codeDoc) {
    return { valid: false, reason: 'Code not found' };
  }
  
  // Check expiration
  if (codeDoc.expiresAt < new Date()) {
    await this.deleteOne({ userId });
    return { valid: false, reason: 'Code expired' };
  }
  
  // Check attempts
  if (codeDoc.attempts >= 5) {
    await this.deleteOne({ userId });
    return { valid: false, reason: 'Too many attempts' };
  }
  
  // Verify code
  const isValid = await bcrypt.compare(rawCode, codeDoc.code);
  
  if (!isValid) {
    codeDoc.attempts += 1;
    await codeDoc.save();
    return { valid: false, reason: 'Invalid code', attempts: codeDoc.attempts };
  }
  
  // Delete code after successful verification
  await this.deleteOne({ userId });
  return { valid: true };
};

module.exports = mongoose.model('Email2FAToken', email2FATokenSchema);
