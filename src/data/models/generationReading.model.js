const mongoose = require('mongoose');

const generationReadingSchema = new mongoose.Schema(
  {
    reading_id: {
      type: Number,
      required: [true, 'reading_id is required'],
      unique: true,
      index: true
    },
    installation_id: {
      type: Number,
      required: [true, 'installation_id foreign key reference is required'],
      ref: 'SolarInstallation',
      index: true
    },
    // ISO-8601 UTC timestamp of telemetry acquisition
    recorded_at: {
      type: Date,
      required: [true, 'recorded_at timestamp is required'],
      index: true
    },
    // Instantaneous active AC power generation in kW
    power_kw: {
      type: Number,
      required: [true, 'power_kw active power measurement is required'],
      min: [0, 'Active power cannot be negative']
    },
    // Cumulative energy meter counter in kWh
    energy_kwh: {
      type: Number,
      required: [true, 'energy_kwh cumulative energy measurement is required'],
      min: [0, 'Cumulative energy cannot be negative']
    },
    // AC RMS grid voltage in Volts (~230V single phase / ~400V three phase)
    voltage_v: {
      type: Number,
      required: [true, 'voltage_v measurement is required']
    },
    // Grid operating frequency in Hz (~50.0 Hz)
    frequency_hz: {
      type: Number,
      required: [true, 'frequency_hz measurement is required']
    },
    // Dimensionless electrical power factor (cos phi, range 0.0 to 1.0)
    power_factor: {
      type: Number,
      required: [true, 'power_factor measurement is required'],
      min: [0.0, 'Power factor must be between 0.0 and 1.0'],
      max: [1.0, 'Power factor must be between 0.0 and 1.0']
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

/**
 * 1. WRITE-PATH IDEMPOTENCY COMPOUND UNIQUE INDEX
 * Prevents duplicate telemetry records when smart meters retry POST requests
 * due to transient network failures. MongoDB automatically rejects duplicates (Error 11000).
 */
generationReadingSchema.index({ installation_id: 1, recorded_at: 1 }, { unique: true });

/**
 * 2. REVERSE-CHRONOLOGICAL QUERY COMPOUND INDEX
 * Enables sub-millisecond pagination, sorting, and time-range filtering across
 * 134,000+ time-series records without memory sorts.
 */
generationReadingSchema.index({ installation_id: 1, recorded_at: -1 });

const GenerationReading = mongoose.model('GenerationReading', generationReadingSchema);

module.exports = GenerationReading;
