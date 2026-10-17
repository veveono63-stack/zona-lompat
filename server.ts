import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Gemini client if API key is present
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fallback questions generator for Indonesian curriculum / general knowledge
function getFallbackQuestions(topic: string, count: number = 5) {
  const library = [
    {
      text: "Matahari terbit dari arah barat.",
      isCorrect: false,
      explanation: "Matahari terbit dari arah timur dan tenggelam di sebelah barat karena rotasi bumi dari barat ke timur.",
      category: "Sains Alam",
    },
    {
      text: "Mamalia adalah hewan berdarah panas yang bernapas dengan paru-paru.",
      isCorrect: true,
      explanation: "Benar, sebagian besar mamalia berdarah panas (homoiterm) dan bernapas dengan paru-paru.",
      category: "Biologi",
    },
    {
      text: "Ibu kota Indonesia saat ini adalah Jakarta.",
      isCorrect: true,
      explanation: "Benar, DKI Jakarta merupakan ibu kota negara Indonesia (dengan proses bertahap menuju IKN).",
      category: "Geografi",
    },
    {
      text: "Segitiga memiliki total jumlah sudut dalam sebesar 360 derajat.",
      isCorrect: false,
      explanation: "Salah, jumlah total sudut dalam pada sebuah segitiga selalu 180 derajat. 360 derajat adalah untuk segi empat.",
      category: "Matematika",
    },
    {
      text: "Tanaman menghasilkan oksigen pada siang hari melalui proses fotosintesis.",
      isCorrect: true,
      explanation: "Benar, dengan bantuan cahaya matahari dan klorofil, tumbuhan melepaskan oksigen (O2).",
      category: "Biologi",
    },
    {
      text: "Planet terdekat dari Matahari dalam tata surya kita adalah Mars.",
      isCorrect: false,
      explanation: "Salah, planet terdekat dari Matahari adalah Merkurius, disusul Venus, Bumi, lalu Mars.",
      category: "Astronomi",
    },
    {
      text: "Air membeku menjadi es pada suhu 0 derajat Celsius pada tekanan normal.",
      isCorrect: true,
      explanation: "Benar, titik beku air murni pada tekanan atmosfer normal (1 atm) adalah 0°C.",
      category: "Fisika & Kimia",
    },
    {
      text: "Paus adalah jenis ikan terbesar di samudra.",
      isCorrect: false,
      explanation: "Salah, paus bukan ikan melainkan mamalia laut yang melahirkan dan menyusui anaknya.",
      category: "Biologi",
    },
    {
      text: "Lagu kebangsaan Indonesia Raya diciptakan oleh W.R. Supratman.",
      isCorrect: true,
      explanation: "Benar, Wage Rudolf Supratman adalah komponis lagu kebangsaan Indonesia Raya.",
      category: "Sejarah",
    },
    {
      text: "Kecepatan cahaya lebih lambat daripada kecepatan suara.",
      isCorrect: false,
      explanation: "Salah, cahaya bergerak jauh lebih cepat (~300.000 km/s) dibanding suara (~343 m/s di udara), itulah mengapa kita melihat kilat sebelum mendengar guruh.",
      category: "Fisika",
    },
  ];

  // Return requested count or shuffled
  const shuffled = [...library].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, library.length)).map((item, idx) => ({
    id: `q_fallback_${Date.now()}_${idx}`,
    ...item,
  }));
}

