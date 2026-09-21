const mongoose = require('mongoose');

const solarInstallationSchema = new mongoose.Schema(
  {
    installation_id: {
      type: Number,
      required: [true, 'installation_id is required'],
      unique: true,
      index: true
    },
    substation_id: {
      type: Number,
      required: [true, 'substation_id foreign key reference is required'],
      ref: 'GridSubstation',
      index: true
    },
    // Denormalized jurisdiction references for high-performance ABAC scope filtering
    district_id: {
      type: Number,
      required: [true, 'district_id is required for jurisdiction filtering'],
      ref: 'District',
      index: true
    },
    province_id: {
      type: Number,
      required: [true, 'province_id is required for jurisdiction filtering'],
      ref: 'Province',
      index: true
    },
    site_name: {
      type: String,
      required: [true, 'Solar site name is required'],
      trim: true
    },
    // CRITICAL BRIEF §3 RULE: Meter & Inverter are attributes of SolarInstallation (NEVER a separate Device entity)
    meter_id: {
      type: String,
      required: [true, 'meter_id smart meter asset identifier is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    inverter_id: {
      type: String,
      required: [true, 'inverter_id inverter identifier is required'],
      trim: true,
      uppercase: true
    },
    capacity_kw: {
      type: Number,
      required: [true, 'Installed peak PV capacity (kWp) is required'],
      min: [0, 'Capacity cannot be negative']
    },
    installation_type: {
      type: String,
      required: [true, 'installation_type is required'],
      enum: {
        values: ['residential', 'commercial', 'industrial'],
        message: '{VALUE} is not a valid installation_type (must be residential, commercial, or industrial)'
      }
    },
    commissioning_date: {
      type: Date,
      required: [true, 'commissioning_date is required']
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'maintenance', 'offline'],
        message: '{VALUE} is not a valid status (must be active, maintenance, or offline)'
      },
      default: 'active'
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

const SolarInstallation = mongoose.model('SolarInstallation', solarInstallationSchema);

module.exports = SolarInstallation;
