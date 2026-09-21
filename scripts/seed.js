'use strict';

/**
 * SLSEA Solar Telemetry Database Seeding Engine
 * 
 * Populates MongoDB Atlas with a foreign-key-consistent energy dataset:
 * - 9 Provinces (ISO 3166-2:LK codes)
 * - 25 Administrative Districts
 * - 26 Grid Substations (CEB/LECO 132/33 kV and 220/33 kV)
 * - 205 Solar Installations across residential, commercial, and industrial tiers
 * - 5 Test Users covering National, Provincial, and District jurisdiction scopes
 * - 137,760 Telemetry Readings (7 full days @ 15-min intervals for 205 sites)
 *   generated via a mathematical solar diurnal model.
 * 
 * Also outputs root `seed.json` reference snapshot for coursework compliance.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../src/data/db');
const {
  Province,
  District,
  GridSubstation,
  SolarInstallation,
  GenerationReading,
  User
} = require('../src/data/models');

// Deterministic Pseudo-Random Number Generator (Mulberry32) for reproducible data
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1. Static Reference Data: 9 Provinces
const PROVINCES_DATA = [
  { province_id: 1, code: 'WP', name: 'Western' },
  { province_id: 2, code: 'CP', name: 'Central' },
  { province_id: 3, code: 'SP', name: 'Southern' },
  { province_id: 4, code: 'NP', name: 'Northern' },
  { province_id: 5, code: 'EP', name: 'Eastern' },
  { province_id: 6, code: 'NWP', name: 'North Western' },
  { province_id: 7, code: 'NCP', name: 'North Central' },
  { province_id: 8, code: 'UP', name: 'Uva' },
  { province_id: 9, code: 'SGP', name: 'Sabaragamuwa' }
];

// 2. Static Reference Data: 25 Districts
const DISTRICTS_DATA = [
  // Western (1)
  { district_id: 1, province_id: 1, code: 'COL', name: 'Colombo' },
  { district_id: 2, province_id: 1, code: 'GAM', name: 'Gampaha' },
  { district_id: 3, province_id: 1, code: 'KAL', name: 'Kalutara' },
  // Central (2)
  { district_id: 4, province_id: 2, code: 'KAN', name: 'Kandy' },
  { district_id: 5, province_id: 2, code: 'MTL', name: 'Matale' },
  { district_id: 6, province_id: 2, code: 'NUE', name: 'Nuwara Eliya' },
  // Southern (3)
  { district_id: 7, province_id: 3, code: 'GAL', name: 'Galle' },
  { district_id: 8, province_id: 3, code: 'MAT', name: 'Matara' },
  { district_id: 9, province_id: 3, code: 'HAM', name: 'Hambantota' },
  // Northern (4)
  { district_id: 10, province_id: 4, code: 'JAF', name: 'Jaffna' },
  { district_id: 11, province_id: 4, code: 'KIL', name: 'Kilinochchi' },
  { district_id: 12, province_id: 4, code: 'MAN', name: 'Mannar' },
  { district_id: 13, province_id: 4, code: 'VAV', name: 'Vavuniya' },
  { district_id: 14, province_id: 4, code: 'MUL', name: 'Mullaittivu' },
  // Eastern (5)
  { district_id: 15, province_id: 5, code: 'BAT', name: 'Batticaloa' },
  { district_id: 16, province_id: 5, code: 'AMP', name: 'Ampara' },
  { district_id: 17, province_id: 5, code: 'TRI', name: 'Trincomalee' },
  // North Western (6)
  { district_id: 18, province_id: 6, code: 'KUR', name: 'Kurunegala' },
  { district_id: 19, province_id: 6, code: 'PUT', name: 'Puttalam' },
  // North Central (7)
  { district_id: 20, province_id: 7, code: 'ANU', name: 'Anuradhapura' },
  { district_id: 21, province_id: 7, code: 'POL', name: 'Polonnaruwa' },
  // Uva (8)
  { district_id: 22, province_id: 8, code: 'BAD', name: 'Badulla' },
  { district_id: 23, province_id: 8, code: 'MON', name: 'Monaragala' },
  // Sabaragamuwa (9)
  { district_id: 24, province_id: 9, code: 'RAT', name: 'Ratnapura' },
  { district_id: 25, province_id: 9, code: 'KEG', name: 'Kegalle' }
];

// 3. Static Reference Data: 26 Grid Substations
const SUBSTATIONS_DATA = [
  { substation_id: 1, district_id: 1, code: 'GS-COL-01', name: 'Colombo Fort Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 2, district_id: 1, code: 'GS-COL-02', name: 'Kolonnawa Grid Substation', capacity_mva: 90, voltage_kv: '220/33 kV' },
  { substation_id: 3, district_id: 2, code: 'GS-GAM-01', name: 'Kelaniya Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 4, district_id: 3, code: 'GS-KAL-01', name: 'Panadura Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 5, district_id: 4, code: 'GS-KAN-01', name: 'Kiribathkumbura Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 6, district_id: 5, code: 'GS-MTL-01', name: 'Ukuwela Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 7, district_id: 6, code: 'GS-NUE-01', name: 'Nuwara Eliya Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 8, district_id: 7, code: 'GS-GAL-01', name: 'Galle Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 9, district_id: 8, code: 'GS-MAT-01', name: 'Matara Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 10, district_id: 9, code: 'GS-HAM-01', name: 'Hambantota Grid Substation', capacity_mva: 90, voltage_kv: '220/33 kV' },
  { substation_id: 11, district_id: 10, code: 'GS-JAF-01', name: 'Chunnakam Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 12, district_id: 11, code: 'GS-KIL-01', name: 'Kilinochchi Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 13, district_id: 12, code: 'GS-MAN-01', name: 'Mannar Wind & Solar Substation', capacity_mva: 90, voltage_kv: '220/33 kV' },
  { substation_id: 14, district_id: 13, code: 'GS-VAV-01', name: 'Vavuniya Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 15, district_id: 14, code: 'GS-MUL-01', name: 'Mullaittivu Grid Substation', capacity_mva: 31.5, voltage_kv: '132/33 kV' },
  { substation_id: 16, district_id: 15, code: 'GS-BAT-01', name: 'Valachchenai Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 17, district_id: 16, code: 'GS-AMP-01', name: 'Ampara Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 18, district_id: 17, code: 'GS-TRI-01', name: 'Trincomalee Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 19, district_id: 18, code: 'GS-KUR-01', name: 'Kurunegala Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 20, district_id: 19, code: 'GS-PUT-01', name: 'Puttalam Grid Substation', capacity_mva: 90, voltage_kv: '220/33 kV' },
  { substation_id: 21, district_id: 20, code: 'GS-ANU-01', name: 'Anuradhapura Grid Substation', capacity_mva: 63, voltage_kv: '132/33 kV' },
  { substation_id: 22, district_id: 21, code: 'GS-POL-01', name: 'Polonnaruwa Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 23, district_id: 22, code: 'GS-BAD-01', name: 'Badulla Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 24, district_id: 23, code: 'GS-MON-01', name: 'Monaragala Grid Substation', capacity_mva: 31.5, voltage_kv: '132/33 kV' },
  { substation_id: 25, district_id: 24, code: 'GS-RAT-01', name: 'Ratnapura Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' },
  { substation_id: 26, district_id: 25, code: 'GS-KEG-01', name: 'Kegalle Grid Substation', capacity_mva: 45, voltage_kv: '132/33 kV' }
];

// Helper: Build 205 Solar Installations across 25 districts
function buildSolarInstallations() {
  const installations = [];
  const inverters = ['SMA', 'HUAWEI', 'FRONIUS', 'SOLAX', 'GROWATT'];
  let installationId = 1;

  // Distribute across all 25 districts (8 per district = 200, plus 5 extra in high-density districts = 205)
  for (const dist of DISTRICTS_DATA) {
    const substations = SUBSTATIONS_DATA.filter(s => s.district_id === dist.district_id);
    const countForDistrict = (dist.district_id === 1 || dist.district_id === 2) ? 10 : (dist.district_id === 4 ? 9 : 8);

    for (let i = 1; i <= countForDistrict; i++) {
      if (installationId > 205) break;

      const sub = substations[(i - 1) % substations.length];
      const invBrand = inverters[(installationId - 1) % inverters.length];
      
      // Determine tier and capacity
      let type, capacity, namePrefix;
      if (i <= 4) {
        type = 'residential';
        capacity = Math.round((5 + (i * 2.2)) * 10) / 10; // 5.0 - 13.8 kW
        namePrefix = `${dist.name} Residential Solar Array`;
      } else if (i <= 7) {
        type = 'commercial';
        capacity = Math.round((25 + (i * 7.5)) * 10) / 10; // 25 - 77.5 kW
        namePrefix = `${dist.name} Commercial PV Array`;
      } else {
        type = 'industrial';
        capacity = Math.round((120 + ((installationId % 5) * 65)) * 10) / 10; // 120 - 380 kW
        namePrefix = `${dist.name} Industrial Solar Park`;
      }

      // Status distribution: mostly active, rare maintenance/offline for realistic filtering
      let status = 'active';
      if (installationId === 42 || installationId === 115) {
        status = 'maintenance';
      } else if (installationId === 88 || installationId === 173) {
        status = 'offline';
      }

      // Staggered commissioning date between 2022-01-10 and 2024-05-20
      const baseDaysAgo = 300 + (installationId * 3);
      const commDate = new Date(Date.now() - (baseDaysAgo * 24 * 60 * 60 * 1000));

      installations.push({
        installation_id: installationId,
        substation_id: sub.substation_id,
        district_id: dist.district_id,
        province_id: dist.province_id,
        site_name: `${namePrefix} #${String(i).padStart(2, '0')}`,
        meter_id: `MTR-${dist.code}-${String(installationId).padStart(3, '0')}`,
        inverter_id: `INV-${invBrand}-${String(1000 + installationId)}`,
        capacity_kw: capacity,
        installation_type: type,
        commissioning_date: commDate,
        status: status
      });

      installationId++;
    }
  }

  return installations;
}

// 4. Test Users Generator with Bcrypt Hashes (Password: 'Password@123')
function buildTestUsers() {
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Password@123', salt);

  return [
    {
      user_id: 1,
      username: 'admin_national',
      password_hash: passwordHash,
      full_name: 'Dr. Sunimal Jayasuriya (SLSEA Director)',
      role: 'national_analyst',
      jurisdiction_level: 'national',
      jurisdiction_id: null
    },
    {
      user_id: 2,
      username: 'op_western',
      password_hash: passwordHash,
      full_name: 'Anura Bandara (Western Province Energy Officer)',
      role: 'provincial_operator',
      jurisdiction_level: 'province',
      jurisdiction_id: 1
    },
    {
      user_id: 3,
      username: 'op_colombo',
      password_hash: passwordHash,
      full_name: 'Kavindu Perera (Colombo District Dispatcher)',
      role: 'district_operator',
      jurisdiction_level: 'district',
      jurisdiction_id: 1
    },
    {
      user_id: 4,
      username: 'op_kandy',
      password_hash: passwordHash,
      full_name: 'Chaminda Rathnayake (Kandy District Dispatcher)',
      role: 'district_operator',
      jurisdiction_level: 'district',
      jurisdiction_id: 4
    },
    {
      user_id: 5,
      username: 'op_galle',
      password_hash: passwordHash,
      full_name: 'Nalaka Fernando (Galle District Dispatcher)',
      role: 'district_operator',
      jurisdiction_level: 'district',
      jurisdiction_id: 7
    }
  ];
}

// 5. Main Seeding Routine
async function seedDatabase() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('⚡ SLSEA SOLAR REST API — PRODUCTION SEED DATA GENERATOR ⚡');
  console.log('================================================================');
  console.log('Connecting to MongoDB Atlas cluster...');

  await connectDB();

  console.log('\n[1/5] Resetting existing database collections...');
  await Promise.all([
    Province.deleteMany({}),
    District.deleteMany({}),
    GridSubstation.deleteMany({}),
    SolarInstallation.deleteMany({}),
    GenerationReading.deleteMany({}),
    User.deleteMany({})
  ]);
  console.log('✔ All collections purged successfully.');

  console.log('\n[2/5] Seeding Geographic & Asset Hierarchy...');
  await Province.insertMany(PROVINCES_DATA);
  console.log(`✔ Inserted ${PROVINCES_DATA.length} Provinces.`);

  await District.insertMany(DISTRICTS_DATA);
  console.log(`✔ Inserted ${DISTRICTS_DATA.length} Administrative Districts.`);

  await GridSubstation.insertMany(SUBSTATIONS_DATA);
  console.log(`✔ Inserted ${SUBSTATIONS_DATA.length} Grid Substations.`);

  const installations = buildSolarInstallations();
  await SolarInstallation.insertMany(installations);
  console.log(`✔ Inserted ${installations.length} Solar Installations across all 25 districts.`);

  console.log('\n[3/5] Seeding RBAC & ABAC Security Test Users...');
  const users = buildTestUsers();
  await User.insertMany(users);
  console.log(`✔ Inserted ${users.length} Pre-configured Test Users (Password: 'Password@123').`);

  console.log('\n[4/5] Procedurally Generating 7 Days of 15-Minute Solar Telemetry...');
  console.log('      Mathematical Diurnal Model: 0 kW at night, sinusoidal curve at solar noon.');
  
  // 7 full days of 15-minute readings = 7 * 96 = 672 readings per site
  const TOTAL_DAYS = 7;
  const INTERVALS_PER_DAY = 96; // 24 * 4
  const TOTAL_INTERVALS = TOTAL_DAYS * INTERVALS_PER_DAY; // 672
  const TOTAL_EXPECTED_READINGS = installations.length * TOTAL_INTERVALS; // 205 * 672 = 137,760
  
  // Fixed deterministic baseline week: 2026-09-14 00:00:00 UTC to 2026-09-20 23:45:00 UTC
  const BASE_START_TIME = new Date('2026-09-14T00:00:00.000Z').getTime();
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
  
  const rand = mulberry32(16602658); // Seeded with student ID for deterministic generation
  const BATCH_SIZE = 5000;
  let batch = [];
  let readingId = 1;
  let totalInserted = 0;
  const sampleReadings = [];

  // Track cumulative energy per installation across time
  const cumulativeEnergyMap = new Map();
  for (const inst of installations) {
    // Initial cumulative baseline (kWh) proportional to capacity and age
    cumulativeEnergyMap.set(inst.installation_id, Math.round(inst.capacity_kw * 450 * 10) / 10);
  }

  process.stdout.write('      Progress: [');
  const progressBars = 30;
  let lastReportedPct = -1;

  for (let t = 0; t < TOTAL_INTERVALS; t++) {
    const timestampMs = BASE_START_TIME + (t * FIFTEEN_MINUTES_MS);
    const recordedAt = new Date(timestampMs);

    // Calculate local Sri Lanka solar time (UTC + 5 hours 30 mins)
    const localMinutes = (recordedAt.getUTCHours() * 60 + recordedAt.getUTCMinutes() + 330) % 1440;
    const localHour = localMinutes / 60; // 0.00 to 23.99

    // Weather variability factor for the day
    const dayIndex = Math.floor(t / INTERVALS_PER_DAY);
    const dayWeatherFactor = 0.92 + (rand() * 0.14); // 0.92 to 1.06

    for (const inst of installations) {
      let powerKw = 0.0;
      let powerFactor = 1.0;
      let voltageV = Math.round((228.0 + (rand() * 3.0 - 1.5)) * 10) / 10;

      // Equatorial daylight curve between 06:00 and 18:15 local time
      if (localHour >= 6.0 && localHour <= 18.25) {
        const solarAngle = Math.PI * ((localHour - 6.0) / 12.25);
        const sinIrradiance = Math.sin(solarAngle);
        const cloudFactor = dayWeatherFactor * (0.95 + (rand() * 0.10));

        if (inst.status === 'offline') {
          powerKw = 0.0;
        } else if (inst.status === 'maintenance') {
          powerKw = Math.round(sinIrradiance * inst.capacity_kw * 0.15 * 100) / 100;
        } else {
          const rawPower = inst.capacity_kw * sinIrradiance * cloudFactor;
          powerKw = Math.round(Math.min(inst.capacity_kw, Math.max(0, rawPower)) * 100) / 100;
        }

        powerFactor = Math.round((0.95 + (rand() * 0.04)) * 100) / 100;
        voltageV = Math.round((228.0 + (8.5 * sinIrradiance) + (rand() * 2.0 - 1.0)) * 10) / 10;
      }

      // Integrate energy (kWh): Power (kW) * 0.25 hours
      const deltaKwh = Math.round((powerKw * 0.25) * 1000) / 1000;
      const prevEnergy = cumulativeEnergyMap.get(inst.installation_id);
      const currentEnergy = Math.round((prevEnergy + deltaKwh) * 1000) / 1000;
      cumulativeEnergyMap.set(inst.installation_id, currentEnergy);

      const frequencyHz = Math.round((50.0 + (rand() * 0.20 - 0.10)) * 100) / 100;

      const readingDoc = {
        reading_id: readingId,
        installation_id: inst.installation_id,
        recorded_at: recordedAt,
        power_kw: powerKw,
        energy_kwh: currentEnergy,
        voltage_v: voltageV,
        frequency_hz: frequencyHz,
        power_factor: powerFactor
      };

      batch.push(readingDoc);

      // Keep first 100 readings for root seed.json snapshot
      if (readingId <= 100) {
        sampleReadings.push(readingDoc);
      }

      readingId++;

      // Batch streaming insertion to prevent RAM spikes and Atlas timeouts
      if (batch.length >= BATCH_SIZE) {
        await GenerationReading.insertMany(batch, { ordered: false });
        totalInserted += batch.length;
        batch = [];

        // Progress feedback
        const pct = Math.floor((totalInserted / TOTAL_EXPECTED_READINGS) * 100);
        if (pct !== lastReportedPct && pct % 5 === 0) {
          lastReportedPct = pct;
          const filled = Math.floor((pct / 100) * progressBars);
          const empty = progressBars - filled;
          process.stdout.write(`\r      Progress: [${'='.repeat(filled)}${'-'.repeat(empty)}] ${pct}% (${totalInserted.toLocaleString()} readings)`);
        }
      }
    }
  }

  // Flush trailing documents
  if (batch.length > 0) {
    await GenerationReading.insertMany(batch, { ordered: false });
    totalInserted += batch.length;
    process.stdout.write(`\r      Progress: [${'='.repeat(progressBars)}] 100% (${totalInserted.toLocaleString()} readings)\n`);
  }

  console.log(`\n✔ Telemetry Ingestion Complete: ${totalInserted.toLocaleString()} Generation Readings written to Atlas.`);

  console.log('\n[5/5] Exporting Reference seed.json Artifact for Coursework Submission...');
  const seedSnapshot = {
    metadata: {
      project: 'NB6007CEM — SLSEA Solar Generation Telemetry REST API',
      version: '1.0.0',
      owner: 'W.P.N.S.M.D.SILVA (16602658 / COBSCCOMP25.1P-016)',
      generated_at: new Date().toISOString(),
      temporal_window: {
        from: new Date(BASE_START_TIME).toISOString(),
        to: new Date(BASE_START_TIME + (TOTAL_INTERVALS - 1) * FIFTEEN_MINUTES_MS).toISOString(),
        interval_minutes: 15,
        total_days: TOTAL_DAYS
      },
      scale: {
        provinces: PROVINCES_DATA.length,
        districts: DISTRICTS_DATA.length,
        grid_substations: SUBSTATIONS_DATA.length,
        solar_installations: installations.length,
        test_users: users.length,
        total_readings_in_database: totalInserted
      },
      test_credentials: {
        default_password: 'Password@123',
        accounts: users.map(u => ({
          username: u.username,
          role: u.role,
          jurisdiction_level: u.jurisdiction_level,
          jurisdiction_id: u.jurisdiction_id
        }))
      }
    },
    provinces: PROVINCES_DATA,
    districts: DISTRICTS_DATA,
    grid_substations: SUBSTATIONS_DATA,
    solar_installations: installations,
    users: users.map(u => ({
      user_id: u.user_id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      jurisdiction_level: u.jurisdiction_level,
      jurisdiction_id: u.jurisdiction_id
    })),
    sample_generation_readings: sampleReadings
  };

  const seedFilePath = path.join(__dirname, '..', 'seed.json');
  fs.writeFileSync(seedFilePath, JSON.stringify(seedSnapshot, null, 2), 'utf8');
  console.log(`✔ Reference snapshot written to: ${path.relative(process.cwd(), seedFilePath)} (${(fs.statSync(seedFilePath).size / 1024).toFixed(1)} KB)`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n================================================================');
  console.log(`🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY IN ${durationSec}s!`);
  console.log('================================================================');

  await disconnectDB();
}

// Run directly
if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('\n❌ Seeding Error:', err);
    disconnectDB().finally(() => process.exit(1));
  });
}

module.exports = {
  PROVINCES_DATA,
  DISTRICTS_DATA,
  SUBSTATIONS_DATA,
  buildSolarInstallations,
  buildTestUsers
};
