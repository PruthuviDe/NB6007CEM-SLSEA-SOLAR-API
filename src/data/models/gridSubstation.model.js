const mongoose = require('mongoose');

const gridSubstationSchema = new mongoose.Schema(
  {
    substation_id: {
      type: Number,
      required: [true, 'substation_id is required'],
      unique: true,
      index: true
    },
    district_id: {
      type: Number,
      required: [true, 'district_id foreign key reference is required'],
      ref: 'District',
      index: true
    },
    code: {
      type: String,
      required: [true, 'Substation code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Substation code cannot exceed 20 characters']
    },
    name: {
      type: String,
      required: [true, 'Substation name is required'],
      trim: true
    },
    capacity_mva: {
      type: Number,
      required: [true, 'Transformer capacity in MVA is required'],
      min: [0, 'Capacity cannot be negative']
    },
    voltage_kv: {
      type: String,
      required: [true, 'Voltage level ratio (e.g. 132/33 kV) is required'],
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

const GridSubstation = mongoose.model('GridSubstation', gridSubstationSchema);

module.exports = GridSubstation;
