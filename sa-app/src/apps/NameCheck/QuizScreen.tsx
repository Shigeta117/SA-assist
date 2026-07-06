import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, ChevronRight, Trophy, XCircle, CheckCircle2 } from 'lucide-react';
import type { TeacherEntry, QuizQuestion, QuizResult, QuizMode } from './types';

interface Props {
  teachers: TeacherEntry[];
}

/** Shuffle an array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build quiz questions from teacher data */
function buildQuestions(teachers: TeacherEntry[], count: number): QuizQuestion[] {
  // Shuffle and take 'count' teachers
  const selected = shuffle(teachers).slice(0, count);

  // Collect all readings for filler choices
  const allReadings = teachers.map(t => t.reading);

  return selected.map(teacher => {
    // Start with the teacher's own wrong readings
    let wrongs = shuffle(teacher.wrongReadings);

    // If we need more to fill 4 choices, borrow from other teachers' readings
    if (wrongs.length < 3) {
      const fillers = shuffle(
        allReadings.filter(r => r !== teacher.reading && !wrongs.includes(r))
      );
      wrongs = [...wrongs, ...fillers].slice(0, 3);
    } else {
      wrongs = wrongs.slice(0, 3);
    }

    // Build choices: correct + 3 wrongs
    const choices = shuffle([teacher.reading, ...wrongs]);
    const correctIndex = choices.indexOf(teacher.reading);

    return { teacher, choices, correctIndex };
  });
}

const QUESTION_COUNTS = [5, 10, 20] as const;

