import { useState, useEffect } from 'react';
import type { WorkLogSettings } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Heading, CheckSquare, Edit3, ClipboardList, Copy, Check, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  settings: WorkLogSettings;
}

type TabType = 'title' | 'task' | 'text' | 'output';

interface WorkLogState {
  isTemp: boolean;
  periods: string[];
  sa: boolean;
  surname: string;
  selectedTasks: string[];
  customTask: string;
  bodyText: string;
}

const STORAGE_KEY = 'sa-worklog-draft';

export default function WorkLog({ settings }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('title');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  const [state, setState] = useState<WorkLogState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      isTemp: false,
      periods: [],
      sa: true,
      surname: '',
      selectedTasks: [],
      customTask: '',
      bodyText: ''
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<WorkLogState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleCopy = async (id: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [id]: false })), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const resetAll = () => {
    if (confirm('入力内容を全てリセットしますか？')) {
      const empty = { isTemp: false, periods: [], sa: true, surname: '', selectedTasks: [], customTask: '', bodyText: '' };
      setState(empty);
    }
  };

  // Derived Values
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()} (${["日","月","火","水","木","金","土"][today.getDay()]})`;
  
  let periodStr = state.isTemp ? '臨時シフト' : (state.periods.length > 0 ? state.periods.join(', ') + '限' : '');
  const titleResult = [dateStr, periodStr, state.sa ? 'SA' : '', state.surname].filter(Boolean).join(' ');

  const allTasks = [...state.selectedTasks, ...state.customTask.split('\n').map(t => t.trim()).filter(Boolean)];
  const taskResult = allTasks.length > 0 ? `【業務内容】${allTasks.join('、')}` : '';

  const outputBody = (taskResult ? taskResult + '\n\n' : '') + state.bodyText;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'title', label: '1. タイトル', icon: Heading },
    { id: 'task', label: '2. 業務内容', icon: CheckSquare },
    { id: 'text', label: '3. 本文執筆', icon: Edit3 },
    { id: 'output', label: '4. 出力', icon: ClipboardList }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white">
      {/* Top Stepper Navigation */}
      <div className="flex-none bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center pl-16">
        <div className="flex space-x-2 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "text-gray-600 hover:bg-gray-200"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <button onClick={resetAll} className="flex items-center space-x-1 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm font-medium">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">リセット</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'title' && (
            <motion.div key="title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">タイトル生成</h2>
              
              <div className="flex-1 flex flex-col space-y-5 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">今日の日付</label>
                  <div className="text-lg font-bold text-blue-600">{dateStr}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">時限 (複数選択可)</label>
                  <div className="flex flex-wrap gap-3">
                    {["1", "2", "3", "4", "5", "6"].map(p => (
                      <label key={p} className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-blue-50 border border-gray-200 transition-colors">
                        <input type="checkbox" checked={state.periods.includes(p)} disabled={state.isTemp}
                          onChange={(e) => {
                            const newPeriods = e.target.checked ? [...state.periods, p].sort() : state.periods.filter(x => x !== p);
                            updateState({ periods: newPeriods });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500" />
                        <span>{p}限</span>
                      </label>
                    ))}
                    <label className="flex items-center space-x-2 bg-amber-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-amber-100 border border-amber-200 transition-colors ml-4">
                      <input type="checkbox" checked={state.isTemp} onChange={e => updateState({ isTemp: e.target.checked, periods: e.target.checked ? [] : state.periods })} className="rounded text-amber-600 focus:ring-amber-500" />
                      <span className="text-amber-800 font-medium">臨時</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">オプション</label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={state.sa} onChange={e => updateState({ sa: e.target.checked })} className="rounded text-blue-600 w-5 h-5" />
                      <span>"SA" を含める</span>
                    </label>
                  </div>
                  <div className="flex-1 max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">名字</label>
                    <input type="text" value={state.surname} onChange={e => updateState({ surname: e.target.value })} placeholder="例: 鈴木" className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 bg-gray-50 border" />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="flex-none bg-gray-100 p-4 rounded-xl border border-gray-200 flex flex-col space-y-2">
                <span className="text-sm font-semibold text-gray-500">プレビュー</span>
                <div className="flex space-x-2">
                  <input type="text" readOnly value={titleResult} className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 font-bold text-gray-800 focus:outline-none" />
                  <button onClick={() => handleCopy('title', titleResult)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium transition-colors w-32 justify-center">
                    {copiedStates['title'] ? <><Check className="w-5 h-5"/><span>完了</span></> : <><Copy className="w-5 h-5"/><span>コピー</span></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'task' && (
            <motion.div key="task" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">業務内容生成</h2>
              
              <div className="flex-1 flex flex-col space-y-5 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">定型業務 (複数選択可)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {settings.tasks.map(task => (
                      <label key={task} className="flex items-center space-x-2 bg-gray-50 px-3 py-3 rounded-lg cursor-pointer hover:bg-blue-50 border border-gray-200 transition-colors">
                        <input type="checkbox" checked={state.selectedTasks.includes(task)}
                          onChange={(e) => {
                            const newTasks = e.target.checked ? [...state.selectedTasks, task] : state.selectedTasks.filter(x => x !== task);
                            updateState({ selectedTasks: newTasks });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" />
                        <span className="font-medium text-gray-700 text-sm">{task}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-[120px]">
                  <label className="block text-sm font-medium text-gray-700 mb-2">その他の業務 (改行で複数入力可)</label>
                  <textarea value={state.customTask} onChange={e => updateState({ customTask: e.target.value })} placeholder="例: 機材メンテナンス" className="flex-1 w-full border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-4 resize-none bg-gray-50" />
                </div>
              </div>

              {/* Preview */}
              <div className="flex-none bg-gray-100 p-4 rounded-xl border border-gray-200 flex flex-col space-y-2">
                <span className="text-sm font-semibold text-gray-500">プレビュー</span>
                <div className="flex space-x-2">
                  <input type="text" readOnly value={taskResult} className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 font-medium text-gray-800 focus:outline-none overflow-hidden text-ellipsis" />
                  <button onClick={() => handleCopy('task', taskResult)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium transition-colors w-32 justify-center">
                    {copiedStates['task'] ? <><Check className="w-5 h-5"/><span>完了</span></> : <><Copy className="w-5 h-5"/><span>コピー</span></>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'text' && (
            <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col space-y-4">
              <div className="flex justify-between items-end border-b pb-2">
                <h2 className="text-2xl font-bold text-gray-800">本文執筆</h2>
                <span className="text-gray-500 font-medium">({state.bodyText.length} 文字)</span>
              </div>
              
              <div className="flex-none">
                <label className="block text-sm font-medium text-gray-700 mb-2">見出しのクイック挿入</label>
                <div className="flex flex-wrap gap-2">
                  {settings.tags.map(tag => (
                    <button key={tag} onClick={() => updateState({ bodyText: state.bodyText + (state.bodyText && !state.bodyText.endsWith('\n') ? '\n' : '') + tag + '\n' })} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm active:scale-95">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col pt-2">
                <textarea value={state.bodyText} onChange={e => updateState({ bodyText: e.target.value })} placeholder="業務の詳細を入力してください..." className="flex-1 w-full border border-gray-300 rounded-xl shadow-inner focus:border-blue-500 focus:ring-blue-500 p-5 resize-none bg-gray-50/50 leading-relaxed" />
              </div>
            </motion.div>
          )}

          {activeTab === 'output' && (
            <motion.div key="output" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full flex flex-col space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">最終出力</h2>
              
              <div className="flex-none flex flex-col space-y-2">
                <label className="block text-sm font-bold text-gray-700">タイトル</label>
                <div className="flex space-x-2">
                  <input type="text" readOnly value={titleResult} className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 font-bold text-gray-800 focus:outline-none" />
                  <button onClick={() => handleCopy('out-title', titleResult)} className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-3 rounded-lg font-medium transition-colors w-32 justify-center shadow-md">
                    {copiedStates['out-title'] ? <><Check className="w-5 h-5"/><span>完了</span></> : <><Copy className="w-5 h-5"/><span>コピー</span></>}
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col space-y-2 pb-4">
                <div className="flex justify-between items-end">
                  <label className="block text-sm font-bold text-gray-700">本文（業務内容 + 執筆内容）</label>
                  <button onClick={() => handleCopy('out-body', outputBody)} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md">
                    {copiedStates['out-body'] ? <><Check className="w-5 h-5"/><span>完了しました</span></> : <><Copy className="w-5 h-5"/><span>本文をコピー</span></>}
                  </button>
                </div>
                <textarea readOnly value={outputBody} className="flex-1 w-full bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 font-medium text-gray-800 focus:outline-none resize-none shadow-inner leading-relaxed" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
