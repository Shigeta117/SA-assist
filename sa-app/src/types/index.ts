export interface TimekeeperClass {
  id: string;
  name: string;
  start: string; // HH:MM
  end: string;   // HH:MM
}

export interface TimekeeperSettings {
  timetable: TimekeeperClass[];
  shiftEndTimes: string[];
}

export interface WorkLogSettings {
  tasks: string[];
  tags: string[];
}

export interface AppSettings {
  timekeeper: TimekeeperSettings;
  workLog: WorkLogSettings;
}

export const defaultSettings: AppSettings = {
  timekeeper: {
    timetable: [
      { id: '1', name: "1限", start: "09:00", end: "10:30" },
      { id: '2', name: "2限", start: "10:40", end: "12:10" },
      { id: '3', name: "3限", start: "13:00", end: "14:30" },
      { id: '4', name: "4限", start: "14:40", end: "16:10" },
      { id: '5', name: "5限", start: "16:20", end: "17:50" },
      { id: '6', name: "6限", start: "18:00", end: "19:30" }
    ],
    shiftEndTimes: ["10:50", "12:30", "14:50", "16:30", "18:00"]
  },
  workLog: {
    tasks: ["開室作業", "閉室作業", "出席調査", "窓口対応", "レポート整理", "自家印刷", "トラブル対応", "ミニッツ印刷", "機器設置/回収", "研修"],
    tags: ["【業務コメント】", "【引継ぎ事項】", "【相談】", "【雑記】"]
  }
};
