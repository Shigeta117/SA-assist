import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Pencil, X, Check, Download, Upload, AlertCircle } from 'lucide-react';
import type { TeacherEntry } from './types';

interface Props {
  teachers: TeacherEntry[];
  onUpdate: (teachers: TeacherEntry[]) => void;
}

interface FormData {
  kanji: string;
  reading: string;
  wrongReadings: string[];
}

const emptyForm: FormData = { kanji: '', reading: '', wrongReadings: [''] };

export default function TeacherConsole({ teachers, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [importError, setImportError] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ ...emptyForm, wrongReadings: [''] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    const kanji = form.kanji.trim();
    const reading = form.reading.trim();
    const wrongReadings = form.wrongReadings
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (!kanji || !reading || wrongReadings.length === 0) return;

    if (editingId) {
      // Update existing
      onUpdate(teachers.map(t =>
        t.id === editingId ? { ...t, kanji, reading, wrongReadings } : t
      ));
    } else {
      // Add new
      const newEntry: TeacherEntry = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        kanji,
        reading,
        wrongReadings,
      };
      onUpdate([...teachers, newEntry]);
    }
    resetForm();
  };

  const handleEdit = (teacher: TeacherEntry) => {
    setForm({
      kanji: teacher.kanji,
      reading: teacher.reading,
      wrongReadings: teacher.wrongReadings.length > 0 ? [...teacher.wrongReadings] : [''],
    });
    setEditingId(teacher.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    onUpdate(teachers.filter(t => t.id !== id));
  };

  const addWrongReading = () => {
    if (form.wrongReadings.length < 5) {
      setForm(prev => ({ ...prev, wrongReadings: [...prev.wrongReadings, ''] }));
    }
  };

  const removeWrongReading = (idx: number) => {
    if (form.wrongReadings.length > 1) {
      setForm(prev => ({
        ...prev,
        wrongReadings: prev.wrongReadings.filter((_, i) => i !== idx),
      }));
    }
  };

  const updateWrongReading = (idx: number, value: string) => {
    setForm(prev => ({
      ...prev,
      wrongReadings: prev.wrongReadings.map((w, i) => (i === idx ? value : w)),
    }));
  };

  // Export teachers as JSON
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(teachers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `namecheck-teachers-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import teachers from JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!Array.isArray(data)) throw new Error('Invalid format');
          // Validate structure
          const valid = data.every(
            (item: any) =>
              typeof item.kanji === 'string' &&
              typeof item.reading === 'string' &&
              Array.isArray(item.wrongReadings)
          );
          if (!valid) throw new Error('Invalid data structure');
          // Assign new IDs to avoid conflicts
          const imported: TeacherEntry[] = data.map((item: any) => ({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            kanji: item.kanji,
            reading: item.reading,
            wrongReadings: item.wrongReadings,
          }));
          onUpdate([...teachers, ...imported]);
          setImportError(null);
        } catch {
          setImportError('JSONファイルの形式が正しくありません。');
          setTimeout(() => setImportError(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const isFormValid =
    form.kanji.trim() &&
    form.reading.trim() &&
    form.wrongReadings.some(w => w.trim().length > 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-none px-6 py-4 flex items-center justify-between gap-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            登録数: <span className="font-bold text-violet-600">{teachers.length}</span>件
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="flex items-center space-x-1.5 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>インポート</span>
          </button>
          <button
            onClick={handleExport}
            disabled={teachers.length === 0}
            className="flex items-center space-x-1.5 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>エクスポート</span>
          </button>
          <button
            onClick={() => {
              if (!showForm) {
                setForm({ ...emptyForm, wrongReadings: [''] });
                setEditingId(null);
              }
              setShowForm(!showForm);
            }}
            className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? '閉じる' : '新規追加'}</span>
          </button>
        </div>
      </div>

      {/* Import error */}
      <AnimatePresence>
        {importError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-none px-6 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-600 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {importError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden"
          >
            <div className="px-6 py-5 bg-violet-50/50 border-b border-violet-100">
              <div className="max-w-3xl mx-auto space-y-4">
                <h3 className="text-base font-bold text-violet-800">
                  {editingId ? '先生データを編集' : '新しい先生を追加'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Kanji */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      漢字（名字）
                    </label>
                    <input
                      type="text"
                      value={form.kanji}
                      onChange={e => setForm(prev => ({ ...prev, kanji: e.target.value }))}
                      placeholder="例: 東海林"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow"
                    />
                  </div>

                  {/* Reading */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      正しい読み方
                    </label>
                    <input
                      type="text"
                      value={form.reading}
                      onChange={e => setForm(prev => ({ ...prev, reading: e.target.value }))}
                      placeholder="例: しょうじ"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow"
                    />
                  </div>
                </div>

                {/* Wrong readings */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      誤答選択肢（1〜5つ）
                    </label>
                    <button
                      onClick={addWrongReading}
                      disabled={form.wrongReadings.length >= 5}
                      className="text-violet-600 hover:bg-violet-100 p-1 rounded text-sm flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5 mr-0.5" /> 追加
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.wrongReadings.map((wr, idx) => (
                      <div key={idx} className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-violet-500">
                        <input
                          type="text"
                          value={wr}
                          onChange={e => updateWrongReading(idx, e.target.value)}
                          placeholder={`誤答 ${idx + 1}`}
                          className="bg-transparent border-none px-3 py-2 text-base focus:ring-0 w-32 outline-none"
                        />
                        {form.wrongReadings.length > 1 && (
                          <button
                            onClick={() => removeWrongReading(idx)}
                            className="px-2 py-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid}
                    className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingId ? '更新' : '追加'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher List */}
      <div className="flex-1 overflow-y-auto p-6">
        {teachers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center">
              <Plus className="w-8 h-8 text-violet-300" />
            </div>
            <p className="text-base">先生データがまだ登録されていません</p>
            <p className="text-sm">「新規追加」ボタンから登録を開始してください</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-3">
              {teachers.map((teacher, idx) => (
                <motion.div
                  key={teacher.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow group"
                >
                  {/* Number badge */}
                  <div className="flex-none w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>

                  {/* Name info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-bold text-gray-800">{teacher.kanji}</span>
                      <span className="text-base text-violet-600 font-medium">({teacher.reading})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {teacher.wrongReadings.map((wr, i) => (
                        <span
                          key={i}
                          className="inline-block text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100"
                        >
                          ✕ {wr}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
