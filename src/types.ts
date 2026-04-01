export interface Doctor {
  id: number;
  name: string;
  email: string;
  hospital_name: string;
  qualification: string;
}

export interface Patient {
  id: number;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  medical_history?: string;
  allergies?: string;
}

export interface Vitals {
  height: number;
  weight: number;
  bp: string;
  spo2: number;
  respiratory_rate: number;
  pulse: number;
  temperature: number;
}

export interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionReport {
  test_name: string;
  file_path?: string;
}

export interface MedResult {
  name: string;
  manufacturer_name?: string;
  composition?: string;
  use_count: number;
}

export interface PrescriptionHistory {
  prescription_id: number;
  created_at: string;
  height: number;
  weight: number;
  bp: string;
  spo2: number;
  respiratory_rate: number;
  pulse: number;
  temperature: number;
  notes?: string;
  items: PrescriptionItem[];
  reports: PrescriptionReport[];
}
