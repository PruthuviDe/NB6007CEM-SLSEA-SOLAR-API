const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    user_id: {
      type: Number,
      required: [true, 'user_id is required'],
      unique: true,
      index: true
    },
    username: {
      type: String,
      required: [true, 'username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters']
    },
    password_hash: {
      type: String,
      required: [true, 'password_hash is required']
    },
    full_name: {
      type: String,
      required: [true, 'full_name is required'],
      trim: true
    },
    // Human Access Control Role mapping
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: {
        values: ['national_analyst', 'provincial_operator', 'district_operator'],
        message: '{VALUE} is not a valid role (must be national_analyst, provincial_operator, or district_operator)'
      }
    },
    // Attribute-Based Access Control (ABAC) Scope Boundaries
    jurisdiction_level: {
      type: String,
      required: [true, 'jurisdiction_level is required'],
      enum: {
        values: ['national', 'province', 'district'],
        message: '{VALUE} is not a valid jurisdiction_level (must be national, province, or district)'
      }
    },
    // Nullable for national; targets Province ID or District ID
    jurisdiction_id: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash; // Security: NEVER expose password hashes in API responses
        return ret;
      }
    }
  }
);

/**
 * Compare plain text password against stored bcrypt hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
