const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ['super_admin', 'dept_admin', 'field_worker'],
      required: true,
    },
    department: {
      type: String,
      enum: ['roads', 'sanitation', 'water', 'electricity', 'other', null],
      default: null, // Only for dept_admin and field_worker
    },
    zone: {
      type: String,
      default: null, // For field_workers (e.g., "North Zone")
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);