import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Sparkles, Trash2, Edit2, Save, Download, Upload, 
  RotateCcw, Check, KeyRound, Clock, Settings, FolderPlus, ListFilter,
  FileSpreadsheet, FileDown, AlertCircle, CheckCircle2, Database,
  ExternalLink, RefreshCw, Copy, CheckCheck, Table, HelpCircle, Share2, Globe,
  UploadCloud, Code2, ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { QuizSet, Question, GameSettings } from '../types/quiz';
import { AIGeneratorModal } from './AIGeneratorModal';
import { PermissionGuideModal } from './PermissionGuideModal';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  quizSets: QuizSet[];
  activeQuizId: string;
  onSelectQuiz: (id: string) => void;
  onUpdateQuizSets: (sets: QuizSet[]) => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  onLogout: () => void;
}

// Default built-in Google Apps Script Web App URL from teacher / admin (Bu Melisa - SDN 2 Jeli)
export const DEFAULT_BACKEND_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj/exec';
export const DEFAULT_DEPLOYMENT_ID =
  'AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  quizSets,
  activeQuizId,
  onSelectQuiz,
  onUpdateQuizSets,
  settings,
  onUpdateSettings,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'new-question' | 'settings' | 'spreadsheet'>('questions');
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  // New question form state
  const [newText, setNewText] = useState<string>('');
  const [newIsCorrect, setNewIsCorrect] = useState<boolean>(true);
  const [newExplanation, setNewExplanation] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState<string>('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Excel import / export notification
  const [excelStatusMessage, setExcelStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Google Spreadsheet & Apps Script Database state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('smart_jump_spreadsheet_url') || DEFAULT_BACKEND_SCRIPT_URL;
  });
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('smart_jump_auto_sync') !== 'false';
  });
  const [autoSyncOnEdit, setAutoSyncOnEdit] = useState<boolean>(() => {
    return localStorage.getItem('smart_jump_auto_sync_on_edit') !== 'false';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [spreadsheetStatus, setSpreadsheetStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => {
    return localStorage.getItem('smart_jump_last_synced') || '';
  });
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // New Quiz Set form state
  const [showCreateQuiz, setShowCreateQuiz] = useState<boolean>(false);
  const [newQuizTitle, setNewQuizTitle] = useState<string>('');
  const [newQuizDesc, setNewQuizDesc] = useState<string>('');

  if (!isOpen) return null;

  const activeQuiz = quizSets.find((q) => q.id === activeQuizId) || quizSets[0];

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !activeQuiz) return;

    let updatedQuestions: Question[] = [];
    if (editingId) {
      // Update
      updatedQuestions = activeQuiz.questions.map((q) =>
        q.id === editingId
          ? {
              ...q,
              text: newText,
              isCorrect: newIsCorrect,
              explanation: newExplanation,
              category: newCategory || activeQuiz.category,
            }
          : q
      );
      setEditingId(null);
    } else {
      // Add new
      const newQ: Question = {
        id: `q_custom_${Date.now()}`,
        text: newText,
        isCorrect: newIsCorrect,
        explanation: newExplanation || (newIsCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
        category: newCategory || activeQuiz.category,
      };
      updatedQuestions = [...activeQuiz.questions, newQ];
    }

    const updatedSets = quizSets.map((set) =>
      set.id === activeQuiz.id ? { ...set, questions: updatedQuestions } : set
    );
    onUpdateQuizSets(updatedSets);

    // Auto-sync to spreadsheet if Apps Script Web App URL is connected
    if (autoSyncOnEdit && spreadsheetUrl.trim().includes('script.google.com')) {
      handlePushToSpreadsheet(updatedSets);
    }

    // Reset form
    setNewText('');
    setNewExplanation('');
    setNewCategory('');
    setNewIsCorrect(true);
    setActiveTab('questions');
  };

  const handleEditClick = (q: Question) => {
    setEditingId(q.id);
    setNewText(q.text);
    setNewIsCorrect(q.isCorrect);
    setNewExplanation(q.explanation);
    setNewCategory(q.category || '');
    setActiveTab('new-question');
  };

  const handleDeleteQuestion = (id: string) => {
    if (!activeQuiz) return;
    const filtered = activeQuiz.questions.filter((q) => q.id !== id);
    const updatedSets = quizSets.map((set) =>
      set.id === activeQuiz.id ? { ...set, questions: filtered } : set
    );
    onUpdateQuizSets(updatedSets);

    if (autoSyncOnEdit && spreadsheetUrl.trim().includes('script.google.com')) {
      handlePushToSpreadsheet(updatedSets);
    }
  };

  const updateActiveQuizQuestions = (newQuestions: Question[]) => {
    const updatedSets = quizSets.map((set) =>
      set.id === activeQuiz.id ? { ...set, questions: newQuestions } : set
    );
    onUpdateQuizSets(updatedSets);
  };

  const handleAddAIQuestions = (aiQuestions: Question[]) => {
    if (!activeQuiz) return;
    const merged = [...activeQuiz.questions, ...aiQuestions];
    updateActiveQuizQuestions(merged);
  };

  const handleCreateNewQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;

    const newSet: QuizSet = {
      id: `quiz-set-${Date.now()}`,
      title: newQuizTitle,
      description: newQuizDesc || 'Paket soal evaluasi interaktif',
      category: 'Kustom',
      createdAt: new Date().toISOString(),
      questions: [],
    };

    const updated = [...quizSets, newSet];
    onUpdateQuizSets(updated);
    onSelectQuiz(newSet.id);
    setNewQuizTitle('');
    setNewQuizDesc('');
    setShowCreateQuiz(false);
    setActiveTab('new-question');
  };

  // Export questions to Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const rows: any[] = [];
      quizSets.forEach((set) => {
        set.questions.forEach((q, idx) => {
          rows.push({
            'No': idx + 1,
            'Paket Kuis': set.title,
            'Pernyataan Soal': q.text,
            'Kunci Jawaban': q.isCorrect ? 'BENAR' : 'SALAH',
            'Penjelasan Edukatif': q.explanation || '',
            'Kategori': q.category || set.category,
          });
        });
      });

      if (rows.length === 0) {
        setExcelStatusMessage({ type: 'error', text: 'Belum ada soal untuk diekspor.' });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 6 },  // No
        { wch: 28 }, // Paket Kuis
        { wch: 55 }, // Pernyataan Soal
        { wch: 16 }, // Kunci Jawaban
        { wch: 50 }, // Penjelasan
        { wch: 20 }, // Kategori
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bank Soal Evaluasi');
      XLSX.writeFile(workbook, `Bank_Soal_Zona_Lompat_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setExcelStatusMessage({ type: 'success', text: `Berhasil mengekspor ${rows.length} soal ke berkas Excel (.xlsx)!` });
      setTimeout(() => setExcelStatusMessage(null), 4500);
    } catch (err: any) {
      console.error(err);
      setExcelStatusMessage({ type: 'error', text: 'Gagal mengekspor berkas Excel: ' + err.message });
    }
  };

  // Download sample blank Excel template
  const handleDownloadExcelTemplate = () => {
    try {
      const sampleRows = [
        {
          'No': 1,
          'Paket Kuis': 'IPA Sains Kelas 5',
          'Pernyataan Soal': 'Tumbuhan bernapas menghirup karbondioksida pada siang hari untuk fotosintesis.',
          'Kunci Jawaban': 'BENAR',
          'Penjelasan Edukatif': 'Benar, fotosintesis menyerap CO2 dan melepaskan oksigen.',
          'Kategori': 'Biologi',
        },
        {
          'No': 2,
          'Paket Kuis': 'IPA Sains Kelas 5',
          'Pernyataan Soal': 'Paus adalah jenis ikan terbesar di samudra.',
          'Kunci Jawaban': 'SALAH',
          'Penjelasan Edukatif': 'Salah, paus adalah mamalia laut yang melahirkan dan bernapas dengan paru-paru.',
          'Kategori': 'Biologi',
        },
        {
          'No': 3,
          'Paket Kuis': 'Matematika Dasar',
          'Pernyataan Soal': 'Segitiga memiliki jumlah seluruh sudut sebesar 180 derajat.',
          'Kunci Jawaban': 'BENAR',
          'Penjelasan Edukatif': 'Benar, total sudut dalam bidang datar segitiga selalu 180°.',
          'Kategori': 'Geometri',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 55 },
        { wch: 16 },
        { wch: 50 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal');
      XLSX.writeFile(workbook, 'Template_Soal_Zona_Lompat.xlsx');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Import questions from Excel (.xlsx, .xls, .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!Array.isArray(rawJson) || rawJson.length === 0) {
          setExcelStatusMessage({ type: 'error', text: 'Berkas Excel kosong atau tidak memiliki baris data.' });
          return;
        }

        // Group questions by Paket Kuis
        const groups: { [quizTitle: string]: Question[] } = {};
        let totalImported = 0;

        rawJson.forEach((row, idx) => {
          const keys = Object.keys(row);
          const getKey = (pattern: RegExp) => {
            const found = keys.find(k => pattern.test(k.trim().toLowerCase()));
            return found ? row[found] : undefined;
          };

          const text = getKey(/pernyataan|soal|pertanyaan|statement/i);
          const ansRaw = getKey(/kunci|jawaban|answer|correct/i);
          const explanation = getKey(/penjelasan|alasan|explanation/i);
          const category = getKey(/kategori|topik|category/i);
          const quizTitleRaw = getKey(/paket kuis|paket|nama paket|materi|judul/i);

          if (text && String(text).trim().length > 0) {
            const strAns = String(ansRaw || '').trim().toUpperCase();
            const isCorrect = strAns === 'BENAR' || strAns === 'TRUE' || strAns === 'B' || strAns === '1' || strAns === 'YA';

            // Determine target quiz package title from Excel row
            const targetTitle = quizTitleRaw && String(quizTitleRaw).trim().length > 0
              ? String(quizTitleRaw).trim()
              : (activeQuiz?.title || 'Paket Kuis Impor');

            if (!groups[targetTitle]) {
              groups[targetTitle] = [];
            }

            groups[targetTitle].push({
              id: `q_excel_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
              text: String(text).trim(),
              isCorrect: isCorrect,
              explanation: explanation ? String(explanation).trim() : (isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.'),
              category: category ? String(category).trim() : targetTitle,
            });

            totalImported++;
          }
        });

        if (totalImported === 0) {
          setExcelStatusMessage({
            type: 'error',
            text: 'Tidak ditemukan kolom "Pernyataan Soal" dan "Kunci Jawaban" yang valid pada berkas Excel.',
          });
          return;
        }

        // Process groups and either update existing quiz sets or create new ones
        let currentSets = [...quizSets];
        const newSetNames: string[] = [];
        let lastTargetQuizId = activeQuiz?.id || '';

        Object.entries(groups).forEach(([title, questions]) => {
          // Check if a quiz set with the same title already exists (case-insensitive)
          const existingIndex = currentSets.findIndex(
            (s) => s.title.trim().toLowerCase() === title.toLowerCase()
          );

          if (existingIndex >= 0) {
            // Append questions to existing quiz set
            const existing = currentSets[existingIndex];
            const updated = {
              ...existing,
              questions: [...existing.questions, ...questions],
            };
            currentSets[existingIndex] = updated;
            lastTargetQuizId = existing.id;
          } else {
            // Create a brand NEW quiz set!
            const newQuizSet: QuizSet = {
              id: `quiz-set-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: title,
              description: `Paket soal baru diimpor dari berkas Excel (${questions.length} soal)`,
              category: questions[0]?.category || 'Kustom',
              createdAt: new Date().toISOString(),
              questions: questions,
            };
            currentSets.push(newQuizSet);
            newSetNames.push(title);
            lastTargetQuizId = newQuizSet.id;
          }
        });

        // Update all quiz sets in app state
        onUpdateQuizSets(currentSets);

        // Switch active quiz to the imported quiz package
        if (lastTargetQuizId) {
          onSelectQuiz(lastTargetQuizId);
        }

        // Construct descriptive success message
        let successNotice = `Berhasil mengimpor total ${totalImported} soal dari Excel!`;
        if (newSetNames.length > 0) {
          successNotice += ` Berhasil menambahkan ${newSetNames.length} paket kuis baru: "${newSetNames.join('", "')}".`;
        } else {
          successNotice += ` Soal ditambahkan ke paket kuis yang sudah ada.`;
        }

        setExcelStatusMessage({
          type: 'success',
          text: successNotice,
        });
        setTimeout(() => setExcelStatusMessage(null), 6000);
      } catch (err: any) {
        console.error(err);
        setExcelStatusMessage({ type: 'error', text: 'Gagal memproses berkas Excel: ' + err.message });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    localStorage.setItem('app_admin_password', newPassword.trim());
    setPasswordNotice('Password admin berhasil diubah!');
    setNewPassword('');
    setTimeout(() => setPasswordNotice(null), 3500);
  };

  // Google Spreadsheet synchronization handler
  const handleSyncSpreadsheet = async (customUrl?: string) => {
    const targetUrl = (customUrl || spreadsheetUrl || '').trim() || DEFAULT_BACKEND_SCRIPT_URL;

    setIsSyncing(true);
    setSpreadsheetStatus({
      type: 'info',
      text: 'Sedang menghubungkan ke Google Spreadsheet dan membaca data soal...',
    });

    try {
      const response = await fetch('/api/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyinkronkan dengan Google Spreadsheet.');
      }

      // Replace quiz sets with ONLY spreadsheet quiz sets
      const newSets: QuizSet[] = [];
      const newPackageNames: string[] = [];
      let targetActiveId = '';

      Object.entries(data.groups as { [title: string]: Question[] }).forEach(([title, questions], idx) => {
        const newSet: QuizSet = {
          id: `quiz-set-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          title: title,
          description: `Paket soal tersinkron dari Google Spreadsheet (${questions.length} soal)`,
          category: questions[0]?.category || 'Spreadsheet',
          createdAt: new Date().toISOString(),
          questions: questions,
          isFromSpreadsheet: true,
        } as any;
        newSets.push(newSet);
        newPackageNames.push(title);
        if (idx === 0) {
          targetActiveId = newSet.id;
        }
      });

      onUpdateQuizSets(newSets);
      if (targetActiveId) {
        onSelectQuiz(targetActiveId);
      }

      // Save URL and last sync timestamp
      localStorage.setItem('smart_jump_spreadsheet_url', targetUrl);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      localStorage.setItem('smart_jump_last_synced', nowStr);
      setLastSyncedAt(nowStr);

      let msg = `Berhasil menyinkronkan total ${data.totalQuestions} soal dari Google Spreadsheet!`;
      if (newPackageNames.length > 0) {
        msg += ` Ditambahkan ${newPackageNames.length} paket baru: "${newPackageNames.join('", "')}".`;
      }
      setSpreadsheetStatus({ type: 'success', text: msg });
      setTimeout(() => setSpreadsheetStatus(null), 6000);
    } catch (err: any) {
      console.error(err);
      setSpreadsheetStatus({
        type: 'error',
        text: err.message || 'Gagal membaca Google Spreadsheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeepOnlySpreadsheetQuizSets = () => {
    if (!window.confirm('Yakin ingin menghapus semua paket kuis lama/bawaan dan hanya menyisakan paket kuis dari Google Spreadsheet?')) {
      return;
    }
    const spreadsheetSets = quizSets.filter(
      (s: QuizSet) => (s as any).isFromSpreadsheet || s.description?.includes('Spreadsheet') || s.description?.includes('tersinkron')
    );
    if (spreadsheetSets.length === 0) {
      setSpreadsheetStatus({
        type: 'error',
        text: 'Belum ada paket kuis dari Google Spreadsheet. Silakan klik "Tarik & Muat Soal ke Game" terlebih dahulu.',
      });
      setTimeout(() => setSpreadsheetStatus(null), 5000);
      return;
    }
    onUpdateQuizSets(spreadsheetSets);
    onSelectQuiz(spreadsheetSets[0].id);
    setSpreadsheetStatus({
      type: 'success',
      text: `Berhasil! Semua paket lama dihapus dan kini hanya tersisa ${spreadsheetSets.length} paket kuis dari Google Spreadsheet.`,
    });
    setTimeout(() => setSpreadsheetStatus(null), 5000);
  };

  const handleCopyColumnsFormat = () => {
    const headerText = "No\tPaket Kuis\tPernyataan Soal\tKunci Jawaban\tPenjelasan Edukatif\tKategori\n1\tIPA Sains SD\tMatahari adalah bintang yang menjadi pusat tata surya.\tBENAR\tMatahari adalah bintang terdekat dari Bumi dan menjadi pusat gravitasi tata surya.\tAstronomi\n2\tIPA Sains SD\tKelelawar termasuk ke dalam kelompok burung karena dapat terbang.\tSALAH\tKelelawar adalah mamalia bersayap, berkembang biak dengan melahirkan dan menyusui.\tBiologi\n3\tMatematika Dasar\tSudut siku-siku memiliki besar 90 derajat.\tBENAR\tSudut siku-siku selalu tepat berukuran 90 derajat.\tGeometri";
    navigator.clipboard.writeText(headerText);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 3000);
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    localStorage.setItem('smart_jump_auto_sync', checked ? 'true' : 'false');
  };

  const handleToggleAutoSyncOnEdit = (checked: boolean) => {
    setAutoSyncOnEdit(checked);
    localStorage.setItem('smart_jump_auto_sync_on_edit', checked ? 'true' : 'false');
  };

  // Google Apps Script source code template for teachers
  const appsScriptCode = `/**
 * ================================================================
 * GOOGLE APPS SCRIPT - API BANK SOAL ZONA LOMPAT CERDAS
 * SDN 2 Jeli - Bu Melisa
 * ================================================================
 * 
 * CARA MEMASANG (HANYA 1 MENIT):
 * 1. Di Google Sheets, buka menu: Ekstensi > Apps Script
 * 2. Hapus semua teks bawaan, lalu Tempel (Ctrl + V) seluruh kode ini.
 * 3. Klik tombol biru "Deploy" (Terapkan) di kanan atas > "Deployment baru".
 * 4. Klik ikon gerigi (Pilih jenis) > pilih "Aplikasi Web" (Web app).
 * 5. Deskripsi: API Bank Soal Zona Lompat
 * 6. Jalankan sebagai: "Saya" (email Anda)
 * 7. Siapa yang memiliki akses: "Siapa saja" (Anyone) -> PENTING!
 * 8. Klik "Terapkan" (Deploy) & berikan izin akses Google Anda.
 * 9. Salin URL Aplikasi Web (berakhiran /exec) dan tempel ke game evaluasi!
 */

// 1. GET: Dipanggil otomatis oleh game saat dibuka untuk memuat semua soal
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      totalQuestions: 0,
      rows: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r[1] && !r[2]) continue; // lewati baris kosong
    
    var quizTitle = String(r[1] || 'Bank Soal Spreadsheet').trim();
    var questionText = String(r[2] || '').trim();
    var rawAnswer = String(r[3] || '').trim().toUpperCase();
    var isCorrect = rawAnswer === 'BENAR' || rawAnswer === 'TRUE' || rawAnswer === '1' || rawAnswer === 'YA' || r[3] === true;
    var explanation = String(r[4] || (isCorrect ? 'Pernyataan ini benar.' : 'Pernyataan ini keliru.')).trim();
    var category = String(r[5] || quizTitle).trim();
    var id = String(r[0] || ('q_' + i + '_' + new Date().getTime()));
    
    if (questionText.length > 0) {
      rows.push({
        id: id,
        quizTitle: quizTitle,
        text: questionText,
        isCorrect: isCorrect,
        explanation: explanation,
        category: category
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    totalQuestions: rows.length,
    rows: rows
  })).setMimeType(ContentService.MimeType.JSON);
}

// 2. POST: Dipanggil oleh game untuk menyimpan atau mengedit soal langsung ke Spreadsheet
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = contents.action || 'saveAll';
    
    // Simpan semua paket kuis dari game ke spreadsheet
    if (action === 'saveAll' && contents.quizSets) {
      sheet.clear();
      var headers = ['ID Soal', 'Paket Kuis', 'Pernyataan Soal', 'Kunci Jawaban', 'Penjelasan Edukatif', 'Kategori'];
      var rows = [headers];
      
      contents.quizSets.forEach(function(set) {
        (set.questions || []).forEach(function(q) {
          rows.push([
            q.id || ('q_' + new Date().getTime()),
            set.title || 'Umum',
            q.text || '',
            q.isCorrect ? 'BENAR' : 'SALAH',
            q.explanation || '',
            q.category || set.category || set.title
          ]);
        });
      });
      
      if (rows.length > 1) {
        sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
        var headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#1E293B');
        headerRange.setFontColor('#FFFFFF');
        sheet.autoResizeColumns(1, headers.length);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Berhasil menyimpan ' + (rows.length - 1) + ' soal ke Google Spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Tambah 1 soal baru ke baris paling bawah
    if (action === 'addQuestion' && contents.question) {
      var q = contents.question;
      var title = contents.quizTitle || 'Umum';
      sheet.appendRow([
        q.id || ('q_' + new Date().getTime()),
        title,
        q.text,
        q.isCorrect ? 'BENAR' : 'SALAH',
        q.explanation || '',
        q.category || title
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Soal berhasil ditambahkan ke spreadsheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Aksi tidak dikenali: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3500);
  };

  // Push / Save all quiz questions to Google Spreadsheet via Apps Script Web App
  const handlePushToSpreadsheet = async (overrideSets?: QuizSet[]) => {
    const targetUrl = spreadsheetUrl.trim() || DEFAULT_BACKEND_SCRIPT_URL;

    if (!targetUrl.includes('script.google.com')) {
      setSpreadsheetStatus({
        type: 'error',
        text: 'Untuk menyimpan langsung ke Spreadsheet dari aplikasi, gunakan tautan Web App Google Apps Script (berakhiran /exec). Salin kodenya pada panduan di bawah.',
      });
      return;
    }

    const setsToPush = overrideSets || quizSets;
    setIsPushing(true);
    setSpreadsheetStatus({
      type: 'info',
      text: 'Menyimpan seluruh bank soal ke Google Spreadsheet...',
    });

    try {
      const response = await fetch('/api/save-to-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl: targetUrl,
          action: 'saveAll',
          quizSets: setsToPush,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan ke Google Spreadsheet.');
      }

      const totalQ = setsToPush.reduce((acc, s) => acc + s.questions.length, 0);
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setLastSyncedAt(nowStr);
      localStorage.setItem('smart_jump_last_synced', nowStr);

      setSpreadsheetStatus({
        type: 'success',
        text: `✅ Berhasil menyimpan ${totalQ} soal ke Google Spreadsheet (${nowStr})!`,
      });
      setTimeout(() => setSpreadsheetStatus(null), 6000);
    } catch (err: any) {
      console.error(err);
      setSpreadsheetStatus({
        type: 'error',
        text: err.message || 'Gagal menyimpan ke Google Spreadsheet.',
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-heading">
                  Kelola Evaluasi & Bank Soal
                </h2>
                <p className="text-xs text-slate-400">
                  Buat soal, gunakan AI generator, atau hubungkan ke Google Spreadsheet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 text-xs text-rose-300 hover:text-white hover:bg-rose-950/60 rounded-lg border border-rose-500/30 transition-colors"
              >
                Logout Admin
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Bar & Quiz Selector */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
            {/* Quiz Set Dropdown / Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Paket Kuis:</span>
              <select
                value={activeQuiz?.id || ''}
                onChange={(e) => onSelectQuiz(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs font-medium rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none"
              >
                {quizSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.title} ({set.questions.length} soal)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowCreateQuiz(!showCreateQuiz)}
                className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/30"
                title="Buat Paket Kuis Baru"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'questions'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Daftar Soal ({activeQuiz?.questions.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewText('');
                  setNewExplanation('');
                  setActiveTab('new-question');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'new-question'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingId ? 'Edit Soal' : 'Tambah Soal Manual'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('spreadsheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'spreadsheet'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Database Spreadsheet & Script</span>
                {lastSyncedAt && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Setelan Game
              </button>
            </div>
          </div>

          {/* New Quiz Modal Inline Form */}
          {showCreateQuiz && (
            <form onSubmit={handleCreateNewQuiz} className="bg-indigo-950/40 p-4 border-b border-indigo-500/30 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Judul Paket Kuis Baru (cth: IPA Kelas 6 SD)"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                required
                className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-lg text-xs text-white"
              />
              <input
                type="text"
                placeholder="Deskripsi singkat..."
                value={newQuizDesc}
                onChange={(e) => setNewQuizDesc(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-lg text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg"
              >
                Simpan Paket
              </button>
              <button
                type="button"
                onClick={() => setShowCreateQuiz(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
            </form>
          )}

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* TAB 1: LIST QUESTIONS */}
            {activeTab === 'questions' && (
              <div className="space-y-4">
                {/* AI Banner Callout */}
                <div className="bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">
                        Generate Otomatis Soal dengan AI Gemini
                      </h4>
                      <p className="text-xs text-slate-300">
                        Buat pernyataan Benar/Salah secara instan untuk berbagai tema & kurikulum sekolah.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAIModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate AI Sekarang</span>
                  </button>
                </div>

                {/* Quick Spreadsheet Sync Bar if URL exists */}
                {spreadsheetUrl && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-emerald-200 font-semibold">
                          Tersambung ke Google Spreadsheet
                        </span>
                        {lastSyncedAt && (
                          <span className="text-slate-400 text-[11px] ml-2">
                            (Terakhir disinkron: {lastSyncedAt})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => handleSyncSpreadsheet()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Tarik data soal terbaru dari Google Spreadsheet"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Menarik...' : 'Tarik Soal'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isPushing}
                        onClick={() => handlePushToSpreadsheet()}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Kirim dan simpan semua soal aplikasi ke Google Spreadsheet"
                      >
                        <UploadCloud className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                        <span>{isPushing ? 'Menyimpan...' : 'Simpan ke Spreadsheet'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('spreadsheet')}
                        className="px-2.5 py-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        Kelola
                      </button>
                    </div>
                  </div>
                )}

                {/* Question List */}
                <div className="space-y-2.5">
                  {activeQuiz.questions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <p className="text-sm mb-3">Paket kuis ini belum memiliki soal.</p>
                      <button
                        type="button"
                        onClick={() => setIsAIModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                      >
                        Generate dengan AI
                      </button>
                    </div>
                  ) : (
                    activeQuiz.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {q.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  q.isCorrect
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {q.isCorrect ? 'KUNCI: BENAR' : 'KUNCI: SALAH'}
                              </span>
                              {q.explanation && (
                                <span className="text-xs text-slate-400 line-clamp-1">
                                  {q.explanation}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditClick(q)}
                            title="Edit Soal"
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Hapus Soal"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ADD / EDIT QUESTION MANUAL */}
            {activeTab === 'new-question' && (
              <form onSubmit={handleSaveQuestion} className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-heading">
                    {editingId ? 'Edit Pernyataan Soal' : 'Tambah Pernyataan Baru'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('questions')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Kembali ke Daftar
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Teks Pernyataan (Dibaca Siswa)
                  </label>
                  <textarea
                    rows={3}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Contoh: Mamalia adalah hewan berdarah panas yang bernapas dengan paru-paru."
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                {/* KUNCI JAWABAN BENAR / SALAH SELECTOR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Kunci Jawaban yang Benar
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewIsCorrect(true)}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                        newIsCorrect
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Check className="w-5 h-5 text-emerald-400" />
                      <span>BENAR (Sisi Kiri)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewIsCorrect(false)}
                      className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                        !newIsCorrect
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300 ring-2 ring-rose-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <X className="w-5 h-5 text-rose-400" />
                      <span>SALAH (Sisi Kanan)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Penjelasan Singkat (Ditampilkan Saat Reveal)
                  </label>
                  <textarea
                    rows={2}
                    value={newExplanation}
                    onChange={(e) => setNewExplanation(e.target.value)}
                    placeholder="Contoh: Benar, sebagian besar mamalia berdarah panas dan menyusui anaknya."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kategori / Topik
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Contoh: Biologi, Geografi, Matematika..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    {spreadsheetUrl && spreadsheetUrl.includes('script.google.com') ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Apps Script Terhubung: Perubahan otomatis tersimpan ke Spreadsheet di cloud</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        * Hubungkan Google Apps Script di tab Spreadsheet untuk sinkronisasi otomatis ke cloud.
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('questions')}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingId ? 'Simpan Perubahan' : 'Tambahkan Soal'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 3: GOOGLE SPREADSHEET & APPS SCRIPT DATABASE */}
            {activeTab === 'spreadsheet' && (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Feature Banner */}
                <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/40 to-slate-950/70 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-heading flex flex-wrap items-center gap-2">
                        <span>Google Spreadsheet & Script sebagai Database Bank Soal</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase tracking-wide">
                          Dua Arah (Two-Way)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Anda dapat menambah dan mengedit soal langsung di <strong>Google Spreadsheet</strong> (lewat laptop/HP) ATAU langsung di <strong>aplikasi game ini</strong>. Kedua data saling tersinkronisasi secara otomatis di cloud Google Spreadsheet Anda!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connection Box */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                  {/* Built-in Backend Connection Banner */}
                  <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-xs font-bold text-emerald-300">
                          Backend Script Terpasang Otomatis (SDN 2 Jeli - Bu Melisa)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono">
                        ID Penerapan: <span className="text-amber-300 font-semibold">{DEFAULT_DEPLOYMENT_ID}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Link Apps Script sudah ditanam di backend sistem, jadi Anda tidak perlu mengetik link lagi!
                      </p>
                    </div>
                    {spreadsheetUrl !== DEFAULT_BACKEND_SCRIPT_URL && (
                      <button
                        type="button"
                        onClick={() => {
                          setSpreadsheetUrl(DEFAULT_BACKEND_SCRIPT_URL);
                          localStorage.setItem('smart_jump_spreadsheet_url', DEFAULT_BACKEND_SCRIPT_URL);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700 shrink-0"
                      >
                        Reset ke Link Bawaan Backend
                      </button>
                    )}
                  </div>

                  {/* Important Google Permission Tip */}
                  <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs space-y-2">
                    <div className="font-bold flex items-center justify-between gap-1.5 text-amber-300">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>Pengaturan Akses Google Apps Script (Wajib &quot;Siapa saja / Anyone&quot;)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsGuideModalOpen(true)}
                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-md transition-colors shrink-0"
                      >
                        Buka Panduan
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      Jika game menampilkan pesan izin saat memuat soal: Di Google Sheets &gt; <strong>Ekstensi &gt; Apps Script</strong> &gt; klik <strong>Kelola penerapan (Manage deployments)</strong> &gt; klik ikon <strong>Pensil (Edit)</strong> &gt; di kolom <strong>&quot;Yang memiliki akses&quot; (Who has access)</strong> pastikan dipilih <strong>&quot;Siapa saja&quot; (Anyone)</strong> &gt; klik <strong>Terapkan</strong>.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsGuideModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>💡 Lihat Panduan Langkah Bergambar</span>
                      </button>
                      <a
                        href="https://script.google.com/macros/edit?lib=1ze_zo31ylaLLIaDGaiJANYgHcruKn0WvRuORDIzTexgO7GEl8cJfINsb"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-200 font-medium text-xs rounded-xl border border-amber-500/30 transition-colors flex items-center gap-1"
                      >
                        <span>Buka Script Langsung</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <h4 className="text-xs font-bold text-white font-heading flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Tautan Web App Script Aktif</span>
                    </h4>
                    {spreadsheetUrl && (
                      <a
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
                      >
                        <span>Buka Tautan</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="url"
                      placeholder="Contoh: https://script.google.com/macros/s/.../exec atau URL Google Sheets"
                      value={spreadsheetUrl}
                      onChange={(e) => setSpreadsheetUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />

                    {/* Action Buttons: Pull and Push */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={() => handleSyncSpreadsheet()}
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                        title="Tarik data soal paling baru dari Google Spreadsheet ke dalam aplikasi game"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Sedang Menarik Soal...' : '🔄 Tarik & Muat Soal ke Game'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isPushing}
                        onClick={() => handlePushToSpreadsheet()}
                        className="flex-1 px-4 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-700/30 transition-all active:scale-95"
                        title="Kirim dan simpan semua soal aplikasi ke dalam Google Spreadsheet"
                      >
                        <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
                        <span>{isPushing ? 'Sedang Menyimpan...' : '📤 Simpan Semua ke Spreadsheet'}</span>
                      </button>
                    </div>

                    {/* Delete Non-Spreadsheet Quiz Sets Button */}
                    <button
                      type="button"
                      onClick={handleKeepOnlySpreadsheetQuizSets}
                      className="w-full px-4 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition-all active:scale-95"
                      title="Hapus semua paket kuis lama atau bawaan dan hanya menyisakan paket kuis dari Google Spreadsheet"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      <span>🗑️ Hapus Paket Lama & Hanya Sisakan dari Spreadsheet</span>
                    </button>

                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>
                        Sistem otomatis menghubungkan ke backend Apps Script Bu Melisa untuk membaca dan menyimpan bank soal.
                      </span>
                    </p>
                  </div>

                  {/* Status Notification Message */}
                  {spreadsheetStatus && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
                        spreadsheetStatus.type === 'success'
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                          : spreadsheetStatus.type === 'error'
                          ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                          : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {spreadsheetStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : spreadsheetStatus.type === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-spin" />
                        )}
                        <span className="leading-relaxed">{spreadsheetStatus.text}</span>
                      </div>

                      {spreadsheetStatus.type === 'error' && (
                        <div className="pt-1 flex items-center gap-2 border-t border-rose-800/50">
                          <button
                            type="button"
                            onClick={() => setIsGuideModalOpen(true)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-transform active:scale-95"
                          >
                            💡 Panduan Cara Memperbaiki Izin
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-Sync Toggles & Last Status */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span><strong>Otomatis muat soal dari Google Spreadsheet saat game pertama kali dibuka</strong> (selalu membaca paket soal terbaru)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSyncOnEdit}
                        onChange={(e) => handleToggleAutoSyncOnEdit(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-teal-600 focus:ring-teal-500"
                      />
                      <span><strong>Otomatis simpan ke Google Spreadsheet</strong> saat guru menambah, mengedit, atau menghapus soal di aplikasi</span>
                    </label>

                    {lastSyncedAt && (
                      <div className="pt-1 text-[11px] text-slate-400">
                        Status sinkronisasi terakhir: <strong className="text-emerald-400">{lastSyncedAt}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Google Apps Script Ready-to-Use Code & Guide */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-indigo-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-indigo-400" />
                        <span>Kode Script Google Sheets (Google Apps Script)</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Pasang script ini di spreadsheet agar spreadsheet bisa dibaca otomatis saat game dibuka dan bisa menyimpan soal dari aplikasi.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyScriptCode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                    >
                      {copiedScript ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-300" />
                          <span className="text-emerald-200">Kode Berhasil Disalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin Kode Script Google Sheets</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code snippet display */}
                  <div className="relative">
                    <pre className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed select-all">
                      {appsScriptCode}
                    </pre>
                  </div>

                  {/* Step-by-Step Practical Guide */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cara Memasang Script di Google Spreadsheet (Hanya 1 Menit)</span>
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-indigo-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">1</span>
                          <span>Buka Google Sheets</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Buka Google Spreadsheet baru atau gunakan file yang sudah ada di akun Google Anda.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-indigo-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">2</span>
                          <span>Buka Menu Apps Script</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Pada menu atas Google Sheets, klik menu <strong>Ekstensi</strong> &gt; pilih <strong>Apps Script</strong>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-indigo-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs">3</span>
                          <span>Tempel Kode Script</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Hapus tulisan bawaan di editor, lalu tekan <strong>Ctrl + V</strong> untuk menempelkan kode script yang sudah Anda salin di atas.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs">4</span>
                          <span>Klik Deploy (Terapkan)</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Klik tombol biru <strong>Deploy (Terapkan)</strong> di pojok kanan atas &gt; pilih <strong>Deployment baru (New deployment)</strong>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                          <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs">5</span>
                          <span>Pilih "Aplikasi Web" & Akses "Siapa Saja"</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Klik ikon roda gigi &gt; pilih <strong>Aplikasi Web</strong>. Pada <em>Who has access</em>, pilih <strong>"Siapa saja" (Anyone)</strong> agar game dapat membaca &amp; menyimpan data.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-emerald-300">
                          <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs">6</span>
                          <span>Salin URL &amp; Tempel di Aplikasi</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed">
                          Klik <strong>Deploy</strong>, setujui izin akun Google, salin <strong>URL Aplikasi Web (akhiran /exec)</strong>, lalu tempel ke kolom di atas. Selesai!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Format & Quick Action Buttons */}
                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                        <Table className="w-4 h-4 text-indigo-400" />
                        <span>Format Susunan Kolom di Spreadsheet</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Susun baris pertama pada Google Sheets Anda sesuai nama-nama kolom berikut (atau biarkan script yang menyusunnya otomatis saat Anda klik Simpan Semua ke Spreadsheet):
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyColumnsFormat}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                        title="Salin baris header dan contoh soal ke clipboard untuk di-paste langsung di Google Sheets"
                      >
                        {copiedFormat ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Format Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Salin Format Header</span>
                          </>
                        )}
                      </button>

                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold rounded-lg border border-indigo-500/40 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buat Sheets Baru ↗</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleDownloadExcelTemplate}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-700/80 flex items-center gap-1.5 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Unduh Template (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Visual Table Preview */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 font-semibold">
                          <th className="py-2.5 px-3 w-12">No</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Paket Kuis</th>
                          <th className="py-2.5 px-3 min-w-[220px]">Pernyataan Soal</th>
                          <th className="py-2.5 px-3 min-w-[110px]">Kunci Jawaban</th>
                          <th className="py-2.5 px-3 min-w-[180px]">Penjelasan Edukatif</th>
                          <th className="py-2.5 px-3 min-w-[100px]">Kategori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400 font-mono">1</td>
                          <td className="py-2 px-3 font-medium text-indigo-300">IPA Sains SD</td>
                          <td className="py-2 px-3 text-slate-100 font-medium">Matahari adalah bintang yang menjadi pusat tata surya.</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
                              BENAR
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">Matahari adalah bintang terdekat dari Bumi.</td>
                          <td className="py-2 px-3 text-slate-400">Astronomi</td>
                        </tr>
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400 font-mono">2</td>
                          <td className="py-2 px-3 font-medium text-indigo-300">IPA Sains SD</td>
                          <td className="py-2 px-3 text-slate-100 font-medium">Kelelawar termasuk kelompok burung karena dapat terbang.</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/30">
                              SALAH
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">Kelelawar adalah mamalia, berkembang biak dengan melahirkan.</td>
                          <td className="py-2 px-3 text-slate-400">Biologi</td>
                        </tr>
                        <tr className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400 font-mono">3</td>
                          <td className="py-2 px-3 font-medium text-indigo-300">Matematika Dasar</td>
                          <td className="py-2 px-3 text-slate-100 font-medium">Sudut siku-siku memiliki besar 90 derajat.</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
                              BENAR
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">Sudut siku-siku selalu tepat 90 derajat.</td>
                          <td className="py-2 px-3 text-slate-400">Geometri</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    * Catatan Kunci Jawaban: Dapat ditulis <strong>BENAR</strong> / <strong>SALAH</strong> (atau TRUE / FALSE).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS & BACKUP */}
            {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Timer Configuration */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4">
                  <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Durasi Timer Kuis</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Waktu Baca & Berpikir di Tengah
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={5}
                          max={30}
                          value={settings.readingTime}
                          onChange={(e) =>
                            onUpdateSettings({ ...settings, readingTime: Number(e.target.value) || 10 })
                          }
                          className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                        <span className="text-xs text-slate-400">detik (Default: 10 detik)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Waktu Aksi Lompat
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={2}
                          max={10}
                          value={settings.jumpingTime}
                          onChange={(e) =>
                            onUpdateSettings({ ...settings, jumpingTime: Number(e.target.value) || 3 })
                          }
                          className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                        <span className="text-xs text-slate-400">detik (Default: 3 detik)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Admin Password */}
                <form onSubmit={handleSavePassword} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-sm font-bold text-white font-heading flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Ubah Password Admin</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ganti password login admin untuk memproteksi akses pengelolaan kuis.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Password baru..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newPassword.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                    >
                      Perbarui Password
                    </button>
                  </div>
                  {passwordNotice && (
                    <div className="text-xs text-emerald-400 font-medium">
                      {passwordNotice}
                    </div>
                  )}
                </form>

                {/* Excel Backup & Import */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-heading">
                        Ekspor & Impor Bank Soal (Microsoft Excel)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Kelola seluruh soal dalam format Excel (.xlsx / .csv) agar mudah diedit di komputer atau ponsel.
                      </p>
                    </div>
                  </div>

                  {excelStatusMessage && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        excelStatusMessage.type === 'success'
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {excelStatusMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{excelStatusMessage.text}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {/* Export to Excel */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Ekspor Soal ke Excel (.xlsx)</span>
                    </button>

                    {/* Import from Excel */}
                    <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Impor dari Excel (.xlsx / .csv)</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleImportExcel}
                        className="hidden"
                      />
                    </label>

                    {/* Download Sample Template */}
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl flex items-center gap-2 border border-slate-700/80 transition-colors"
                      title="Unduh contoh template kolom Excel"
                    >
                      <FileDown className="w-4 h-4 text-amber-400" />
                      <span>Unduh Template Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddQuestions={handleAddAIQuestions}
      />

      {/* Permission Guide Modal */}
      <PermissionGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onRetrySync={() => handleSyncSpreadsheet()}
        isRetrying={isSyncing}
      />
    </>
  );
};
