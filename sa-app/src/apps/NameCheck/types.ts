export interface TeacherEntry {
  id: string;
  kanji: string;       // 漢字表記 (例: "東海林")
  reading: string;     // 正しい読み方 (例: "しょうじ")
  wrongReadings: string[]; // 誤答選択肢 (例: ["とうかいりん", "ひがしかいりん"])
}

export type QuizMode = 'setup' | 'playing' | 'result';

export interface QuizQuestion {
  teacher: TeacherEntry;
  choices: string[];    // シャッフル済みの選択肢（正解含む）
  correctIndex: number; // choices中の正解のindex
}

export interface QuizResult {
  question: QuizQuestion;
  selectedIndex: number;
  isCorrect: boolean;
}
