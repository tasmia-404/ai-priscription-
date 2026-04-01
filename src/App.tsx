import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  UserPlus, 
  Users, 
  FileText, 
  History, 
  LogOut, 
  Plus, 
  Search, 
  Mic, 
  Download, 
  Printer, 
  Share2, 
  ChevronRight,
  Activity,
  Thermometer,
  Heart,
  Wind,
  Droplets,
  Scale,
  Ruler,
  QrCode,
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { Doctor, Patient, Vitals, PrescriptionItem, PrescriptionReport, PrescriptionHistory, MedResult } from './types';

// --- Auth Context ---
interface AuthContextType {
  doctor: Doctor | null;
  token: string | null;
  login: (token: string, doctor: Doctor) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedDoctor = localStorage.getItem('doctor');
    if (savedToken && savedDoctor) {
      setToken(savedToken);
      setDoctor(JSON.parse(savedDoctor));
    }
  }, []);

  const login = (newToken: string, newDoctor: Doctor) => {
    setToken(newToken);
    setDoctor(newDoctor);
    localStorage.setItem('token', newToken);
    localStorage.setItem('doctor', JSON.stringify(newDoctor));
  };

  const logout = () => {
    setToken(null);
    setDoctor(null);
    localStorage.removeItem('token');
    localStorage.removeItem('doctor');
  };

  return (
    <AuthContext.Provider value={{ doctor, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- AI Chat Component ---
const MedicineAIChat = ({ medicineName, onClose }: { medicineName: string; onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: `You are a professional medical assistant. Provide accurate, concise, and helpful information about the medicine: ${medicineName}. 
          Include common uses, side effects, and typical precautions. 
          Always include a disclaimer that this is AI-generated info and the user should consult a doctor.`,
        },
      });

      setMessages([...newMessages, { role: 'ai', content: response.text || 'Sorry, I couldn\'t get that info.' }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages([...newMessages, { role: 'ai', content: 'Error connecting to AI assistant.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sendMessage(`Tell me about ${medicineName}`);
  }, [medicineName]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
    >
      <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold">AI Medicine Assistant</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-emerald-500 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
            }`}>
              <div className="markdown-body">
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none flex gap-1">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask anything about this medicine..."
          className="flex-1 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:bg-white border border-transparent focus:border-emerald-500 transition-all font-medium"
        />
        <button 
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
const generatePrescriptionPDF = (
  doctor: Doctor | null,
  patient: Patient | null,
  vitals: Vitals,
  items: PrescriptionItem[],
  reports: PrescriptionReport[],
  notes?: string,
  date?: string
) => {
  const docPDF = new jsPDF();
  const displayDate = date || new Date().toLocaleDateString();
  const pageWidth = docPDF.internal.pageSize.width;
  const pageHeight = docPDF.internal.pageSize.height;

  // Page Border
  docPDF.setDrawColor(16, 185, 129); // Emerald
  docPDF.setLineWidth(0.5);
  docPDF.rect(5, 5, pageWidth - 10, pageHeight - 10);

  // Header Background
  docPDF.setFillColor(240, 253, 244); // Very light emerald
  docPDF.rect(6, 6, pageWidth - 12, 40, 'F');

  // Hospital Name
  docPDF.setFontSize(24);
  docPDF.setTextColor(16, 185, 129);
  docPDF.setFont('helvetica', 'bold');
  docPDF.text(doctor?.hospital_name || 'Hospital Name', pageWidth / 2, 22, { align: 'center' });
  
  // Doctor Details
  docPDF.setFontSize(14);
  docPDF.setTextColor(55, 65, 81); // Gray 700
  docPDF.setFont('helvetica', 'bold');
  docPDF.text(`Dr. ${doctor?.name}`, pageWidth / 2, 32, { align: 'center' });
  
  docPDF.setFontSize(10);
  docPDF.setFont('helvetica', 'normal');
  docPDF.text(doctor?.qualification || '', pageWidth / 2, 38, { align: 'center' });
  docPDF.text(doctor?.email || '', pageWidth / 2, 43, { align: 'center' });
  
  // Divider
  docPDF.setDrawColor(16, 185, 129);
  docPDF.setLineWidth(1);
  docPDF.line(10, 50, pageWidth - 10, 50);

  // Patient Information Section
  docPDF.setFillColor(249, 250, 251); // Gray 50
  docPDF.rect(10, 55, pageWidth - 20, 25, 'F');
  
  docPDF.setFontSize(11);
  docPDF.setTextColor(31, 41, 55); // Gray 800
  docPDF.setFont('helvetica', 'bold');
  docPDF.text('PATIENT INFORMATION', 15, 62);
  
  docPDF.setFont('helvetica', 'normal');
  docPDF.setFontSize(10);
  docPDF.text(`Name: ${patient?.name}`, 15, 70);
  docPDF.text(`Age/Gender: ${patient?.age} / ${patient?.gender}`, 15, 76);
  docPDF.text(`Phone: ${patient?.phone}`, pageWidth / 2, 70);
  docPDF.text(`Date: ${displayDate}`, pageWidth / 2, 76);

  // Vitals Section
  docPDF.setFont('helvetica', 'bold');
  docPDF.setFontSize(11);
  docPDF.text('VITALS', 15, 90);
  
  autoTable(docPDF, {
    startY: 93,
    margin: { left: 15, right: 15 },
    head: [['BP', 'Pulse', 'Temp', 'SpO2', 'Weight', 'Height']],
    body: [[vitals.bp, `${vitals.pulse} bpm`, `${vitals.temperature} F`, `${vitals.spo2}%`, `${vitals.weight} kg`, `${vitals.height} cm`]],
    theme: 'plain',
    headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
  });

  // Rx Symbol
  let currentY = (docPDF as any).lastAutoTable.finalY + 15;
  docPDF.setFontSize(24);
  docPDF.setTextColor(16, 185, 129);
  docPDF.setFont('helvetica', 'bold');
  docPDF.text('Rx', 15, currentY);

  // Medicines Table
  autoTable(docPDF, {
    startY: currentY + 5,
    margin: { left: 15, right: 15 },
    head: [['Medicine Name', 'Dosage', 'Frequency', 'Duration']],
    body: items.map(i => [i.medicine_name, i.dosage, i.frequency, i.duration]),
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
    }
  });

  currentY = (docPDF as any).lastAutoTable.finalY + 15;

  // Suggested Tests
  if (reports.length > 0) {
    docPDF.setFont('helvetica', 'bold');
    docPDF.setFontSize(11);
    docPDF.setTextColor(31, 41, 55);
    docPDF.text('SUGGESTED TESTS / INVESTIGATIONS', 15, currentY);
    
    docPDF.setFont('helvetica', 'normal');
    docPDF.setFontSize(10);
    reports.forEach((r, idx) => {
      docPDF.text(`• ${r.test_name}`, 20, currentY + 8 + (idx * 7));
    });
    currentY += 15 + (reports.length * 7);
  }

  // Doctor's Notes
  if (notes) {
    if (currentY > pageHeight - 60) {
      docPDF.addPage();
      currentY = 20;
    }
    docPDF.setFont('helvetica', 'bold');
    docPDF.setFontSize(11);
    docPDF.text('ADVICE / NOTES', 15, currentY);
    
    docPDF.setFont('helvetica', 'normal');
    docPDF.setFontSize(10);
    const splitNotes = docPDF.splitTextToSize(notes, pageWidth - 30);
    docPDF.text(splitNotes, 15, currentY + 8);
    currentY += 15 + (splitNotes.length * 5);
  }

  // Signature Area
  const sigY = pageHeight - 40;
  docPDF.setDrawColor(200, 200, 200);
  docPDF.line(pageWidth - 70, sigY, pageWidth - 15, sigY);
  docPDF.setFont('helvetica', 'bold');
  docPDF.setFontSize(10);
  docPDF.text(`Dr. ${doctor?.name}`, pageWidth - 70, sigY + 5);
  docPDF.setFont('helvetica', 'normal');
  docPDF.setFontSize(8);
  docPDF.text('Digital Signature', pageWidth - 70, sigY + 10);

  // Footer Disclaimer
  docPDF.setFontSize(8);
  docPDF.setTextColor(156, 163, 175); // Gray 400
  docPDF.text('This is a digitally generated prescription. Please consult your doctor for any emergencies.', pageWidth / 2, pageHeight - 15, { align: 'center' });
  docPDF.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  docPDF.save(`Prescription_${patient?.name}_${displayDate.replace(/\//g, '-')}.pdf`);
};

const QRScannerModal = ({ onScan, onClose }: { onScan: (data: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render((data) => {
      onScan(data);
      scanner.clear();
    }, (err) => {
      // console.error(err);
    });
    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Scan QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
        </div>
        <div id="reader" className="overflow-hidden rounded-xl border border-slate-200"></div>
        <p className="mt-4 text-center text-sm text-slate-500">Scan a patient ID or prescription QR</p>
      </motion.div>
    </div>
  );
};

// --- Components ---

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      login(data.token, data.doctor);
      navigate('/');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-100 p-3 rounded-xl mb-4">
            <Stethoscope className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital System</h1>
          <p className="text-slate-500">Doctor Login</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-slate-500 text-sm">
          Don't have an account? <Link to="/register" className="text-emerald-600 font-semibold">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', age: '', hospital_name: '', qualification: '', email: '', password: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      alert('Registration successful! Please login.');
      navigate('/login');
    } else {
      alert('Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Doctor Registration</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            placeholder="Full Name" 
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          <input 
            placeholder="Age" type="number"
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, age: e.target.value})}
            required
          />
          <input 
            placeholder="Hospital Name" 
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, hospital_name: e.target.value})}
            required
          />
          <input 
            placeholder="Qualification (e.g. MBBS, MD)" 
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, qualification: e.target.value})}
            required
          />
          <input 
            placeholder="Email" type="email"
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
          <input 
            placeholder="Password" type="password"
            className="w-full p-3 rounded-xl border border-slate-200"
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors">
            Register
          </button>
        </form>
        <p className="mt-6 text-center text-slate-500 text-sm">
          Already have an account? <Link to="/login" className="text-emerald-600 font-semibold">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { doctor, token, logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const [newPatient, setNewPatient] = useState({
    name: '', age: '', gender: 'Male', phone: '', address: '', medical_history: '', allergies: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const res = await fetch('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setPatients(await res.json());
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newPatient),
    });
    if (res.ok) {
      setShowAddPatient(false);
      fetchPatients();
      setNewPatient({ name: '', age: '', gender: 'Male', phone: '', address: '', medical_history: '', allergies: '' });
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    // Expected format: PATIENT:123 or just 123
    const idMatch = data.match(/PATIENT:(\d+)/) || data.match(/^(\d+)$/);
    if (idMatch) {
      navigate(`/prescribe/${idMatch[1]}`);
    } else {
      alert('Invalid QR code format');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Stethoscope className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Dr. {doctor?.name}</h2>
            <p className="text-xs text-slate-500">{doctor?.hospital_name}</p>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
          <div className="flex flex-1 w-full md:w-auto gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowScanner(true)}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              title="Scan QR"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowAddPatient(true)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 whitespace-nowrap"
            >
              <UserPlus className="w-5 h-5" />
              Add Patient
            </button>
          </div>
        </div>

        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm)).map((patient) => (
            <motion.div 
              key={patient.id}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-slate-100 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-slate-600" />
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    ID: #{patient.id}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{patient.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{patient.age} Yrs • {patient.gender}</p>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {patient.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  {patient.address}
                </div>
              </div>
              <div className="flex gap-2">
                <Link 
                  to={`/prescribe/${patient.id}`}
                  className="flex-1 bg-emerald-600 text-white text-center py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  New Prescription
                </Link>
                <Link 
                  to={`/history/${patient.id}`}
                  className="px-3 bg-slate-100 text-slate-600 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <History className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Patient Modal */}
        <AnimatePresence>
          {showScanner && (
            <QRScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />
          )}
          {showAddPatient && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl"
              >
                <h2 className="text-2xl font-bold mb-6">Add New Patient</h2>
                <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    placeholder="Patient Name" 
                    className="p-3 rounded-xl border border-slate-200"
                    onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                    required
                  />
                  <input 
                    placeholder="Age" type="number"
                    className="p-3 rounded-xl border border-slate-200"
                    onChange={(e) => setNewPatient({...newPatient, age: e.target.value})}
                    required
                  />
                  <select 
                    className="p-3 rounded-xl border border-slate-200"
                    onChange={(e) => setNewPatient({...newPatient, gender: e.target.value})}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <input 
                    placeholder="Phone Number" 
                    className="p-3 rounded-xl border border-slate-200"
                    onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                    required
                  />
                  <div className="md:col-span-2">
                    <input 
                      placeholder="Address" 
                      className="w-full p-3 rounded-xl border border-slate-200"
                      onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                      required
                    />
                  </div>
                  <textarea 
                    placeholder="Medical History (Optional)" 
                    className="p-3 rounded-xl border border-slate-200 md:col-span-1"
                    onChange={(e) => setNewPatient({...newPatient, medical_history: e.target.value})}
                  />
                  <textarea 
                    placeholder="Allergies (Optional)" 
                    className="p-3 rounded-xl border border-slate-200 md:col-span-1"
                    onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}
                  />
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddPatient(false)}
                      className="px-6 py-2 rounded-xl text-slate-500 font-semibold hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-semibold hover:bg-emerald-700"
                    >
                      Save Patient
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const PrescriptionBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const { token, doctor } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<Vitals>({
    height: 0, weight: 0, bp: '120/80', spo2: 98, respiratory_rate: 16, pulse: 72, temperature: 98.6
  });
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [reports, setReports] = useState<PrescriptionReport[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedResult[]>([]);

  const [testSearch, setTestSearch] = useState('');
  const [testResults, setTestResults] = useState<{name: string}[]>([]);
  const [notes, setNotes] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [aiMedicine, setAiMedicine] = useState<string | null>(null);

  useEffect(() => {
    fetchPatient();
    fetchAllPatients();
  }, [id]);

  const fetchAllPatients = async () => {
    const res = await fetch('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setAllPatients(await res.json());
  };

  const fetchPatient = async () => {
    const res = await fetch('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const p = data.find((x: any) => x.id === parseInt(id!));
    setPatient(p);
  };

  const searchMedicines = async (q: string) => {
    setMedSearch(q);
    if (q.length < 1) {
      setMedResults([]);
      return;
    }
    const res = await fetch(`/api/medicines/search?q=${q}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setMedResults(await res.json());
  };

  const searchTests = async (q: string) => {
    setTestSearch(q);
    const res = await fetch(`/api/tests/search?q=${q}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTestResults(await res.json());
  };

  const addMedicine = (name: string) => {
    setItems([...items, { medicine_name: name, dosage: '', frequency: '', duration: '' }]);
    setMedSearch('');
    setMedResults([]);
  };

  const addTest = (name: string) => {
    setReports([...reports, { test_name: name }]);
    setTestSearch('');
    setTestResults([]);
  };

  const handleSpeech = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported');
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Simple parsing: "Dolo 650 twice daily for 5 days"
      const parts = transcript.split(' ');
      if (parts.length > 0) {
        setMedSearch(parts[0]);
        searchMedicines(parts[0]);
      }
    };
    recognition.start();
  };

  const generatePDF = () => {
    generatePrescriptionPDF(doctor, patient, vitals, items, reports, notes);
  };

  const savePrescription = async () => {
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        patient_id: patient?.id,
        vitals,
        items,
        reports,
        notes
      }),
    });
    if (res.ok) {
      alert('Prescription saved successfully');
      navigate('/');
    }
  };

  const shareWhatsApp = () => {
    const text = `*Prescription Summary for ${patient?.name}*\n\n*Medicines:*\n${items.map(i => `- ${i.medicine_name} (${i.dosage}, ${i.frequency})`).join('\n')}\n\n*Tests:*\n${reports.map(r => `- ${r.test_name}`).join('\n')}\n\n_Dr. ${doctor?.name}_`;
    window.open(`https://wa.me/${patient?.phone}?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* Refined Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-xl transition-all group">
            <ChevronRight className="w-5 h-5 rotate-180 text-slate-500 group-hover:text-emerald-600" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">New Prescription</h1>
            <button 
              onClick={() => setShowPatientSelector(true)}
              className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 hover:text-emerald-700 transition-colors uppercase tracking-wider"
            >
              <Users className="w-3 h-3" /> Change Patient
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generatePDF} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-all font-semibold text-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          <button 
            onClick={shareWhatsApp} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-700 transition-all font-semibold text-sm shadow-lg shadow-emerald-100"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showPatientSelector && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Choose Patient</h2>
                <button onClick={() => setShowPatientSelector(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-slate-400" />
                </button>
              </div>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by name or phone..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white transition-all outline-none"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {allPatients
                  .filter(p => p.name.toLowerCase().includes(patientSearch.toLowerCase()) || p.phone.includes(patientSearch))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/prescribe/${p.id}`);
                        setShowPatientSelector(false);
                      }}
                      className="w-full text-left p-4 rounded-2xl hover:bg-emerald-50 flex items-center justify-between group transition-all border border-transparent hover:border-emerald-100"
                    >
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{p.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{p.phone} • {p.gender}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-emerald-100 transition-all">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patient Info & Vitals */}
        <div className="lg:col-span-4 space-y-6">
          {/* Patient Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">
                  {patient?.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{patient?.name}</h2>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Patient Profile</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Age / Gender</span>
                  <span className="font-semibold text-slate-900">{patient?.age} Yrs • {patient?.gender}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-semibold text-slate-900">{patient?.phone}</span>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Medical History</p>
                  <p className="text-sm text-slate-600 italic">{patient?.medical_history || 'No history recorded'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vitals Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900">Clinical Vitals</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Height', unit: 'cm', icon: Ruler, key: 'height' },
                { label: 'Weight', unit: 'kg', icon: Scale, key: 'weight' },
                { label: 'BP', unit: 'mmHg', icon: Droplets, key: 'bp' },
                { label: 'SpO2', unit: '%', icon: Activity, key: 'spo2' },
                { label: 'RR', unit: 'bpm', icon: Wind, key: 'respiratory_rate' },
                { label: 'Pulse', unit: 'bpm', icon: Heart, key: 'pulse' },
                { label: 'Temp', unit: 'F', icon: Thermometer, key: 'temperature' },
              ].map((vital) => (
                <div key={vital.key} className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <vital.icon className="w-3 h-3" /> {vital.label} ({vital.unit})
                  </label>
                  <input 
                    type={vital.key === 'bp' ? 'text' : 'number'}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm font-semibold"
                    value={(vitals as any)[vital.key] || ''} 
                    onChange={(e) => setVitals({...vitals, [vital.key]: vital.key === 'bp' ? e.target.value : (e.target.value === '' ? 0 : parseFloat(e.target.value))})}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Medicines & Advice */}
        <div className="lg:col-span-8 space-y-6">
          {/* Medicines Section */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[500px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Medications</h3>
                  <p className="text-xs text-slate-500">Add and manage prescribed medicines</p>
                </div>
              </div>
              <button 
                onClick={handleSpeech}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Mic className="w-4 h-4" />
                {isListening ? 'Listening...' : 'Voice Input'}
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                placeholder="Search medicine (e.g. Dolo, Panadol)..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-emerald-500 focus:bg-white transition-all outline-none text-lg"
                value={medSearch}
                onChange={(e) => searchMedicines(e.target.value)}
              />
              <AnimatePresence>
                {medResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl mt-3 shadow-2xl z-40 overflow-hidden border-t-4 border-t-emerald-500"
                  >
                    {medResults.map((res, i) => (
                      <button 
                        key={i}
                        onClick={() => addMedicine(res.name)}
                        className="w-full text-left p-4 hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                        title={res.composition || undefined}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 truncate">{res.name}</div>
                            {res.manufacturer_name && (
                              <div className="text-xs text-slate-500 truncate">{res.manufacturer_name}</div>
                            )}
                            {res.use_count > 500 && (
                              <span className="ml-2 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Popular</span>
                            )}
                          </div>
                        </div>
                        <Plus className="w-5 h-5 text-slate-200 group-hover:text-emerald-500" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              {medSearch.length > 0 && medResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl mt-3 shadow-2xl z-40 p-4">
                  <button 
                    onClick={() => addMedicine(medSearch)}
                    className="w-full text-left text-emerald-600 font-bold flex items-center gap-3 p-2 hover:bg-emerald-50 rounded-xl transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    Add "{medSearch}" as custom medicine
                  </button>
                </div>
              )}
            </div>

            {/* Medicine List */}
            <div className="space-y-4">
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-medium">No medicines added yet</p>
                  <p className="text-xs">Search and add medicines to start</p>
                </div>
              )}
              {items.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={idx} 
                  className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all font-bold">
                        {idx + 1}
                      </div>
                      <input 
                        className="text-lg font-bold bg-transparent border-none focus:ring-0 p-0 text-slate-900 flex-1 hover:bg-slate-50 focus:bg-slate-50 rounded-lg px-2 -ml-2 transition-colors"
                        value={item.medicine_name}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].medicine_name = e.target.value;
                          setItems(newItems);
                        }}
                      />
                    </div>
                     <button 
                      onClick={() => setAiMedicine(item.medicine_name)}
                      className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                      title="AI Medicine Info"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Plus className="w-6 h-6 rotate-45" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Dosage</label>
                      <input 
                        placeholder="e.g. 650mg"
                        className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-semibold border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none"
                        value={item.dosage}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].dosage = e.target.value;
                          setItems(newItems);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Frequency</label>
                      <input 
                        placeholder="e.g. 1-0-1 (After Food)"
                        className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-semibold border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none"
                        value={item.frequency}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].frequency = e.target.value;
                          setItems(newItems);
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Duration</label>
                      <input 
                        placeholder="e.g. 5 Days"
                        className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-semibold border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none"
                        value={item.duration}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[idx].duration = e.target.value;
                          setItems(newItems);
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reports & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reports Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <History className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900">Suggested Tests</h3>
              </div>
              <div className="relative mb-4">
                <input 
                  placeholder="Search tests..."
                  className="w-full p-3 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm"
                  value={testSearch}
                  onChange={(e) => searchTests(e.target.value)}
                />
                <AnimatePresence>
                  {testResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl mt-2 shadow-2xl z-40 max-h-48 overflow-y-auto custom-scrollbar"
                    >
                      {testResults.map((res, i) => (
                        <button 
                          key={i}
                          onClick={() => addTest(res.name)}
                          className="w-full text-left p-3 hover:bg-emerald-50 text-sm font-medium transition-colors"
                        >
                          {res.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex flex-wrap gap-2">
                {reports.map((report, idx) => (
                  <div key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-emerald-100">
                    {report.test_name}
                    <button onClick={() => setReports(reports.filter((_, i) => i !== idx))} className="hover:text-emerald-900">
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor's Notes Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900">Doctor's Advice</h3>
              </div>
              <textarea 
                placeholder="Enter additional advice, diet instructions, or follow-up notes..."
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 focus:bg-white transition-all outline-none text-sm h-[140px] resize-none font-medium"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Final Actions */}
          <div className="flex gap-4">
            <button 
              onClick={savePrescription}
              className="flex-1 bg-emerald-600 text-white py-5 rounded-3xl font-bold text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 active:scale-[0.98]"
            >
              Save & Complete Prescription
            </button>
            <button 
              onClick={() => window.print()}
              className="px-8 bg-white border-2 border-slate-200 rounded-3xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Printer className="w-6 h-6" />
            </button>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {aiMedicine && (
          <MedicineAIChat 
            medicineName={aiMedicine} 
            onClose={() => setAiMedicine(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PatientHistoryView = () => {
  const { id } = useParams<{ id: string }>();
  const { token, doctor } = useAuth();
  const [history, setHistory] = useState<PrescriptionHistory[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    const res = await fetch(`/api/patients/${id}/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setHistory(await res.json());
    
    // Fetch patient info
    const pRes = await fetch('/api/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await pRes.json();
    setPatient(data.find((x: any) => x.id === parseInt(id!)));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </Link>
        <h1 className="text-xl font-bold">Patient History</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold">{patient?.name}</h2>
          <p className="text-sm text-slate-500">{patient?.age} Yrs • {patient?.gender}</p>
        </div>

        <div className="space-y-4">
          {history.map((h) => (
            <div key={h.prescription_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-400">
                  {new Date(h.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const text = `*Prescription Summary (${new Date(h.created_at).toLocaleDateString()})*\n\n*Medicines:*\n${h.items.map(i => `- ${i.medicine_name} (${i.dosage}, ${i.frequency})`).join('\n')}\n\n*Tests:*\n${h.reports.map(r => `- ${r.test_name}`).join('\n')}\n\n_Dr. ${doctor?.name}_`;
                      window.open(`https://wa.me/${patient?.phone}?text=${encodeURIComponent(text)}`);
                    }}
                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      const vitals: Vitals = {
                        height: h.height,
                        weight: h.weight,
                        bp: h.bp,
                        spo2: h.spo2,
                        respiratory_rate: h.respiratory_rate,
                        pulse: h.pulse,
                        temperature: h.temperature
                      };
                      generatePrescriptionPDF(doctor, patient, vitals, h.items, h.reports, h.notes, new Date(h.created_at).toLocaleDateString());
                    }}
                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Vitals Row */}
              <div className="flex flex-wrap gap-2 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">BP</span>
                  <span className="text-xs font-bold text-slate-700">{h.bp}</span>
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Pulse</span>
                  <span className="text-xs font-bold text-slate-700">{h.pulse}</span>
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Temp</span>
                  <span className="text-xs font-bold text-slate-700">{h.temperature}°F</span>
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">SpO2</span>
                  <span className="text-xs font-bold text-slate-700">{h.spo2}%</span>
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Weight</span>
                  <span className="text-xs font-bold text-slate-700">{h.weight}kg</span>
                </div>
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">RR</span>
                  <span className="text-xs font-bold text-slate-700">{h.respiratory_rate}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">Medicines:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {h.items.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                      {item.medicine_name} - {item.dosage} ({item.frequency})
                    </div>
                  ))}
                </div>
              </div>
              {h.reports.length > 0 && (
                <div className="mt-4 pt-4 border-top border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-2">Suggested Tests:</h4>
                  <div className="flex flex-wrap gap-2">
                    {h.reports.map((r, idx) => (
                      <span key={idx} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                        {r.test_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              No previous prescriptions found.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- Main App ---

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" />;
};

import { useParams } from 'react-router-dom';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/prescribe/:id" element={<PrivateRoute><PrescriptionBuilder /></PrivateRoute>} />
          <Route path="/history/:id" element={<PrivateRoute><PatientHistoryView /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
