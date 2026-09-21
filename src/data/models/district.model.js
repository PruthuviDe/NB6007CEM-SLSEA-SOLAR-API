const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema(
  {
    district_id: {
      type: Number,
      required: [true, 'district_id is required'],
      unique: true,
      index: true
    },
    province_id: {
      type: Number,
      required: [true, 'province_id foreign key reference is required'],
      ref: 'Province',
      index: true
    },
    code: {
      type: String,
      required: [true, 'District code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'District code cannot exceed 10 characters']
    },
    name: {
      type: String,
      required: [true, 'District name is required'],
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

const District = mongoose.model('District', districtSchema);

module.exports = District;
