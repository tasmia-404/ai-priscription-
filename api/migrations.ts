import { sql } from '@vercel/postgres';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

async function migrate() {
  console.log('🚀 Starting Vercel Postgres migration...');

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        hospital_name TEXT,
        qualification TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        phone TEXT,
        address TEXT,
        medical_history TEXT,
        allergies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS vitals (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES patients(id),
        height REAL,
        weight REAL,
        bp TEXT,
        spo2 REAL,
        respiratory_rate INTEGER,
        pulse INTEGER,
        temperature REAL,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS medicines (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        manufacturer_name TEXT,
        composition TEXT,
        use_count INTEGER DEFAULT 0
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctors(id),
        patient_id INTEGER REFERENCES patients(id),
        vitals_id INTEGER REFERENCES vitals(id),
        notes TEXT,
        hospital_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id),
        medicine_name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        duration TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS prescription_reports (
        id SERIAL PRIMARY KEY,
        prescription_id INTEGER REFERENCES prescriptions(id),
        test_name TEXT,
        file_path TEXT
      );
    `;

    console.log('✅ Tables created');

    // 2. Load Medicines CSV
    const medicines: any[] = [];
    fs.createReadStream('./A_Z_medicines_dataset_of_India.csv')
      .pipe(csv())
      .on('data', (row) => medicines.push(row))
      .on('end', async () => {
        console.log(`📊 Loading ${medicines.length} medicines...`);
        await sql`TRUNCATE medicines RESTART IDENTITY CASCADE`;
        for (const med of medicines.slice(0, 5000)) { // Limit for speed
          if (med.name) {
            await sql`
              INSERT INTO medicines (name, manufacturer_name, composition, use_count)
              VALUES (${med.name}, ${med.manufacturer_name || ''}, ${med.short_composition1 || ''}, ${parseInt(med.use_count) || 0})
              ON CONFLICT (name) DO UPDATE SET use_count = medicines.use_count + 1
            `;
          }
        }
        console.log('✅ Medicines loaded');
      });

    // 3. Load Tests CSV (tab-separated)
    const tests: string[] = [];
    fs.createReadStream('./hospital_tests_420_dataset.csv')
      .pipe(csv({ separator: '\t' }))
      .on('data', (row) => {
        const name = row['Test Name'] || row.test_name || row.name;
        if (name && !tests.includes(name)) tests.push(name.trim());
      })
      .on('end', async () => {
        console.log(`🧪 Loading ${tests.length} tests...`);
        await sql`TRUNCATE tests RESTART IDENTITY`;
        for (const testName of tests.slice(0, 420)) {
          await sql`INSERT INTO tests (name) VALUES (${testName}) ON CONFLICT (name) DO NOTHING`;
        }
        console.log('✅ Tests loaded');
      });

    // 4. Default Doctor
    const hashedPassword = await import('bcryptjs').then(bcrypt => bcrypt.hash('password123', 10));
    await sql`
      INSERT INTO doctors (name, age, hospital_name, qualification, email, password)
      VALUES ('Dr. John Doe', 45, 'City Hospital', 'MBBS, MD', 'doctor@example.com', ${hashedPassword})
      ON CONFLICT (email) DO NOTHING
    `;

    console.log('🎉 Migration complete! Run "vercel --prod" to deploy.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();

