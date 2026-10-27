import { useEffect, useState, useRef } from 'react';
import type { TimekeeperSettings, TimekeeperClass } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Bell, Maximize, Minimize } from 'lucide-react';

interface Props {
  settings: TimekeeperSettings;
}

type StatusType = 'class' | 'break' | 'before' | 'after';

interface StatusResult {
  type: StatusType;
  currentClass?: TimekeeperClass;
  nextClass?: TimekeeperClass;
  prevClass?: TimekeeperClass;
  passedMin?: number;
  remainingMin?: number;
  progress?: number; // 0〜1: 授業・休み時間の経過割合
  isLunch?: boolean;
}

// 12:30 をまたぐ 30 分以上の休み時間を「昼休み」とみなす
const LUNCH_PIVOT_MIN = 12 * 60 + 30;
const LUNCH_MIN_LENGTH = 30;

const days = ["日", "月", "火", "水", "木", "金", "土"];

function timeToMinutes(timeStr: string) {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function scheduleJiho(nowDate: Date) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const currentTime = ctx.currentTime;

    const targetDate = new Date(nowDate.getTime());
    targetDate.setSeconds(0);
    targetDate.setMilliseconds(0);
    targetDate.setMinutes(targetDate.getMinutes() + 1); 
    const diffSeconds = (targetDate.getTime() - nowDate.getTime()) / 1000;

    function createPip(time: number, freq: number, duration: number) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(0.1, time);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + duration);
    }

    createPip(currentTime + diffSeconds - 2, 880, 0.1);
    createPip(currentTime + diffSeconds - 1, 880, 0.1);
    createPip(currentTime + diffSeconds, 1760, 1.0);
  } catch(e) {
    console.log("Audio blocked", e);
  }
}

