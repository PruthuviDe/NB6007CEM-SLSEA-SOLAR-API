const mongoose = require('mongoose');

const provinceSchema = new mongoose.Schema(
  {
    province_id: {
      type: Number,
      required: [true, 'province_id is required'],
      unique: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Province code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Province code cannot exceed 10 characters']
    },
    name: {
      type: String,
      required: [true, 'Province name is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const Province = mongoose.model('Province', provinceSchema);

module.exports = Province;
