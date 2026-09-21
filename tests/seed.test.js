'use strict';

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/data/db');
const {
  Province,
  District,
  GridSubstation,
  SolarInstallation,
  GenerationReading,
  User
} = require('../src/data/models');

describe('Phase 3: Seed Data Generation Engine & Referential Integrity Tests', () => {
  beforeAll(async () => {
    await connectDB();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. Dataset Scale Requirements (Coursework Brief §4)', () => {
    test('should have exactly 9 administrative provinces', async () => {
      const count = await Province.countDocuments();
      expect(count).toBe(9);
    });

    test('should have exactly 25 administrative districts', async () => {
      const count = await District.countDocuments();
      expect(count).toBe(25);
    });

    test('should have at least 20 grid substations (found >= 20)', async () => {
      const count = await GridSubstation.countDocuments();
      expect(count).toBeGreaterThanOrEqual(20);
    });

    test('should have at least 200 solar installations (found >= 200)', async () => {
      const count = await SolarInstallation.countDocuments();
      expect(count).toBeGreaterThanOrEqual(200);
    });

    test('should have at least 134,400 generation readings (1 week @ 15-min intervals)', async () => {
      const count = await GenerationReading.countDocuments();
      expect(count).toBeGreaterThanOrEqual(134400);
    }, 15000);

    test('should have 5 pre-configured security test users', async () => {
      const count = await User.countDocuments();
      expect(count).toBe(5);
    });
  });

  describe('2. Referential Integrity & Foreign Key Chain', () => {
    test('all 25 districts must reference valid existing provinces', async () => {
      const validProvinceIds = (await Province.find().select('province_id -_id')).map(p => p.province_id);
      const districts = await District.find().select('district_id province_id name -_id');

      for (const dist of districts) {
        expect(validProvinceIds).toContain(dist.province_id);
      }
    });

    test('all grid substations must reference valid existing districts', async () => {
      const validDistrictIds = (await District.find().select('district_id -_id')).map(d => d.district_id);
      const substations = await GridSubstation.find().select('substation_id district_id name -_id');

      for (const sub of substations) {
        expect(validDistrictIds).toContain(sub.district_id);
      }
    });

    test('all solar installations must reference valid substations, districts, and provinces', async () => {
      const validSubstationIds = new Set((await GridSubstation.find().select('substation_id -_id')).map(s => s.substation_id));
      const validDistrictIds = new Set((await District.find().select('district_id -_id')).map(d => d.district_id));
      const validProvinceIds = new Set((await Province.find().select('province_id -_id')).map(p => p.province_id));

      const installations = await SolarInstallation.find().select('installation_id substation_id district_id province_id meter_id -_id');

      for (const inst of installations) {
        expect(validSubstationIds.has(inst.substation_id)).toBe(true);
        expect(validDistrictIds.has(inst.district_id)).toBe(true);
        expect(validProvinceIds.has(inst.province_id)).toBe(true);
      }
    });

    test('solar installations must have unique meter_ids', async () => {
      const installations = await SolarInstallation.find().select('meter_id -_id');
      const meterIds = installations.map(i => i.meter_id);
      const uniqueMeterIds = new Set(meterIds);

      expect(uniqueMeterIds.size).toBe(installations.length);
    });
  });

  describe('3. Mathematical Diurnal Solar Physics & Telemetry Invariants', () => {
    test('night-time generation readings must have exactly 0 kW active power', async () => {
      // 02:00 Sri Lanka time (UTC 20:30 on previous day)
      const nightReading = await GenerationReading.findOne({
        installation_id: 1,
        recorded_at: new Date('2026-09-14T20:30:00.000Z')
      });

      expect(nightReading).not.toBeNull();
      expect(nightReading.power_kw).toBe(0.0);
      expect(nightReading.power_factor).toBe(1.0);
    });

    test('solar noon generation readings for active sites must produce positive active power', async () => {
      // 12:30 Sri Lanka time (UTC 07:00)
      const activeInst = await SolarInstallation.findOne({ status: 'active', installation_id: 1 });
      const noonReading = await GenerationReading.findOne({
        installation_id: activeInst.installation_id,
        recorded_at: new Date('2026-09-15T07:00:00.000Z')
      });

      expect(noonReading).not.toBeNull();
      expect(noonReading.power_kw).toBeGreaterThan(0.0);
      expect(noonReading.power_kw).toBeLessThanOrEqual(activeInst.capacity_kw);
      expect(noonReading.power_factor).toBeGreaterThanOrEqual(0.95);
      expect(noonReading.power_factor).toBeLessThanOrEqual(1.0);
    });

    test('cumulative energy counter (energy_kwh) must be monotonically non-decreasing', async () => {
      // Fetch 96 readings for installation 1 (1 full day)
      const dayReadings = await GenerationReading.find({
        installation_id: 1,
        recorded_at: {
          $gte: new Date('2026-09-14T00:00:00.000Z'),
          $lte: new Date('2026-09-14T23:45:00.000Z')
        }
      }).sort({ recorded_at: 1 });

      expect(dayReadings.length).toBe(96);

      for (let i = 1; i < dayReadings.length; i++) {
        expect(dayReadings[i].energy_kwh).toBeGreaterThanOrEqual(dayReadings[i - 1].energy_kwh);
      }
    });

    test('electrical quality metrics must be within Sri Lanka national grid bounds', async () => {
      const sample = await GenerationReading.find({ installation_id: 5 }).limit(50);

      for (const reading of sample) {
        // Voltage ~230V +/- 10%
        expect(reading.voltage_v).toBeGreaterThanOrEqual(210);
        expect(reading.voltage_v).toBeLessThanOrEqual(250);
        // Frequency ~50Hz +/- 0.5Hz
        expect(reading.frequency_hz).toBeGreaterThanOrEqual(49.5);
        expect(reading.frequency_hz).toBeLessThanOrEqual(50.5);
      }
    });
  });

  describe('4. Pre-configured Test User Authentication', () => {
    test('admin_national should verify password successfully', async () => {
      const admin = await User.findOne({ username: 'admin_national' });
      expect(admin).not.toBeNull();
      expect(admin.role).toBe('national_analyst');
      expect(admin.jurisdiction_level).toBe('national');
      expect(admin.jurisdiction_id).toBeNull();

      const isMatch = await admin.comparePassword('Password@123');
      expect(isMatch).toBe(true);

      const isWrong = await admin.comparePassword('WrongPassword');
      expect(isWrong).toBe(false);
    });

    test('op_colombo should have district_operator role and district_id = 1', async () => {
      const colomboOp = await User.findOne({ username: 'op_colombo' });
      expect(colomboOp).not.toBeNull();
      expect(colomboOp.role).toBe('district_operator');
      expect(colomboOp.jurisdiction_level).toBe('district');
      expect(colomboOp.jurisdiction_id).toBe(1);
    });
  });
});
