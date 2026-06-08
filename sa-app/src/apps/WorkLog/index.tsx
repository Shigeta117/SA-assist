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

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'title',  label: '1. タイトル',  icon: Heading },
  { id: 'task',   label: '2. 業務内容',  icon: CheckSquare },
  { id: 'text',   label: '3. 本文執筆',  icon: Edit3 },
  { id: 'output', label: '4. 出力',      icon: ClipboardList },
];

export default function WorkLog({ settings }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('title');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const [state, setState] = useState<WorkLogState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // sa が保存されていない古いデータへの後方互換
        return { sa: true, ...parsed };
      } catch (_) {}
    }
    return { isTemp: false, periods: [], sa: true, surname: '', selectedTasks: [], customTask: '', bodyText: '' };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = (updates: Partial<WorkLogState>) =>
    setState(prev => ({ ...prev, ...updates }));

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
      setState({ isTemp: false, periods: [], sa: true, surname: '', selectedTasks: [], customTask: '', bodyText: '' });
    }
  };

  const togglePeriod = (p: string) => {
    if (state.isTemp) return;
    const next = state.periods.includes(p)
      ? state.periods.filter(x => x !== p)
      : [...state.periods, p].sort();
    update({ periods: next });
  };

  const toggleTask = (task: string) => {
    const next = state.selectedTasks.includes(task)
      ? state.selectedTasks.filter(x => x !== task)
      : [...state.selectedTasks, task];
    update({ selectedTasks: next });
  };

  // Derived values
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()} (${['日','月','火','水','木','金','土'][today.getDay()]})`;
  const periodStr = state.isTemp ? '臨時シフト' : state.periods.length > 0 ? state.periods.join(', ') + '限' : '';
  const titleResult = [dateStr, periodStr, state.sa ? 'SA' : '', state.surname].filter(Boolean).join(' ');
  const allTasks = [...state.selectedTasks, ...state.customTask.split('\n').map(t => t.trim()).filter(Boolean)];
  const taskResultPreview = allTasks.length > 0 ? `【業務内容】${allTasks.join('、')}` : '';
  const taskResultOutput = allTasks.length > 0 ? `【業務内容】\n${allTasks.join('、')}` : '';
  const outputBody = (taskResultOutput ? taskResultOutput + '\n\n' : '') + state.bodyText;

  const currentIndex = TABS.findIndex(t => t.id === activeTab);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < TABS.length - 1;

  const goPrev = () => {
    if (hasPrev) setActiveTab(TABS[currentIndex - 1].id);
  };

  const goNext = () => {
    if (hasNext) setActiveTab(TABS[currentIndex + 1].id);
  };

  return (
    <div className="w-full h-full flex bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} resetAll={resetAll} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/30">
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
          {/* ── STEP 1: タイトル ── */}
          {activeTab === 'title' && (
            <StepContainer id="title" title="タイトル生成">
              <div className="flex-1 overflow-y-auto space-y-4 md:space-y-8 px-4 -mx-4 pt-2 -mt-2 relative">
                {/* Date & Options */}
                <div className="flex flex-wrap items-end gap-8 relative z-10">
                  <div>
                    <label className="block text-base font-bold text-slate-700 mb-1">今日の日付</label>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-800 drop-shadow-sm h-[46px] flex items-center leading-none">{dateStr}</p>
                  </div>

                  {/* Option Toggle */}
                  <div className="flex flex-col justify-start">
                    <label className="block text-base font-bold text-slate-700 mb-2">オプション</label>
                    <div className="flex items-center gap-3 h-[46px]">
                      <button
                        type="button"
                        onClick={() => update({ sa: !state.sa })}
                        className={clsx(
                          "relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-none cursor-pointer",
                          state.sa ? 'bg-blue-600' : 'bg-slate-300'
                        )}
                      >
                        <span
                          className={clsx(
                            "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm",
                            state.sa ? 'translate-x-8' : 'translate-x-1'
                          )}
                        />
                      </button>
                      <span 
                        className="select-none text-base font-bold text-slate-700 cursor-pointer" 
                        onClick={() => update({ sa: !state.sa })}
                      >
                        "SA" を含める
                      </span>
                    </div>
                  </div>

                  {/* Surname Input */}
                  <div className="flex flex-col justify-start flex-1 min-w-[160px] max-w-xs">
                    <label className="block text-base font-bold text-slate-700 mb-2">名字</label>
                    <input
                      type="text"
                      value={state.surname}
                      onChange={e => update({ surname: e.target.value })}
                      placeholder="例: 鈴木"
                      className="w-full h-[46px] border border-slate-300/60 rounded-xl px-4 text-base bg-white/70 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Period */}
                <div className="relative z-10">
                  <label className="block text-base font-bold text-slate-700 mb-3">時限（複数選択可）</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4 px-1 py-1 -mx-1">
                    {['1','2','3','4','5','6'].map(p => (
                      <SelectableCard
                        key={p}
                        checked={state.periods.includes(p)}
                        onChange={() => togglePeriod(p)}
                        disabled={state.isTemp}
                        label={`${p}限`}
                      />
                    ))}
                    
                    {/* Temp Shift */}
                    <SelectableCard
                      checked={state.isTemp}
                      onChange={(checked) => update({ isTemp: checked, periods: checked ? [] : state.periods })}
                      label="臨時"
                      color="amber"
                      labelSize="text-sm sm:text-base"
                    />
                  </div>
                </div>
                
                {/* Decorative Background */}
                <DecorativeBackground type="step1" />
              </div>

              <PreviewSection id="title" value={titleResult} copied={copiedStates['title']} onCopy={handleCopy} />
            </StepContainer>
          )}

          {/* ── STEP 2: 業務内容 ── */}
          {activeTab === 'task' && (
            <StepContainer id="task" title="業務内容生成">
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col relative px-4 -mx-4">
                <div className="relative z-10 py-2 md:py-4 flex flex-col min-h-0 space-y-6">
                  {/* Preset tasks grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {settings.tasks.map(task => (
                      <SelectableCard
                        key={task}
                        checked={state.selectedTasks.includes(task)}
                        onChange={() => toggleTask(task)}
                        label={task}
                        gap="gap-3"
                        padding="px-3 py-4 md:px-4 md:py-6"
                        labelSize="text-sm"
                        iconWrapperSize="w-7 h-7"
                        checkIconSize="w-4 h-4"
                      />
                    ))}
                  </div>

                  {/* Custom tasks */}
                  <div className="flex-none bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <button 
                      onClick={() => setIsCustomOpen(!isCustomOpen)}
                      className="w-full flex justify-between items-center text-sm font-bold text-slate-700 outline-none cursor-pointer group"
                    >
                      <span>その他の業務 <span className="text-slate-400 font-medium ml-2">※オプション（改行で複数入力）</span></span>
                      <span className="text-slate-400 group-hover:text-blue-500 transition-colors">{isCustomOpen ? '▲' : '▼'}</span>
                    </button>
                    <AnimatePresence>
                      {isCustomOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          className="overflow-hidden"
                        >
                          <textarea
                            value={state.customTask}
                            onChange={e => update({ customTask: e.target.value })}
                            placeholder="例: 機材メンテナンス"
                            className="w-full h-[72px] border border-slate-300/60 rounded-xl px-4 py-3 text-sm resize-none bg-white/70 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all leading-relaxed"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Decorative Background */}
                <DecorativeBackground type="step2" />
              </div>

              <PreviewSection id="task" value={taskResultPreview} copied={copiedStates['task']} onCopy={handleCopy} />
            </StepContainer>
          )}

          {/* ── STEP 3: 本文 ── */}
          {activeTab === 'text' && (
            <StepContainer 
              id="text" 
              title="本文執筆"
              titleRight={<span className="text-gray-500 font-medium text-base">{state.bodyText.length} 文字</span>}
            >
              <div className="flex-none mb-4">
                <label className="block text-base font-semibold text-gray-700 mb-2">見出しのクイック挿入</label>
                <div className="flex flex-wrap gap-2">
                  {settings.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => update({
                        bodyText: state.bodyText + (state.bodyText && !state.bodyText.endsWith('\n') ? '\n' : '') + tag + '\n'
                      })}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-base font-bold hover:bg-indigo-100 border border-indigo-200 transition-colors active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  value={state.bodyText}
                  onChange={e => update({ bodyText: e.target.value })}
                  placeholder="業務の詳細を入力してください..."
                  className="flex-1 w-full border border-gray-300 rounded-xl p-5 text-base leading-relaxed resize-none bg-gray-50/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                />
              </div>
            </StepContainer>
          )}

          {/* ── STEP 4: 出力 ── */}
          {activeTab === 'output' && (
            <StepContainer id="output" title="最終出力">
              {/* Title */}
              <div className="flex-none mb-5">
                <label className="block text-base font-bold text-gray-700 mb-2">タイトル</label>
                <div className="flex gap-2">
                  <input
                    type="text" readOnly value={titleResult}
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base font-bold text-gray-800 focus:outline-none"
                  />
                  <CopyBtn id="out-title" text={titleResult} copied={copiedStates['out-title']} onCopy={handleCopy} dark />
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col min-h-0 pb-2">
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-base font-bold text-gray-700">本文（業務内容 + 執筆内容）</label>
                  <CopyBtn id="out-body" text={outputBody} copied={copiedStates['out-body']} onCopy={handleCopy} label="本文をコピー" />
                </div>
                <textarea
                  readOnly value={outputBody}
                  className="flex-1 w-full bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 text-base font-medium text-gray-800 focus:outline-none resize-none leading-relaxed"
                />
              </div>
            </StepContainer>
          )}
          </AnimatePresence>
        </div>
        
        {/* Navigation Footer */}
        <div className="flex-none p-4 md:px-8 md:py-4 border-t border-slate-200 bg-white flex justify-between items-center shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-bold transition-colors text-base",
              hasPrev ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "opacity-0 pointer-events-none"
            )}
          >
            ← 前のステップ
          </button>
          
          <button
            onClick={goNext}
            disabled={!hasNext}
            className={clsx(
              "px-8 py-2.5 rounded-xl font-bold transition-all text-base shadow-sm",
              hasNext ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md" : "opacity-0 pointer-events-none"
            )}
          >
            次のステップ →
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Subcomponents
// ==========================================

function Sidebar({ activeTab, setActiveTab, resetAll }: { activeTab: TabType; setActiveTab: (t: TabType) => void; resetAll: () => void }) {
  return (
    <div className="w-64 md:w-72 flex-none bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative pt-24">
      <div className="px-6 pb-6 border-b border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 tracking-wider">業務日誌</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">作成ウィザード</p>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all duration-300 relative',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-2'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className={clsx(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
              )}>
                <tab.icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold opacity-70 mb-0.5">STEP {idx + 1}</span>
                <span className="text-base">{tab.label.replace(/^\d+\.\s*/, '')}</span>
              </div>
              {isActive && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rotate-45 transform" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-5 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={resetAll}
          className="w-full flex items-center justify-center gap-2 text-red-600 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 px-4 py-3.5 rounded-xl transition-all font-bold shadow-sm border border-slate-200"
        >
          <Trash2 className="w-5 h-5" />
          <span>全リセット</span>
        </button>
      </div>
    </div>
  );
}

function StepContainer({ id, title, titleRight, children }: { id: string; title: string; titleRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 flex flex-col p-4 md:p-6 lg:p-8"
    >
      <div className="w-full flex flex-col h-full max-w-7xl mx-auto">
        <div className={clsx("flex-none flex justify-between items-end border-b border-gray-200 pb-2 mb-3 md:pb-3 md:mb-5", !titleRight && "items-start")}>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {titleRight}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

interface SelectableCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  color?: 'blue' | 'amber';
  gap?: string;
  padding?: string;
  labelSize?: string;
  iconWrapperSize?: string;
  checkIconSize?: string;
}

function SelectableCard({ 
  checked, onChange, disabled, label, color = 'blue', gap = 'gap-2', padding = 'px-2 py-4 sm:py-5', labelSize = 'text-base sm:text-lg',
  iconWrapperSize = 'w-6 h-6 sm:w-7 sm:h-7', checkIconSize = 'w-3.5 h-3.5 sm:w-4 sm:h-4'
}: SelectableCardProps) {
  const isBlue = color === 'blue';
  
  const bgActive = isBlue 
    ? 'bg-gradient-to-br from-blue-500/90 to-blue-600/90 backdrop-blur-md border-blue-400/50 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)] scale-[1.02] z-10'
    : 'bg-gradient-to-br from-amber-500/90 to-amber-600/90 backdrop-blur-md border-amber-400/50 text-white shadow-[0_8px_24px_rgba(245,158,11,0.25)] scale-[1.02] z-10';
    
  const bgInactive = isBlue
    ? 'bg-white/90 backdrop-blur-sm border-slate-200/60 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.02] hover:z-20'
    : 'bg-amber-50/90 backdrop-blur-sm border-amber-200/60 text-amber-800 hover:bg-amber-100/90 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.02] hover:z-20';

  const iconActive = isBlue ? 'bg-white text-blue-600 shadow-sm' : 'bg-white text-amber-600 shadow-sm';
  const iconInactive = isBlue 
    ? 'bg-slate-100/80 text-transparent group-hover:bg-slate-200/80 group-hover:shadow-md'
    : 'bg-amber-100/80 text-transparent group-hover:bg-amber-200/80 group-hover:shadow-md';

  return (
    <label
      className={clsx(
        'relative flex flex-col justify-center items-center rounded-2xl border cursor-pointer transition-all duration-300 select-none group',
        gap, padding,
        checked ? bgActive : bgInactive,
        disabled && !checked && 'opacity-40 pointer-events-none grayscale shadow-sm'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0"
      />
      <div className={clsx(
        "rounded-full flex items-center justify-center transition-all duration-300 shadow-inner",
        iconWrapperSize,
        checked ? iconActive : iconInactive
      )}>
        <Check className={checkIconSize} strokeWidth={3} />
      </div>
      <span className={clsx("font-bold text-center", labelSize)}>{label}</span>
    </label>
  );
}

function PreviewSection({ id, value, copied, onCopy, isTextArea }: { id: string; value: string; copied: boolean; onCopy: (id: string, text: string) => void; isTextArea?: boolean }) {
  return (
    <div className="flex-none mt-5 bg-gray-100 p-4 rounded-xl border border-gray-200">
      <p className="text-sm font-semibold text-gray-500 mb-2">プレビュー</p>
      <div className="flex gap-2">
        {isTextArea ? (
          <textarea
            readOnly value={value}
            rows={2}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-medium text-gray-800 focus:outline-none resize-none leading-relaxed"
          />
        ) : (
          <input
            type="text" readOnly value={value}
            className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-3 text-base font-bold text-gray-800 focus:outline-none"
          />
        )}
        <CopyBtn id={id} text={value} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  );
}

function DecorativeBackground({ type }: { type: 'step1' | 'step2' }) {
  if (type === 'step1') {
    return (
      <>
        <div className="absolute top-0 right-20 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      </>
    );
  }
  return (
    <>
      <div className="absolute top-10 right-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
    </>
  );
}

interface CopyBtnProps {
  id: string;
  text: string;
  copied: boolean;
  onCopy: (id: string, text: string) => void;
  dark?: boolean;
  label?: string;
}

function CopyBtn({ id, text, copied, onCopy, dark, label }: CopyBtnProps) {
  return (
    <button
      onClick={() => onCopy(id, text)}
      disabled={!text}
      className={clsx(
        'flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-base transition-colors whitespace-nowrap',
        copied
          ? 'bg-green-500 text-white'
          : dark
            ? 'bg-gray-800 hover:bg-gray-900 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white',
        !text && 'opacity-40 cursor-not-allowed'
      )}
    >
      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
      {copied ? '完了' : (label ?? 'コピー')}
    </button>
  );
}
