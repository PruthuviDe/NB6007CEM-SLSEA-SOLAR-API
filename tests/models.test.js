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

describe('Phase 2: Mongoose Database Schema & Validation Tests', () => {

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('1. Province Model', () => {
    it('should validate a valid Province document', () => {
      const province = new Province({
        province_id: 1,
        code: 'WP',
        name: 'Western Province'
      });
      const err = province.validateSync();
      expect(err).toBeUndefined();
    });

    it('should fail validation if required fields are missing', () => {
      const province = new Province({});
      const err = province.validateSync();
      expect(err.errors.province_id).toBeDefined();
      expect(err.errors.code).toBeDefined();
      expect(err.errors.name).toBeDefined();
    });
  });

  describe('2. District Model', () => {
    it('should validate a valid District document', () => {
      const district = new District({
        district_id: 1,
        province_id: 1,
        code: 'COL',
        name: 'Colombo'
      });
      const err = district.validateSync();
      expect(err).toBeUndefined();
    });

    it('should require province_id foreign key reference', () => {
      const district = new District({
        district_id: 1,
        code: 'COL',
        name: 'Colombo'
      });
      const err = district.validateSync();
      expect(err.errors.province_id).toBeDefined();
    });
  });

  describe('3. GridSubstation Model', () => {
    it('should validate a valid GridSubstation document', () => {
      const substation = new GridSubstation({
        substation_id: 101,
        district_id: 1,
        code: 'GS-KOT',
        name: 'Kotugoda Grid Substation',
        capacity_mva: 100.0,
        voltage_kv: '132/33 kV'
      });
      const err = substation.validateSync();
      expect(err).toBeUndefined();
    });

    it('should reject negative capacity_mva', () => {
      const substation = new GridSubstation({
        substation_id: 101,
        district_id: 1,
        code: 'GS-KOT',
        name: 'Kotugoda Grid Substation',
        capacity_mva: -10,
        voltage_kv: '132/33 kV'
      });
      const err = substation.validateSync();
      expect(err.errors.capacity_mva).toBeDefined();
    });
  });

  describe('4. SolarInstallation Model (Critical Brief Rules)', () => {
    it('should validate a valid SolarInstallation with meter/inverter as attributes', () => {
      const installation = new SolarInstallation({
        installation_id: 501,
        substation_id: 101,
        district_id: 1,
        province_id: 1,
        site_name: 'NIBM Green Rooftop Solar',
        meter_id: 'MTR-NIBM-001',
        inverter_id: 'INV-SMA-50K',
        capacity_kw: 50.0,
        installation_type: 'commercial',
        commissioning_date: new Date('2024-01-15'),
        status: 'active'
      });
      const err = installation.validateSync();
      expect(err).toBeUndefined();
      expect(installation.meter_id).toBe('MTR-NIBM-001');
      expect(installation.inverter_id).toBe('INV-SMA-50K');
    });

    it('should reject invalid installation_type enum', () => {
      const installation = new SolarInstallation({
        installation_id: 501,
        substation_id: 101,
        district_id: 1,
        province_id: 1,
        site_name: 'NIBM Solar',
        meter_id: 'MTR-001',
        inverter_id: 'INV-001',
        capacity_kw: 50.0,
        installation_type: 'invalid_type_here',
        commissioning_date: new Date()
      });
      const err = installation.validateSync();
      expect(err.errors.installation_type).toBeDefined();
    });

    it('should reject invalid status enum', () => {
      const installation = new SolarInstallation({
        installation_id: 501,
        substation_id: 101,
        district_id: 1,
        province_id: 1,
        site_name: 'NIBM Solar',
        meter_id: 'MTR-001',
        inverter_id: 'INV-001',
        capacity_kw: 50.0,
        installation_type: 'commercial',
        commissioning_date: new Date(),
        status: 'broken' // only active | maintenance | offline allowed
      });
      const err = installation.validateSync();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('5. GenerationReading Model (Append-Only Time Series)', () => {
    it('should validate a valid GenerationReading telemetry record', () => {
      const reading = new GenerationReading({
        reading_id: 10001,
        installation_id: 501,
        recorded_at: new Date('2026-09-21T06:00:00.000Z'),
        power_kw: 38.5,
        energy_kwh: 1250.4,
        voltage_v: 231.2,
        frequency_hz: 50.02,
        power_factor: 0.98
      });
      const err = reading.validateSync();
      expect(err).toBeUndefined();
    });

    it('should reject out-of-range power_factor (> 1.0 or < 0.0)', () => {
      const reading = new GenerationReading({
        reading_id: 10002,
        installation_id: 501,
        recorded_at: new Date(),
        power_kw: 20.0,
        energy_kwh: 100.0,
        voltage_v: 230.0,
        frequency_hz: 50.0,
        power_factor: 1.5 // Invalid: must be <= 1.0
      });
      const err = reading.validateSync();
      expect(err.errors.power_factor).toBeDefined();
    });

    it('should have compound indexes declared for idempotency and query speed', () => {
      const indexes = GenerationReading.schema.indexes();
      const hasIdempotencyIndex = indexes.some(
        ([idx, opts]) => idx.installation_id === 1 && idx.recorded_at === 1 && opts.unique === true
      );
      const hasQueryIndex = indexes.some(
        ([idx]) => idx.installation_id === 1 && idx.recorded_at === -1
      );

      expect(hasIdempotencyIndex).toBe(true);
      expect(hasQueryIndex).toBe(true);
    });
  });

  describe('6. User Model (RBAC & ABAC Jurisdiction)', () => {
    it('should validate a valid User with district scope', () => {
      const user = new User({
        user_id: 1,
        username: 'colombo_operator',
        password_hash: '$2a$10$abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        full_name: 'District Operator Colombo',
        role: 'district_operator',
        jurisdiction_level: 'district',
        jurisdiction_id: 1
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });

    it('should validate a national analyst with null jurisdiction_id', () => {
      const user = new User({
        user_id: 2,
        username: 'national_analyst_lead',
        password_hash: '$2a$10$abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        full_name: 'SLSEA Lead Analyst',
        role: 'national_analyst',
        jurisdiction_level: 'national',
        jurisdiction_id: null
      });
      const err = user.validateSync();
      expect(err).toBeUndefined();
    });

    it('should hide password_hash when serialized to JSON', () => {
      const user = new User({
        user_id: 3,
        username: 'viewer',
        password_hash: '$2a$10$secret_hash_value',
        full_name: 'Test Officer',
        role: 'provincial_operator',
        jurisdiction_level: 'province',
        jurisdiction_id: 1
      });
      const json = user.toJSON();
      expect(json.password_hash).toBeUndefined();
      expect(json.username).toBe('viewer');
    });
  });

});