// API endpoint to generate quiz statements
app.post('/api/generate-questions', async (req, res) => {
  const { topic = 'Pengetahuan Umum', count = 5, gradeLevel = 'SD / SMP', difficulty = 'Sedang' } = req.body;
  const numCount = Math.min(Math.max(Number(count) || 5, 2), 15);

  if (!ai) {
    console.warn('GEMINI_API_KEY not set. Using smart fallback library.');
    return res.json({
      success: true,
      questions: getFallbackQuestions(topic, numCount),
      source: 'offline-library',
    });
  }

  try {
    const prompt = `Buatkan ${numCount} buah pernyataan BENAR atau SALAH (True/False) untuk game kuis evaluasi sekolah interaktif di kelas.
Topik/Mata Pelajaran: ${topic}
Tingkat Kelas: ${gradeLevel}
Tingkat Kesulitan: ${difficulty}

Persyaratan:
1. Pastikan pernyataan dibuat ringkas, lugas, dan menarik untuk dibaca cepat dalam 10 detik.
2. Buat variasi seimbang antara pernyataan yang BENAR (isCorrect: true) dan pernyataan yang SALAH (isCorrect: false).
3. Berikan penjelasan singkat (1-2 kalimat) yang mendidik untuk ditampilkan saat pembahasan.
4. Bahasa yang digunakan adalah Bahasa Indonesia yang baik dan mudah dipahami siswa.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten guru cerdas pembuat kuis evaluasi game interaktif. Hasilkan data JSON valid yang berisi daftar pernyataan benar atau salah.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "Pernyataan kuis yang harus ditebak benar atau salah",
              },
              isCorrect: {
                type: Type.BOOLEAN,
                description: "true jika pernyataan benar, false jika pernyataan salah",
              },
              explanation: {
                type: Type.STRING,
                description: "Penjelasan fakta ilmiah atau edukatif mengapa benar/salah",
              },
              category: {
                type: Type.STRING,
                description: "Kategori atau subtopik singkat",
              },
            },
            required: ["text", "isCorrect", "explanation"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(text);
    const questionsWithIds = parsed.map((q: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      text: q.text,
      isCorrect: Boolean(q.isCorrect),
      explanation: q.explanation || (q.isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
      category: q.category || topic,
    }));

    return res.json({
      success: true,
      questions: questionsWithIds,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Error generating questions with Gemini:', error);
    // Return fallback with note
    return res.json({
      success: true,
      questions: getFallbackQuestions(topic, numCount),
      source: 'fallback-after-error',
      error: error.message,
    });
  }
});

// Default built-in Google Apps Script Web App URL from teacher / admin (Bu Melisa - SDN 2 Jeli)
export const DEFAULT_SPREADSHEET_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj/exec';
export const DEFAULT_DEPLOYMENT_ID =
  'AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj';

// Provide default spreadsheet config to frontend
app.get('/api/default-spreadsheet-config', (_req, res) => {
  res.json({
    success: true,
    defaultUrl: DEFAULT_SPREADSHEET_SCRIPT_URL,
    deploymentId: DEFAULT_DEPLOYMENT_ID,
    creator: 'Bu Melisa - SDN 2 Jeli',
  });
});

// Sync questions directly from Google Spreadsheet URL (live database)
app.post('/api/sync-spreadsheet', async (req, res) => {
  try {
    const rawUrl = req.body && req.body.url;
    // Default to the built-in script URL if not provided, empty, or set to 'default'
    let fetchUrl =
      typeof rawUrl === 'string' && rawUrl.trim().length > 0 && rawUrl.trim() !== 'default'
        ? rawUrl.trim()
        : DEFAULT_SPREADSHEET_SCRIPT_URL;

    const isAppsScript = fetchUrl.includes('script.google.com');

    // Transform typical Google Sheets share URLs into direct CSV export URLs
    if (!isAppsScript) {
      if (fetchUrl.includes('/pub?output=csv') || fetchUrl.includes('/gviz/tq?tqx=out:csv')) {
        // Already an export link
      } else {
        const match = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          const sheetId = match[1];
          // Extract gid if present
          const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);
          const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
          fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
        }
      }
    }

    // Fetch content (follows redirects automatically)
    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || (response.redirected && response.url.includes('accounts.google.com'))) {
        return res.status(403).json({
          success: false,
          isAuthError: true,
          error: 'Web App Apps Script memerlukan izin akses publik ("Anyone / Siapa saja"). Buka Google Sheets > Ekstensi > Apps Script > Kelola penerapan (Manage deployments) > ikon Pensil (Edit) > ubah "Yang memiliki akses" (Who has access) menjadi "Siapa saja" (Anyone), lalu klik Terapkan.',
        });
      }
      throw new Error(`Mengembalikan kode status HTTP ${response.status} (${response.statusText})`);
    }

    const responseText = await response.text();

    // Check if Google redirected to a Google Account login page or Drive permission request page
    const isLoginRedirect =
      (response.redirected && (response.url.includes('accounts.google.com') || response.url.includes('ServiceLogin'))) ||
      (responseText.includes('<!DOCTYPE html>') && (
        responseText.includes('accounts.google.com') ||
        responseText.includes('ServiceLogin') ||
        responseText.includes('Sign in') ||
        responseText.includes('You need permission') ||
        responseText.includes('You need access') ||
        responseText.includes('docs-drivelogo') ||
        responseText.includes('request-access')
      ));

    if (isLoginRedirect) {
      return res.status(403).json({
        success: false,
        isAuthError: true,
        error: 'Web App Apps Script memerlukan izin akses publik ("Anyone / Siapa saja"). Buka Google Sheets > Ekstensi > Apps Script > Kelola penerapan (Manage deployments) > ikon Pensil (Edit) > ubah "Yang memiliki akses" (Who has access) menjadi "Siapa saja" (Anyone), lalu klik Terapkan. Setelah itu game akan otomatis membaca soal dari spreadsheet!',
      });
    }

    let rawRows: any[] = [];

    // Check if response is JSON (from Apps Script)
    const trimmedText = responseText.trim();
    if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmedText);
        if (Array.isArray(parsed)) {
          rawRows = parsed;
        } else if (parsed && Array.isArray(parsed.rows)) {
          rawRows = parsed.rows;
        } else if (parsed && Array.isArray(parsed.data)) {
          rawRows = parsed.data;
        } else if (parsed && Array.isArray(parsed.quizSets)) {
          // If already structured as quizSets
          const groups: { [title: string]: any[] } = {};
          let totalQ = 0;
          parsed.quizSets.forEach((qs: any) => {
            if (qs && qs.title && Array.isArray(qs.questions)) {
              groups[qs.title] = qs.questions;
              totalQ += qs.questions.length;
            }
          });
          return res.json({
            success: true,
            totalQuestions: totalQ,
            groups,
            sourceUrl: fetchUrl,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      } catch (jsonErr) {
        console.warn('Response started like JSON but failed to parse, fallback to XLSX:', jsonErr);
      }
    }

    // Fallback or standard CSV/Sheet parsing with XLSX
    if (rawRows.length === 0) {
      const workbook = XLSX.read(responseText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet);
    }

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Google Spreadsheet berhasil dihubungi, namun lembar kerja kosong atau tidak memiliki baris data soal.',
      });
    }

    // Group questions by Paket Kuis
    const groups: { [title: string]: any[] } = {};
    let totalQuestions = 0;

    rawRows.forEach((row, idx) => {
      const keys = Object.keys(row);
      const getKey = (pattern: RegExp) => {
        const found = keys.find(k => pattern.test(k.trim().toLowerCase()));
        return found ? row[found] : undefined;
      };

      // Support direct property names from script (text, isCorrect, quizTitle, category, explanation)
      const text = row.text || getKey(/pernyataan|soal|pertanyaan|statement/i);
      const ansRaw = row.isCorrect !== undefined ? row.isCorrect : getKey(/kunci|jawaban|answer|correct/i);
      const explanation = row.explanation || getKey(/penjelasan|alasan|explanation/i);
      const category = row.category || getKey(/kategori|topik|category/i);
      const quizTitleRaw = row.quizTitle || row.quizSetTitle || getKey(/paket kuis|paket|nama paket|materi|judul/i);

      if (text && String(text).trim().length > 0) {
        let isCorrect = false;
        if (typeof ansRaw === 'boolean') {
          isCorrect = ansRaw;
        } else {
          const strAns = String(ansRaw || '').trim().toUpperCase();
          isCorrect = strAns === 'BENAR' || strAns === 'TRUE' || strAns === 'B' || strAns === '1' || strAns === 'YA';
        }

        const targetTitle = quizTitleRaw && String(quizTitleRaw).trim().length > 0
          ? String(quizTitleRaw).trim()
          : 'Bank Soal Spreadsheet';

        if (!groups[targetTitle]) {
          groups[targetTitle] = [];
        }

        groups[targetTitle].push({
          id: row.id || `q_sheet_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          text: String(text).trim(),
          isCorrect: isCorrect,
          explanation: explanation ? String(explanation).trim() : (isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
          category: category ? String(category).trim() : targetTitle,
        });

        totalQuestions++;
      }
    });

    if (totalQuestions === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ditemukan kolom "Pernyataan Soal" dan "Kunci Jawaban" yang cocok di Google Spreadsheet. Pastikan baris judul berisi: Pernyataan Soal, Kunci Jawaban, Paket Kuis.',
      });
    }

    return res.json({
      success: true,
      totalQuestions,
      groups,
      sourceUrl: fetchUrl,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error syncing Google Spreadsheet:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kendala saat membaca Google Spreadsheet: ' + (err.message || 'Koneksi terputus'),
    });
  }
});

