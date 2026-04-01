import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import csv from 'csv-parser';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = 'hospital-system-secret-key';

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // Database setup
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      age INTEGER,
      hospital_name TEXT,
      qualification TEXT,
      email TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER,
      name TEXT,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      address TEXT,
      medical_history TEXT,
      allergies TEXT,
      FOREIGN KEY(doctor_id) REFERENCES doctors(id)
    );

    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      height REAL,
      weight REAL,
      bp TEXT,
      spo2 REAL,
      respiratory_rate INTEGER,
      pulse INTEGER,
      temperature REAL,
      recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      use_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER,
      patient_id INTEGER,
      vitals_id INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(doctor_id) REFERENCES doctors(id),
      FOREIGN KEY(patient_id) REFERENCES patients(id),
      FOREIGN KEY(vitals_id) REFERENCES vitals(id)
    );

    CREATE TABLE IF NOT EXISTS prescription_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER,
      medicine_name TEXT,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      FOREIGN KEY(prescription_id) REFERENCES prescriptions(id)
    );

    CREATE TABLE IF NOT EXISTS prescription_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prescription_id INTEGER,
      test_name TEXT,
      file_path TEXT,
      FOREIGN KEY(prescription_id) REFERENCES prescriptions(id)
    );
  `);

  // Migration: Add hospital_name and notes columns to prescriptions if needed
  try {
    await db.exec('ALTER TABLE prescriptions ADD COLUMN hospital_name TEXT');
  } catch (e) {
    // Column likely already exists
  }
  try {
    await db.exec('ALTER TABLE prescriptions ADD COLUMN notes TEXT');
  } catch (e) {
    // Column likely already exists
  }

  // Load CSV data if tables are empty
    // Always reload CSV to ensure latest data (per user request)
    console.log('Reloading medicines from CSV...');
    const medicines: any[] = [];
fs.createReadStream('./A_Z_medicines_dataset_of_India.csv')
      .pipe(csv())
      .on('data', (row) => {
        medicines.push({ 
          name: (row.name || row.medicine_name || '').trim(),
          manufacturer_name: row.manufacturer_name?.trim() || '',
          composition: (row.short_composition1 || '').trim(),
          use_count: parseInt(row.use_count) || 0 
        });
      })
      .on('end', async () => {
        // Clear and recreate table for full reload
        await db.exec('DROP TABLE IF EXISTS medicines; CREATE TABLE medicines (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, manufacturer_name TEXT, composition TEXT, use_count INTEGER DEFAULT 0);');
        const stmt = await db.prepare('INSERT OR REPLACE INTO medicines (name, manufacturer_name, composition, use_count) VALUES (?, ?, ?, ?)');
        let loaded = 0;
        for (const med of medicines) {
          if (med.name) {
            await stmt.run(med.name, med.manufacturer_name, med.composition, med.use_count);
            loaded++;
          }
        }
        await stmt.finalize();
        console.log(`CSV medicines reloaded: ${loaded} entries with manufacturer/composition.`);
      });

  const testCount = await db.get('SELECT COUNT(*) as count FROM tests');
  if (testCount.count === 0) {
    console.log('Loading tests from CSV...');
    fs.createReadStream('./hospital_tests_420_dataset.csv')
      .pipe(csv({ separator: '\t' }))
      .on('data', (row) => {
        const name = row['Test Name'] || row.test_name || row.name;
        if (name) db.run('INSERT OR IGNORE INTO tests (name) VALUES (?)', name.trim());
      })
      .on('end', () => {
        console.log('Tests loaded.');
      });
  }

  // Add a default doctor if none exist
  const doctorCount = await db.get('SELECT COUNT(*) as count FROM doctors');
  if (doctorCount.count === 0) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await db.run(
      'INSERT INTO doctors (name, age, hospital_name, qualification, email, password) VALUES (?, ?, ?, ?, ?, ?)',
      ['Dr. John Doe', 45, 'City Hospital', 'MBBS, MD', 'doctor@example.com', hashedPassword]
    );
    console.log('Default doctor created: doctor@example.com / password123');
  }

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/register', async (req, res) => {
    const { name, age, hospital_name, qualification, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      await db.run(
        'INSERT INTO doctors (name, age, hospital_name, qualification, email, password) VALUES (?, ?, ?, ?, ?, ?)',
        [name, age, hospital_name, qualification, email, hashedPassword]
      );
      res.status(201).json({ message: 'Doctor registered successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    const doctor = await db.get('SELECT * FROM doctors WHERE email = ?', [email]);
    if (!doctor) {
      console.log(`Login failed: User ${email} not found`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, doctor.password);
    if (!isPasswordValid) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log(`Login successful for: ${email}`);
    const token = jwt.sign({ id: doctor.id, email: doctor.email, name: doctor.name, hospital: doctor.hospital_name, qualification: doctor.qualification }, JWT_SECRET);
    res.json({ token, doctor: { id: doctor.id, name: doctor.name, email: doctor.email, hospital_name: doctor.hospital_name, qualification: doctor.qualification } });
  });

  app.get('/api/patients', authenticateToken, async (req: any, res) => {
    const patients = await db.all('SELECT * FROM patients WHERE doctor_id = ?', [req.user.id]);
    res.json(patients);
  });

  app.post('/api/patients', authenticateToken, async (req: any, res) => {
    const { name, age, gender, phone, address, medical_history, allergies } = req.body;
    const result = await db.run(
      'INSERT INTO patients (doctor_id, name, age, gender, phone, address, medical_history, allergies) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, age, gender, phone, address, medical_history, allergies]
    );
    res.status(201).json({ id: result.lastID });
  });

  app.get('/api/patients/:id/history', authenticateToken, async (req: any, res) => {
    const prescriptions = await db.all(`
      SELECT p.*, v.*, p.id as prescription_id, p.hospital_name
      FROM prescriptions p
      JOIN vitals v ON p.vitals_id = v.id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.id]);

    for (const p of prescriptions) {
      p.items = await db.all('SELECT * FROM prescription_items WHERE prescription_id = ?', [p.prescription_id]);
      p.reports = await db.all('SELECT * FROM prescription_reports WHERE prescription_id = ?', [p.prescription_id]);
    }

    res.json(prescriptions);
  });

  app.get('/api/medicines/search', authenticateToken, async (req, res) => {
    const query = req.query.q as string;
    if (!query) return res.json([]);
    // Prefix matching: name starts with query
    const medicines = await db.all(
      'SELECT name, manufacturer_name, composition, use_count FROM medicines WHERE name LIKE ? ORDER BY use_count DESC, name ASC LIMIT 20',
      [`${query}%`]
    );
    res.json(medicines);
  });

  app.get('/api/tests/search', authenticateToken, async (req, res) => {
    const query = req.query.q as string;
    const tests = await db.all(
      'SELECT name FROM tests WHERE name LIKE ? ORDER BY name ASC LIMIT 50',
      [`%${query || ''}%`]
    );
    res.json(tests);
  });

  app.post('/api/prescriptions', authenticateToken, async (req: any, res) => {
    try {
      const { patient_id, vitals, items, reports, notes } = req.body;

      const vitalsResult = await db.run(
        'INSERT INTO vitals (patient_id, height, weight, bp, spo2, respiratory_rate, pulse, temperature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [patient_id, vitals.height, vitals.weight, vitals.bp, vitals.spo2, vitals.respiratory_rate, vitals.pulse, vitals.temperature]
      );
      const vitals_id = vitalsResult.lastID;

      const prescriptionResult = await db.run(
        'INSERT INTO prescriptions (doctor_id, patient_id, vitals_id, notes, hospital_name) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, patient_id, vitals_id, notes, req.user.hospital]
      );
      const prescription_id = prescriptionResult.lastID;

      for (const item of items) {
        await db.run(
          'INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration) VALUES (?, ?, ?, ?, ?)',
          [prescription_id, item.medicine_name, item.dosage, item.frequency, item.duration]
        );
        // Update use count
        await db.run('UPDATE medicines SET use_count = use_count + 1 WHERE name = ?', [item.medicine_name]);
      }

      if (reports) {
        for (const report of reports) {
          await db.run(
            'INSERT INTO prescription_reports (prescription_id, test_name, file_path) VALUES (?, ?, ?)',
            [prescription_id, report.test_name, report.file_path]
          );
        }
      }

      res.status(201).json({ id: prescription_id });
    } catch (error) {
      console.error('Error creating prescription:', error);
      res.status(500).json({ error: 'Failed to create prescription' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
