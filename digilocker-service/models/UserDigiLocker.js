const mongoose = require('mongoose');

const userDigiLockerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    digilockerClientId: {
      type: String,
      required: true,
    },
    digilockerClientSecret: {
      type: String,
      required: true,
    },
    digilockerAccessToken: {
      type: String,
      required: true,
    },
    digilockerRefreshToken: {
      type: String,
      required: true,
    },
    tokenExpiry: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
userDigiLockerSchema.index({ userId: 1 });
userDigiLockerSchema.index({ tokenExpiry: 1 });

const UserDigiLocker = mongoose.model('UserDigiLocker', userDigiLockerSchema);

module.exports = UserDigiLocker;
