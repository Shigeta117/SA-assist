import { useState } from 'react';
import type { AppSettings } from '../../types';
import { Save, Plus, Trash2, Clock, CheckSquare } from 'lucide-react';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<boolean>;
}

export default function Settings({ settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(JSON.parse(JSON.stringify(settings)));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      alert('設定を保存しました。');
    } catch (e) {
      alert('保存に失敗しました。コンソールを確認してください。');
    }
    setSaving(false);
  };

  const updateTimekeeper = (updates: Partial<AppSettings['timekeeper']>) => {
    setLocalSettings(prev => ({ ...prev, timekeeper: { ...prev.timekeeper, ...updates } }));
  };

  const updateWorkLog = (updates: Partial<AppSettings['workLog']>) => {
    setLocalSettings(prev => ({ ...prev, workLog: { ...prev.workLog, ...updates } }));
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center pl-16">
        <h1 className="text-2xl font-bold text-gray-800">共通設定 (Firestore同期)</h1>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? '保存中...' : '保存'}</span>
        </button>
      </div>

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-10">
          
          {/* Timekeeper Settings */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6 border-b pb-4">
              <Clock className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-800">Timekeeper 設定</h2>
            </div>
            
            <div className="space-y-8">
              {/* Timetable */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-bold text-gray-700">時間割 (授業枠)</label>
                  <button onClick={() => updateTimekeeper({ timetable: [...localSettings.timekeeper.timetable, { id: Date.now().toString(), name: '新枠', start: '00:00', end: '00:00' }] })} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg flex items-center text-base font-medium">
                    <Plus className="w-4 h-4 mr-1" /> 追加
                  </button>
                </div>
                <div className="space-y-3">
                  {localSettings.timekeeper.timetable.map((cls, idx) => (
                    <div key={cls.id} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <input type="text" value={cls.name} onChange={e => {
                        const newTb = [...localSettings.timekeeper.timetable];
                        newTb[idx].name = e.target.value;
                        updateTimekeeper({ timetable: newTb });
                      }} className="w-24 bg-white border border-gray-300 rounded px-3 py-1.5 text-base focus:ring-blue-500 focus:border-blue-500" />
                      <input type="time" value={cls.start} onChange={e => {
                        const newTb = [...localSettings.timekeeper.timetable];
                        newTb[idx].start = e.target.value;
                        updateTimekeeper({ timetable: newTb });
                      }} className="bg-white border border-gray-300 rounded px-3 py-1.5 text-base focus:ring-blue-500 focus:border-blue-500" />
                      <span className="text-gray-400">~</span>
                      <input type="time" value={cls.end} onChange={e => {
                        const newTb = [...localSettings.timekeeper.timetable];
                        newTb[idx].end = e.target.value;
                        updateTimekeeper({ timetable: newTb });
                      }} className="bg-white border border-gray-300 rounded px-3 py-1.5 text-base focus:ring-blue-500 focus:border-blue-500" />
                      <div className="flex-1" />
                      <button onClick={() => {
                        const newTb = localSettings.timekeeper.timetable.filter((_, i) => i !== idx);
                        updateTimekeeper({ timetable: newTb });
                      }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shift End Times */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-bold text-gray-700">退勤アラーム時刻 (HH:MM)</label>
                  <button onClick={() => updateTimekeeper({ shiftEndTimes: [...localSettings.timekeeper.shiftEndTimes, '00:00'] })} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg flex items-center text-base font-medium">
                    <Plus className="w-4 h-4 mr-1" /> 追加
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {localSettings.timekeeper.shiftEndTimes.map((time, idx) => (
                    <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                      <input type="time" value={time} onChange={e => {
                        const newTimes = [...localSettings.timekeeper.shiftEndTimes];
                        newTimes[idx] = e.target.value;
                        updateTimekeeper({ shiftEndTimes: newTimes });
                      }} className="bg-transparent border-none px-3 py-2 text-base focus:ring-0" />
                      <button onClick={() => {
                        const newTimes = localSettings.timekeeper.shiftEndTimes.filter((_, i) => i !== idx);
                        updateTimekeeper({ shiftEndTimes: newTimes });
                      }} className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Work Log Settings */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-2 mb-6 border-b pb-4">
              <CheckSquare className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-bold text-gray-800">業務日誌 設定</h2>
            </div>

            <div className="space-y-8">
              {/* Tasks */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-bold text-gray-700">定型業務リスト</label>
                  <button onClick={() => updateWorkLog({ tasks: [...localSettings.workLog.tasks, '新規業務'] })} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg flex items-center text-base font-medium">
                    <Plus className="w-4 h-4 mr-1" /> 追加
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {localSettings.workLog.tasks.map((task, idx) => (
                    <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                      <input type="text" value={task} onChange={e => {
                        const newTasks = [...localSettings.workLog.tasks];
                        newTasks[idx] = e.target.value;
                        updateWorkLog({ tasks: newTasks });
                      }} className="w-full bg-transparent border-none px-3 py-2 text-base focus:ring-0" />
                      <button onClick={() => {
                        const newTasks = localSettings.workLog.tasks.filter((_, i) => i !== idx);
                        updateWorkLog({ tasks: newTasks });
                      }} className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-base font-bold text-gray-700">クイックインサートタグ (見出し)</label>
                  <button onClick={() => updateWorkLog({ tags: [...localSettings.workLog.tags, '【新規タグ】'] })} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg flex items-center text-base font-medium">
                    <Plus className="w-4 h-4 mr-1" /> 追加
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {localSettings.workLog.tags.map((tag, idx) => (
                    <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-green-500">
                      <input type="text" value={tag} onChange={e => {
                        const newTags = [...localSettings.workLog.tags];
                        newTags[idx] = e.target.value;
                        updateWorkLog({ tags: newTags });
                      }} className="bg-transparent border-none px-3 py-2 text-base focus:ring-0 w-36 md:w-44" />
                      <button onClick={() => {
                        const newTags = localSettings.workLog.tags.filter((_, i) => i !== idx);
                        updateWorkLog({ tags: newTags });
                      }} className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="pb-20" /> {/* Bottom padding */}
        </div>
      </div>
    </div>
  );
}