export default function QuizScreen({ teachers }: Props) {
  const [mode, setMode] = useState<QuizMode>('setup');
  const [questionCount, setQuestionCount] = useState(5);
  const [customCount, setCustomCount] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const maxCount = teachers.length;

  const startQuiz = useCallback((count: number) => {
    const clamped = Math.min(Math.max(1, count), maxCount);
    const qs = buildQuestions(teachers, clamped);
    setQuestions(qs);
    setCurrentIndex(0);
    setResults([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setMode('playing');
  }, [teachers, maxCount]);

  const handleAnswer = useCallback((choiceIndex: number) => {
    if (showFeedback) return; // Prevent double-click

    const question = questions[currentIndex];
    const isCorrect = choiceIndex === question.correctIndex;

    setSelectedAnswer(choiceIndex);
    setShowFeedback(true);
    setResults(prev => [...prev, { question, selectedIndex: choiceIndex, isCorrect }]);

    // Auto advance after delay
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        setMode('result');
      }
    }, 1200);
  }, [currentIndex, questions, showFeedback]);

  const correctCount = useMemo(() => results.filter(r => r.isCorrect).length, [results]);
  const wrongResults = useMemo(() => results.filter(r => !r.isCorrect), [results]);

  const resetQuiz = () => {
    setMode('setup');
    setQuestions([]);
    setResults([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  // --- SETUP SCREEN ---
  if (mode === 'setup') {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg">
              <Play className="w-7 h-7 text-white ml-0.5" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">読み方テスト</h2>
            <p className="text-sm text-gray-500">
              登録済み: {teachers.length}名 ― 出題数を選んでスタート
            </p>
          </div>

          {/* Preset counts */}
          <div className="grid grid-cols-3 gap-3">
            {QUESTION_COUNTS.filter(c => c <= maxCount).map(count => (
              <button
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`py-3 rounded-xl font-bold text-lg transition-all duration-200 border-2 ${
                  questionCount === count && customCount === ''
                    ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50/50'
                }`}
              >
                {count}問
              </button>
            ))}
          </div>

          {/* All questions */}
          <button
            onClick={() => {
              setQuestionCount(maxCount);
              setCustomCount('');
            }}
            className={`w-full py-3 rounded-xl font-bold text-base transition-all duration-200 border-2 ${
              questionCount === maxCount && customCount === ''
                ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50/50'
            }`}
          >
            全問 ({maxCount}問)
          </button>

          {/* Custom count */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={maxCount}
              value={customCount}
              onChange={e => {
                setCustomCount(e.target.value);
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val > 0) setQuestionCount(val);
              }}
              placeholder="カスタム数"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            />
            <span className="text-sm text-gray-500">問</span>
          </div>

          {/* Start button */}
          <button
            onClick={() => startQuiz(questionCount)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-lg shadow-lg shadow-violet-200 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            スタート
          </button>
        </motion.div>
      </div>
    );
  }

  // --- PLAYING SCREEN ---
  if (mode === 'playing') {
    const question = questions[currentIndex];
    const progress = ((currentIndex) / questions.length) * 100;

    return (
      <div className="h-full flex flex-col">
        {/* Progress bar */}
        <div className="flex-none px-6 pt-4 pb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">
              {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-sm text-gray-400">
              正解: {results.filter(r => r.isCorrect).length}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 flex items-center justify-center p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg space-y-8"
            >
              {/* Kanji display */}
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">この先生の読み方は？</p>
                <div className="relative inline-block">
                  <h2 className="text-5xl sm:text-6xl font-black text-gray-800 tracking-wider">
                    {question.teacher.kanji}
                  </h2>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full" />
                </div>
              </div>

              {/* Choices */}
              <div className="grid grid-cols-1 gap-3">
                {question.choices.map((choice, idx) => {
                  let btnClass = 'border-gray-200 bg-white text-gray-700 hover:border-violet-400 hover:bg-violet-50 active:scale-[0.98]';

                  if (showFeedback) {
                    if (idx === question.correctIndex) {
                      btnClass = 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400/30';
                    } else if (idx === selectedAnswer && idx !== question.correctIndex) {
                      btnClass = 'border-red-400 bg-red-50 text-red-700 ring-2 ring-red-400/30';
                    } else {
                      btnClass = 'border-gray-200 bg-gray-50 text-gray-400';
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileTap={!showFeedback ? { scale: 0.98 } : undefined}
                      onClick={() => handleAnswer(idx)}
                      disabled={showFeedback}
                      className={`w-full py-4 px-6 rounded-xl border-2 text-lg font-medium transition-all duration-200 flex items-center gap-3 ${btnClass}`}
                    >
                      <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-none">
                        {['A', 'B', 'C', 'D'][idx]}
                      </span>
                      <span className="flex-1 text-left">{choice}</span>
                      {showFeedback && idx === question.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-none" />
                      )}
                      {showFeedback && idx === selectedAnswer && idx !== question.correctIndex && (
                        <XCircle className="w-5 h-5 text-red-500 flex-none" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Feedback overlay text */}
              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    {selectedAnswer === question.correctIndex ? (
                      <span className="text-2xl font-black text-emerald-500">⭕ 正解！</span>
                    ) : (
                      <span className="text-2xl font-black text-red-500">
                        ❌ 不正解… 正解は「{question.teacher.reading}」
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN ---
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto space-y-6"
      >
        {/* Score card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-lg">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">テスト結果</h2>

          {/* Score ring */}
          <div className="relative w-36 h-36 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke={scorePercent >= 80 ? '#10b981' : scorePercent >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - scorePercent / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-800">{scorePercent}%</span>
              <span className="text-sm text-gray-500">
                {correctCount}/{questions.length}
              </span>
            </div>
          </div>

          <p className="text-base text-gray-600">
            {scorePercent === 100
              ? '🎉 パーフェクト！ 素晴らしい！'
              : scorePercent >= 80
                ? '👏 よくできました！'
                : scorePercent >= 50
                  ? '📚 もう少し頑張りましょう！'
                  : '💪 復習して再チャレンジ！'}
          </p>
        </div>

        {/* Wrong answers review */}
        {wrongResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              間違えた問題 ({wrongResults.length}問)
            </h3>
            <div className="space-y-3">
              {wrongResults.map((r, idx) => (
                <div key={idx} className="bg-red-50/50 rounded-xl border border-red-100 p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-lg font-bold text-gray-800">{r.question.teacher.kanji}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-none" />
                    <span className="text-base text-emerald-600 font-bold">
                      {r.question.teacher.reading}
                    </span>
                  </div>
                  <p className="text-sm text-red-500 mt-1">
                    あなたの回答: {r.question.choices[r.selectedIndex]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => startQuiz(questions.length)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            もう一度
          </button>
          <button
            onClick={resetQuiz}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            設定に戻る
          </button>
        </div>

        <div className="pb-10" />
      </motion.div>
    </div>
  );
}
