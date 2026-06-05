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
}

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

  let status: StatusResult = { type: 'after' };
  
  if (settings.timetable && settings.timetable.length > 0) {
    let found = false;
    for (let i = 0; i < settings.timetable.length; i++) {
      const currentClass = settings.timetable[i];
      const startMin = timeToMinutes(currentClass.start);
      const endMin = timeToMinutes(currentClass.end);
      
      if (nowMinutes >= startMin && nowMinutes < endMin) {
        status = { type: 'class', currentClass, passedMin: nowMinutes - startMin };
        found = true;
        break;
      }
      
      if (i < settings.timetable.length - 1) {
        const nextClass = settings.timetable[i + 1];
        const nextStartMin = timeToMinutes(nextClass.start);
        if (nowMinutes >= endMin && nowMinutes < nextStartMin) {
          status = { type: 'break', prevClass: currentClass, nextClass, remainingMin: nextStartMin - nowMinutes };
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      const firstStartMin = timeToMinutes(settings.timetable[0].start);
      if (nowMinutes < firstStartMin) {
        status = { type: 'before', nextClass: settings.timetable[0] };
      }
    }
  }

  // Determine theme colors based on status
  let themeBg = 'bg-gray-100';
  let themeText = 'text-gray-800';
  let themeLeftBg = 'bg-gray-200';

  if (status.type === 'class') {
    themeBg = 'bg-sky-50';
    themeText = 'text-sky-900';
    themeLeftBg = 'bg-sky-200';
  } else if (status.type === 'break') {
    themeBg = 'bg-amber-50';
    themeText = 'text-amber-900';
    themeLeftBg = 'bg-amber-200';
  }

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
            className="fixed top-6 right-6 bg-white/95 backdrop-blur shadow-2xl p-6 rounded-2xl border-l-8 border-orange-500 z-50 flex flex-col"
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
      <div className="flex-[3] flex flex-col justify-center items-center border-b-2 border-black/5">
        <div className="text-4xl md:text-5xl lg:text-6xl font-bold opacity-80 mb-4 tracking-wider">
          {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日({days[now.getDay()]})
        </div>
        <div className="text-[18vw] font-black leading-none tracking-tighter tabular-nums drop-shadow-sm">
          {String(now.getHours()).padStart(2, '0')}:
          {String(now.getMinutes()).padStart(2, '0')}:
          {String(now.getSeconds()).padStart(2, '0')}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex-[2] flex flex-col md:flex-row">
        
        {/* Status Display */}
        <div className={clsx("flex-1 flex justify-center items-center text-[8vw] md:text-[6vw] font-black border-r-0 md:border-r-2 border-black/5 transition-colors duration-1000 text-center p-4 leading-none tracking-tight", themeLeftBg)}>
          {status.type === 'class' && status.currentClass?.name}
          {status.type === 'break' && `${status.prevClass?.name.replace('限','')} ⇒ ${status.nextClass?.name.replace('限','')}`}
          {status.type === 'before' && "開室中"}
          {status.type === 'after' && "授業終了"}
        </div>

        {/* Info Display */}
        <div className="flex-[2] flex flex-col xl:flex-row justify-around items-center p-4 md:p-8 transition-colors duration-1000 gap-8 bg-black/5 md:bg-transparent overflow-hidden w-full">
          {status.type === 'class' && (
            <>
              <div className="flex flex-col justify-center items-start">
                <div className="text-4xl md:text-[4vw] font-bold opacity-70 mb-2 leading-none">{status.currentClass?.start} ~</div>
                <div className="text-7xl md:text-[10vw] lg:text-[12vw] font-black leading-none tracking-tighter">{status.currentClass?.end}</div>
              </div>
              <div className="flex flex-col justify-center items-center bg-white/40 p-6 md:px-10 md:py-6 rounded-3xl md:rounded-[3rem] shadow-sm backdrop-blur-sm mt-2">
                <span className="text-6xl md:text-[6vw] lg:text-[8vw] font-black leading-none tracking-tighter text-center">
                  {status.passedMin}<span className="text-2xl md:text-[2.5vw] ml-2 md:ml-4 font-bold tracking-normal">min</span>
                </span>
                <span className="text-2xl md:text-[2.5vw] font-bold opacity-80 mt-2 leading-none">経過</span>
              </div>
            </>
          )}
          {status.type === 'break' && (
            <>
              <div className="flex flex-col justify-center items-start">
                <div className="text-4xl md:text-[4vw] font-bold opacity-70 mb-2 leading-none">次枠</div>
                <div className="text-7xl md:text-[10vw] lg:text-[12vw] font-black leading-none tracking-tighter">{status.nextClass?.start} ~</div>
              </div>
              <div className="flex flex-col justify-center items-center bg-white/40 p-6 md:px-10 md:py-6 rounded-3xl md:rounded-[3rem] shadow-sm backdrop-blur-sm mt-2">
                <span className="text-2xl md:text-[2.5vw] font-bold opacity-80 mb-2 leading-none">開始まで...</span>
                <span className="text-6xl md:text-[6vw] lg:text-[8vw] font-black leading-none tracking-tighter text-center">
                  {status.remainingMin}<span className="text-2xl md:text-[2.5vw] ml-2 md:ml-4 font-bold tracking-normal">min</span>
                </span>
              </div>
            </>
          )}

          {status.type === 'before' && (
            <div className="flex flex-col justify-center items-center w-full">
              <div className="text-3xl font-bold opacity-70 mb-2">最初の授業</div>
              <div className="text-6xl lg:text-8xl font-black">{status.nextClass?.start}</div>
            </div>
          )}

          {status.type === 'after' && (
            <div className="flex flex-col justify-center items-center w-full">
              <div className="text-3xl font-bold opacity-70 mb-2">本日の授業は</div>
              <div className="text-5xl lg:text-7xl font-black">全て終了</div>
            </div>
          )}
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
