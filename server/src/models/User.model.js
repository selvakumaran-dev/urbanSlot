import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'REMINDER', 'REVIEW', 'PAYMENT', 'SYSTEM'],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['driver', 'host', 'admin'],
      default: 'driver',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isHost: {
      type: Boolean,
      default: false,
    },
    // Security: Account lockout tracking
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    // Security: refresh token storage
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },
    // Host analytics
    totalEarnings: {
      type: Number,
      default: 0,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    notifications: [notificationSchema],
    savedSpots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot' }],
    vehicleInfo: {
      plate: String,
      model: String,
      color: String,
    },
    payoutMethods: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    stripeCustomerId: String,
    stripeAccountId: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Constants for lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// Virtual: is account currently locked?
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts and lock if needed
userSchema.methods.incrementLoginAttempts = async function () {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if reached max attempts
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
  }

  return this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Virtual: unread notifications count
userSchema.virtual('unreadNotificationsCount').get(function () {
  if (!this.notifications) return 0;
  return this.notifications.filter((n) => !n.isRead).length;
});

const User = mongoose.model('User', userSchema);
export default User;