export default function Timekeeper({ settings }: Props) {
  const [now, setNow] = useState(new Date());
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [debugOffset, setDebugOffset] = useState<number>(0);
  const [toastShiftTime, setToastShiftTime] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const lastAlarmCheckedMinute = useRef<string>("");
  const lastScheduledMinute = useRef<string>("");

  useEffect(() => {
    const syncTime = async () => {
      try {
        // Fetch accurate time from external API
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Tokyo');
        const data = await res.json();
        const externalTime = new Date(data.datetime).getTime();
        const localTime = Date.now();
        setTimeOffset(externalTime - localTime);
        console.log(`Time synchronized. Offset: ${externalTime - localTime}ms`);
      } catch (e) {
        console.error('Failed to sync external time:', e);
      }
    };

    syncTime();
    // Re-sync every 1 hour to prevent drift
    const syncTimer = setInterval(syncTime, 60 * 60 * 1000);
    return () => clearInterval(syncTimer);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date(Date.now() + timeOffset + debugOffset);
      setNow(d);
      
      // Alarm Logic
      const nextMinTime = new Date(d.getTime() + 60000); 
      const nextHM = String(nextMinTime.getHours()).padStart(2, '0') + ":" + String(nextMinTime.getMinutes()).padStart(2, '0');
      
      if (settings.shiftEndTimes.includes(nextHM) && d.getSeconds() >= 50) {
        if (lastScheduledMinute.current !== nextHM) {
          scheduleJiho(d);
          lastScheduledMinute.current = nextHM;
        }
      }

      const currentHM = String(d.getHours()).padStart(2, '0') + ":" + String(d.getMinutes()).padStart(2, '0');
      if (settings.shiftEndTimes.includes(currentHM)) {
        if (lastAlarmCheckedMinute.current !== currentHM) {
          setToastShiftTime(currentHM);
          lastAlarmCheckedMinute.current = currentHM;
          setTimeout(() => setToastShiftTime(null), 60000); // hide after 1 min
        }
      } else {
        lastAlarmCheckedMinute.current = "";
      }
    };

    updateTime(); // update immediately so UI reacts instantly to debugOffset changes
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [settings, timeOffset, debugOffset]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowSeconds = nowMinutes * 60 + now.getSeconds();

  let status: StatusResult = { type: 'after' };

  if (settings.timetable && settings.timetable.length > 0) {
    let found = false;
    for (let i = 0; i < settings.timetable.length; i++) {
      const currentClass = settings.timetable[i];
      const startMin = timeToMinutes(currentClass.start);
      const endMin = timeToMinutes(currentClass.end);

      if (nowMinutes >= startMin && nowMinutes < endMin) {
        status = {
          type: 'class',
          currentClass,
          passedMin: nowMinutes - startMin,
          remainingMin: endMin - nowMinutes,
          progress: (nowSeconds - startMin * 60) / ((endMin - startMin) * 60),
        };
        found = true;
        break;
      }

      if (i < settings.timetable.length - 1) {
        const nextClass = settings.timetable[i + 1];
        const nextStartMin = timeToMinutes(nextClass.start);
        if (nowMinutes >= endMin && nowMinutes < nextStartMin) {
          status = {
            type: 'break',
            prevClass: currentClass,
            nextClass,
            remainingMin: nextStartMin - nowMinutes,
            progress: (nowSeconds - endMin * 60) / ((nextStartMin - endMin) * 60),
            isLunch: nextStartMin - endMin >= LUNCH_MIN_LENGTH && endMin <= LUNCH_PIVOT_MIN && nextStartMin >= LUNCH_PIVOT_MIN,
          };
          found = true;
          break;
        }
      }
    }

    if (!found) {
      const firstStartMin = timeToMinutes(settings.timetable[0].start);
      if (nowMinutes < firstStartMin) {
        status = { type: 'before', nextClass: settings.timetable[0], remainingMin: firstStartMin - nowMinutes };
      }
    }
  }

  // 同じ種類の状態が続いても、時限が変わったらアニメーションさせる
  const statusKey = `${status.type}-${status.currentClass?.id ?? status.nextClass?.id ?? ''}`;

  // Determine theme colors based on status
  let themeBg = 'bg-gray-100';
  let themeText = 'text-gray-800';
  let themeLeftBg = 'bg-gray-200';
  let themeBar = 'bg-gray-500';

  if (status.type === 'class') {
    themeBg = 'bg-sky-50';
    themeText = 'text-sky-900';
    themeLeftBg = 'bg-sky-200';
    themeBar = 'bg-sky-500';
  } else if (status.type === 'break') {
    themeBg = 'bg-amber-50';
    themeText = 'text-amber-900';
    themeLeftBg = 'bg-amber-200';
    themeBar = 'bg-amber-500';
  }

  // 文字サイズは各エリアの幅(cqw)と高さ(cqh)の小さい方で決める。
  // 1366x768 の画面でブラウザのタブやタスクバー分だけ縦が縮んでも、折り返し・はみ出しが起きないようにするため。
  const infoLabel = "text-[length:min(3.6cqw,11cqh)] font-bold opacity-70 leading-none whitespace-nowrap";
  const infoTime = "text-[length:min(13cqw,42cqh)] font-black leading-none tracking-tighter tabular-nums whitespace-nowrap";
  const infoSuffix = "text-[length:min(3.6cqw,11cqh)] font-bold opacity-70 ml-[0.4em]";
  const pillBox = "flex flex-col justify-center items-center gap-[1.5cqh] bg-white/40 px-[3.5cqw] py-[4cqh] rounded-[min(3cqw,8cqh)] shadow-sm backdrop-blur-sm";
  const pillNum = "text-[length:min(10cqw,33cqh)] font-black leading-none tracking-tighter tabular-nums whitespace-nowrap";
  const pillUnit = "text-[length:min(3.2cqw,10cqh)] ml-[0.3em] font-bold tracking-normal";
  const pillLabel = "text-[length:min(3.2cqw,10cqh)] font-bold opacity-80 leading-none whitespace-nowrap";

  const progressBar = (status.type === 'class' || status.type === 'break') && (
    <div className="flex items-center gap-[2cqw] w-full">
      <div className="flex-1 h-[min(1.2cqw,3.5cqh)] rounded-full bg-black/10 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-[width] duration-1000 ease-linear", themeBar)}
          style={{ width: `${Math.min(Math.max(status.progress ?? 0, 0), 1) * 100}%` }}
        />
      </div>
      {status.type === 'class' && (
        <span className="text-[length:min(2.4cqw,8cqh)] font-bold opacity-70 leading-none whitespace-nowrap tabular-nums">
          残り {status.remainingMin} min
        </span>
      )}
    </div>
  );

  return (
    <div className={clsx("relative w-full h-full flex flex-col transition-colors duration-1000", themeBg, themeText)}>
      
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-30 p-3 bg-white/40 backdrop-blur shadow-sm hover:bg-white/60 hover:shadow-md rounded-full text-gray-700 transition-all duration-300 hover:scale-105 active:scale-95"
        title="全画面表示の切り替え"
      >
        {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
      </button>

      {/* Toast */}
      <AnimatePresence>
        {toastShiftTime && (
          <motion.div
            initial={{ x: '150%' }}
            animate={{ x: 0 }}
            exit={{ x: '150%' }}
            className="fixed top-20 right-4 bg-white/95 backdrop-blur shadow-2xl p-6 rounded-2xl border-l-8 border-orange-500 z-50 flex flex-col"
          >
            <div className="flex items-center space-x-2 text-orange-600 mb-2">
              <Bell className="w-6 h-6 animate-bounce" />
              <h2 className="text-2xl font-bold">お疲れ様でした！</h2>
            </div>
            <p className="text-gray-700 text-lg font-medium">シフト終了時間 ({toastShiftTime})</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Section */}
      <div className="flex-[3] min-h-0 [container-type:size] flex flex-col justify-center items-center border-b-2 border-black/5">
        <div className="text-[length:min(4.4cqw,11cqh)] font-bold opacity-80 mb-[3cqh] tracking-wider leading-none whitespace-nowrap">
          {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日({days[now.getDay()]})
        </div>
        <div className="text-[length:min(18cqw,58cqh)] font-black leading-none tracking-tighter tabular-nums whitespace-nowrap drop-shadow-sm">
          {String(now.getHours()).padStart(2, '0')}:
          {String(now.getMinutes()).padStart(2, '0')}:
          {String(now.getSeconds()).padStart(2, '0')}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex-[2] min-h-0 flex flex-col md:flex-row">

        {/* Status Display */}
        <div className={clsx("flex-1 min-h-0 min-w-0 [container-type:size] relative border-r-0 md:border-r-2 border-black/5 transition-colors duration-1000 text-center leading-none tracking-tight overflow-hidden", themeLeftBg)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={statusKey}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 flex flex-col justify-center items-center gap-[5cqh] p-4"
            >
              <div className="text-[length:min(19cqw,40cqh)] font-black whitespace-nowrap">
                {status.type === 'class' && status.currentClass?.name}
                {status.type === 'break' && `${status.prevClass?.name.replace('限','')} ⇒ ${status.nextClass?.name.replace('限','')}`}
                {status.type === 'before' && "開室中"}
                {status.type === 'after' && "授業終了"}
              </div>
              {status.type === 'break' && (
                <div className="text-[length:min(6cqw,12cqh)] font-bold opacity-70 whitespace-nowrap tracking-widest">
                  {status.isLunch ? '昼休み' : '休み時間'}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Info Display */}
        <div className="flex-[2] min-h-0 min-w-0 [container-type:size] relative overflow-hidden bg-black/5 md:bg-transparent transition-colors duration-1000 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusKey}
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -40, opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4, ease: "easeInOut", delay: 0.1 }}
              className="absolute inset-0 flex flex-col justify-center gap-[5cqh] px-[5cqw] py-[6cqh]"
            >
              <div className="flex flex-row justify-around items-center gap-[4cqw]">
                {status.type === 'class' && (
                  <>
                    <div className="flex flex-col justify-center items-start gap-[3cqh]">
                      <div className={infoLabel}>{status.currentClass?.start} ~</div>
                      <div className={infoTime}>{status.currentClass?.end}</div>
                    </div>
                    <div className={pillBox}>
                      <span className={pillNum}>
                        {status.passedMin}<span className={pillUnit}>min</span>
                      </span>
                      <span className={pillLabel}>経過</span>
                    </div>
                  </>
                )}

                {status.type === 'break' && (
                  <>
                    <div className="flex flex-col justify-center items-start gap-[3cqh]">
                      <div className={infoLabel}>次枠（{status.nextClass?.name}）</div>
                      <div className={infoTime}>
                        {status.nextClass?.start}<span className={infoSuffix}>開始</span>
                      </div>
                    </div>
                    <div className={pillBox}>
                      <span className={pillLabel}>開始まで あと</span>
                      <span className={pillNum}>
                        {status.remainingMin}<span className={pillUnit}>min</span>
                      </span>
                    </div>
                  </>
                )}

                {status.type === 'before' && (
                  <>
                    <div className="flex flex-col justify-center items-start gap-[3cqh]">
                      <div className={infoLabel}>最初の授業（{status.nextClass?.name}）</div>
                      <div className={infoTime}>
                        {status.nextClass?.start}<span className={infoSuffix}>開始</span>
                      </div>
                    </div>
                    <div className={pillBox}>
                      <span className={pillLabel}>開始まで あと</span>
                      <span className={pillNum}>
                        {status.remainingMin}<span className={pillUnit}>min</span>
                      </span>
                    </div>
                  </>
                )}

                {status.type === 'after' && (
                  <div className="flex flex-col justify-center items-center gap-[4cqh]">
                    <div className={infoLabel}>本日の授業は</div>
                    <div className="text-[length:min(9cqw,32cqh)] font-black leading-none whitespace-nowrap">全て終了</div>
                  </div>
                )}
              </div>

              {progressBar}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Debug Panel (DEV ONLY) */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-4 right-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-black/10 transition-opacity opacity-20 hover:opacity-100">
          <span className="text-xs font-bold text-gray-500 mr-1 select-none pointer-events-none">DEBUG<br/>TIME</span>
          <button 
            onClick={() => setDebugOffset(prev => prev - 60000)}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors"
          >-1m</button>
          <button 
            onClick={() => setDebugOffset(prev => prev + 60000)}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors"
          >+1m</button>
          <button 
            onClick={() => setDebugOffset(prev => prev + 3600000)}
            className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors"
          >+1h</button>
          <button 
            onClick={() => setDebugOffset(0)}
            className="px-3 h-10 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center font-bold text-red-700 transition-colors"
          >Reset</button>
        </div>
      )}

    </div>
  );
}
