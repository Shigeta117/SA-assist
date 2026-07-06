import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpenCheck, Settings2 } from 'lucide-react';
import TeacherConsole from './TeacherConsole';
import QuizScreen from './QuizScreen';
import type { TeacherEntry } from './types';

const STORAGE_KEY = 'sa-assist-namecheck-teachers';

function loadTeachers(): TeacherEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load teachers from localStorage:', e);
  }
  return [];
}

function saveTeachers(teachers: TeacherEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
  } catch (e) {
    console.error('Failed to save teachers to localStorage:', e);
  }
}

type Mode = 'console' | 'quiz';

export default function NameCheck() {
  const [mode, setMode] = useState<Mode>('console');
  const [teachers, setTeachers] = useState<TeacherEntry[]>(() => loadTeachers());

  // Save to localStorage whenever teachers change
  useEffect(() => {
    saveTeachers(teachers);
  }, [teachers]);

  const updateTeachers = useCallback((newTeachers: TeacherEntry[]) => {
    setTeachers(newTeachers);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center pl-16">
        <h1 className="text-2xl font-bold text-gray-800">先生の名前 読み方チェック</h1>
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('console')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'console'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>管理</span>
          </button>
          <button
            onClick={() => setMode('quiz')}
            disabled={teachers.length === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              mode === 'quiz'
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <BookOpenCheck className="w-4 h-4" />
            <span>テスト</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {mode === 'console' ? (
            <motion.div
              key="console"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <TeacherConsole
                teachers={teachers}
                onUpdate={updateTeachers}
              />
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <QuizScreen teachers={teachers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