// Save questions directly to Google Spreadsheet via Apps Script Web App
app.post('/api/save-to-spreadsheet', async (req, res) => {
  try {
    const { scriptUrl, action, quizSets, question, quizTitle } = req.body;
    let trimmedUrl =
      typeof scriptUrl === 'string' && scriptUrl.trim().length > 0 && scriptUrl.trim() !== 'default'
        ? scriptUrl.trim()
        : DEFAULT_SPREADSHEET_SCRIPT_URL;

    if (!trimmedUrl.includes('script.google.com')) {
      return res.status(400).json({
        success: false,
        error: 'Tautan harus merupakan URL Aplikasi Web Apps Script Google (berakhiran /exec). Silakan deploy Web App pada menu Ekstensi > Apps Script di Google Sheets Anda.',
      });
    }

    const payload = {
      action: action || 'saveAll',
      quizSets,
      question,
      quizTitle,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(trimmedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || (response.redirected && response.url.includes('accounts.google.com'))) {
        return res.status(403).json({
          success: false,
          isAuthError: true,
          error: 'Apps Script belum diizinkan untuk publik ("Anyone / Siapa saja"). Buka spreadsheet > Ekstensi > Apps Script > Kelola penerapan > edit "Yang memiliki akses" menjadi "Siapa saja".',
        });
      }
      throw new Error(`Apps Script mengembalikan status HTTP ${response.status} (${response.statusText})`);
    }

    const responseText = await response.text();

    const isLoginRedirect =
      (response.redirected && (response.url.includes('accounts.google.com') || response.url.includes('ServiceLogin'))) ||
      (responseText.includes('<!DOCTYPE html>') && (
        responseText.includes('accounts.google.com') ||
        responseText.includes('ServiceLogin') ||
        responseText.includes('Sign in') ||
        responseText.includes('You need permission') ||
        responseText.includes('You need access')
      ));

    if (isLoginRedirect) {
      return res.status(403).json({
        success: false,
        isAuthError: true,
        error: 'Web App Apps Script memerlukan izin akses "Siapa saja (Anyone)". Silakan buka spreadsheet > Ekstensi > Apps Script > Kelola penerapan (Manage deployments) > Edit > ubah "Yang memiliki akses" menjadi "Siapa saja" (Anyone), lalu Terapkan.',
      });
    }

    let resultJson: any;
    try {
      resultJson = JSON.parse(responseText);
    } catch {
      resultJson = { success: true, message: responseText };
    }

    return res.json({
      success: true,
      result: resultJson,
      message: resultJson.message || 'Data soal berhasil disimpan ke Google Spreadsheet!',
    });
  } catch (err: any) {
    console.error('Error saving to Google Spreadsheet via Apps Script:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengirim data ke Google Spreadsheet: ' + (err.message || 'Koneksi gagal'),
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
