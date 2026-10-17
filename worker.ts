import { GoogleGenAI, Type } from '@google/genai';

export const DEFAULT_SPREADSHEET_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj/exec';
export const DEFAULT_DEPLOYMENT_ID =
  'AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj';

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
      explanation: "Salah, cahaya bergerak jauh lebih cepat (~300.000 km/s) dibanding suara (~343 m/s di udara).",
      category: "Fisika",
    },
  ];

  const shuffled = [...library].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, library.length)).map((item, idx) => ({
    id: `q_fallback_${Date.now()}_${idx}`,
    ...item,
  }));
}

function parseCsv(csvText: string): any[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => {
      if (h) {
        row[h] = values[idx] || '';
      }
    });
    rows.push(row);
  }

  return rows;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Default spreadsheet config
    if (url.pathname === '/api/default-spreadsheet-config') {
      return Response.json({
        success: true,
        defaultUrl: DEFAULT_SPREADSHEET_SCRIPT_URL,
        deploymentId: DEFAULT_DEPLOYMENT_ID,
        creator: 'Bu Melisa - SDN 2 Jeli',
      });
    }

    // 2. Sync spreadsheet
    if (url.pathname === '/api/sync-spreadsheet' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const rawUrl = (body as any)?.url;
        let fetchUrl =
          typeof rawUrl === 'string' && rawUrl.trim().length > 0 && rawUrl.trim() !== 'default'
            ? rawUrl.trim()
            : DEFAULT_SPREADSHEET_SCRIPT_URL;

        const isAppsScript = fetchUrl.includes('script.google.com');
        if (!isAppsScript) {
          if (!fetchUrl.includes('/pub?output=csv') && !fetchUrl.includes('/gviz/tq?tqx=out:csv')) {
            const match = fetchUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
            if (match && match[1]) {
              const sheetId = match[1];
              const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);
              const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
              fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
            }
          }
        }

        const resp = await fetch(fetchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          redirect: 'follow',
        });

        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403 || (resp.redirected && resp.url.includes('accounts.google.com'))) {
            return Response.json({
              success: false,
              isAuthError: true,
              error: 'Web App Apps Script memerlukan izin akses publik ("Anyone / Siapa saja"). Buka Google Sheets > Ekstensi > Apps Script > Kelola penerapan (Manage deployments) > Edit > ubah "Yang memiliki akses" menjadi "Siapa saja", lalu klik Terapkan.',
            }, { status: 403 });
          }
          throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
        }

        const responseText = await resp.text();
        const isLoginRedirect =
          (resp.redirected && (resp.url.includes('accounts.google.com') || resp.url.includes('ServiceLogin'))) ||
          (responseText.includes('<!DOCTYPE html>') && (
            responseText.includes('accounts.google.com') ||
            responseText.includes('ServiceLogin') ||
            responseText.includes('Sign in') ||
            responseText.includes('You need permission') ||
            responseText.includes('You need access')
          ));

        if (isLoginRedirect) {
          return Response.json({
            success: false,
            isAuthError: true,
            error: 'Web App Apps Script memerlukan izin akses publik ("Anyone / Siapa saja"). Buka Google Sheets > Ekstensi > Apps Script > Kelola penerapan (Manage deployments) > Edit > ubah "Yang memiliki akses" menjadi "Siapa saja", lalu klik Terapkan.',
          }, { status: 403 });
        }

        let rawRows: any[] = [];
        const trimmedText = responseText.trim();
        if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmedText);
            if (Array.isArray(parsed)) rawRows = parsed;
            else if (parsed && Array.isArray(parsed.rows)) rawRows = parsed.rows;
            else if (parsed && Array.isArray(parsed.data)) rawRows = parsed.data;
            else if (parsed && Array.isArray(parsed.quizSets)) {
              const groups: { [title: string]: any[] } = {};
              let totalQ = 0;
              parsed.quizSets.forEach((qs: any) => {
                if (qs && qs.title && Array.isArray(qs.questions)) {
                  groups[qs.title] = qs.questions;
                  totalQ += qs.questions.length;
                }
              });
              return Response.json({
                success: true,
                totalQuestions: totalQ,
                groups,
                sourceUrl: fetchUrl,
                lastSyncedAt: new Date().toISOString(),
              });
            }
          } catch (e) {
            // Not JSON
          }
        }

        if (rawRows.length === 0) {
          rawRows = parseCsv(responseText);
        }

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
          return Response.json({
            success: false,
            error: 'Google Spreadsheet berhasil dihubungi, namun lembar kerja kosong atau tidak memiliki baris data soal.',
          }, { status: 400 });
        }

        const groups: { [title: string]: any[] } = {};
        let totalQuestions = 0;

        rawRows.forEach((row, idx) => {
          const keys = Object.keys(row);
          const getKey = (pattern: RegExp) => {
            const found = keys.find(k => pattern.test(k.trim().toLowerCase()));
            return found ? (row as any)[found] : undefined;
          };

          const text = (row as any).text || getKey(/pernyataan|soal|pertanyaan|statement/i);
          const ansRaw = (row as any).isCorrect !== undefined ? (row as any).isCorrect : getKey(/kunci|jawaban|answer|correct/i);
          const explanation = (row as any).explanation || getKey(/penjelasan|alasan|explanation/i);
          const category = (row as any).category || getKey(/kategori|topik|category/i);
          const quizTitleRaw = (row as any).quizTitle || (row as any).quizSetTitle || getKey(/paket kuis|paket|nama paket|materi|judul/i);

          if (text && String(text).trim().length > 0) {
            let isCorrect = false;
            if (typeof ansRaw === 'boolean') {
              isCorrect = ansRaw;
            } else {
              const strAns = String(ansRaw || '').trim().toUpperCase();
              isCorrect = strAns === 'BENAR' || strAns === 'TRUE' || strAns === 'B' || strAns === '1' || strAns === 'YA';
            }

            const qTitle = quizTitleRaw ? String(quizTitleRaw).trim() : 'Paket Kuis Spreadsheet';
            if (!groups[qTitle]) {
              groups[qTitle] = [];
            }
            groups[qTitle].push({
              id: `q_${Date.now()}_${idx}`,
              text: String(text).trim(),
              isCorrect,
              explanation: explanation ? String(explanation).trim() : (isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
              category: category ? String(category).trim() : 'Umum',
            });
            totalQuestions++;
          }
        });

        return Response.json({
          success: true,
          totalQuestions,
          groups,
          sourceUrl: fetchUrl,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message }, { status: 500 });
      }
    }

    // 3. Save to spreadsheet via Apps Script
    if (url.pathname === '/api/save-to-spreadsheet' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({}));
        const { scriptUrl, action, quizSets, question, quizTitle } = body as any;
        let trimmedUrl =
          typeof scriptUrl === 'string' && scriptUrl.trim().length > 0 && scriptUrl.trim() !== 'default'
            ? scriptUrl.trim()
            : DEFAULT_SPREADSHEET_SCRIPT_URL;

        if (!trimmedUrl.includes('script.google.com')) {
          return Response.json({
            success: false,
            error: 'Tautan harus merupakan URL Aplikasi Web Apps Script Google (berakhiran /exec).',
          }, { status: 400 });
        }

        const payload = {
          action: action || 'saveAll',
          quizSets,
          question,
          quizTitle,
          timestamp: new Date().toISOString(),
        };

        const resp = await fetch(trimmedUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });

        const respText = await resp.text();
        let resultJson: any;
        try {
          resultJson = JSON.parse(respText);
        } catch {
          resultJson = { success: true, message: respText };
        }

        return Response.json({
          success: true,
          result: resultJson,
          message: resultJson.message || 'Data soal berhasil disimpan ke Google Spreadsheet!',
        });
      } catch (err: any) {
        return Response.json({
          success: false,
          error: 'Gagal mengirim data ke Google Spreadsheet: ' + (err.message || 'Koneksi gagal'),
        }, { status: 500 });
      }
    }

    // 4. Generate questions with Gemini AI
    if (url.pathname === '/api/generate-questions' && request.method === 'POST') {
      let topic = 'Pengetahuan Umum';
      try {
        const body = await request.json().catch(() => ({}));
        const parsedBody = body as any;
        topic = parsedBody?.topic || 'Pengetahuan Umum';
        const count = parsedBody?.count || 5;
        const gradeLevel = parsedBody?.gradeLevel || 'SD / SMP';
        const difficulty = parsedBody?.difficulty || 'Sedang';
        const numCount = Math.min(Math.max(Number(count) || 5, 2), 15);
        const apiKeyEnv = (env as any)?.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);

        if (!apiKeyEnv) {
          return Response.json({
            success: true,
            questions: getFallbackQuestions(topic, numCount),
            source: 'offline-library',
          });
        }

        const genAI = new GoogleGenAI({ apiKey: apiKeyEnv });
        const prompt = `Buatkan ${numCount} buah pernyataan BENAR atau SALAH (True/False) untuk game kuis evaluasi sekolah interaktif di kelas.
Topik/Mata Pelajaran: ${topic}
Tingkat Kelas: ${gradeLevel}
Tingkat Kesulitan: ${difficulty}

Persyaratan:
1. Pastikan pernyataan dibuat ringkas, lugas, dan menarik untuk dibaca cepat dalam 10 detik.
2. Buat variasi seimbang antara pernyataan yang BENAR (isCorrect: true) dan pernyataan yang SALAH (isCorrect: false).
3. Berikan penjelasan singkat (1-2 kalimat) yang mendidik untuk ditampilkan saat pembahasan.
4. Bahasa yang digunakan adalah Bahasa Indonesia yang baik dan mudah dipahami siswa.`;

        const response = await genAI.models.generateContent({
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
                  text: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  explanation: { type: Type.STRING },
                  category: { type: Type.STRING },
                },
                required: ["text", "isCorrect", "explanation"],
              },
            },
          },
        });

        const text = response.text;
        if (!text) throw new Error('Empty response from Gemini');
        const parsed = JSON.parse(text);
        const questionsWithIds = parsed.map((q: any, idx: number) => ({
          id: `ai_${Date.now()}_${idx}`,
          text: q.text,
          isCorrect: Boolean(q.isCorrect),
          explanation: q.explanation || (q.isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
          category: q.category || topic,
        }));

        return Response.json({
          success: true,
          questions: questionsWithIds,
          source: 'gemini-3.8-flash',
        });
      } catch (error: any) {
        return Response.json({
          success: true,
          questions: getFallbackQuestions(topic, 5),
          source: 'fallback-after-error',
          error: error.message,
        });
      }
    }

    // 5. Serve static frontend assets from dist via env.ASSETS
    if (env && (env as any).ASSETS) {
      return (env as any).ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
