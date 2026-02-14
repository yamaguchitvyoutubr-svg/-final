
import React, { useState, useEffect, useRef } from 'react';

type Mode = 'TIMER' | 'STOPWATCH';

/**
 * アラーム音の生成:
 * AudioContextを使用して、ブラウザ上で正弦波（Square wave）を合成します。
 * 外部音声ファイルがなくても、デジタルな警告音を鳴らすことが可能です。
 */
const playAlarm = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    const beepCount = 6;
    const interval = 0.6;
    const duration = 0.3;

    for (let i = 0; i < beepCount; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const startTime = now + (i * interval);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, startTime); 
      osc.frequency.exponentialRampToValueAtTime(440, startTime + duration);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    }

  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const Timer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('TIMER');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [elapsedTime, setElapsedTime] = useState(0); 

  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 重要: タイマーの精度を保つための基準時間保持用
  const endTimeRef = useRef<number>(0);   // タイマー終了予定時刻（絶対時間）
  const startTimeRef = useRef<number>(0); // ストップウォッチ開始時刻（絶対時間）

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    resetTimer();
    setMode(newMode);
  };

  const toggleTimer = () => {
    if (isRunning) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsRunning(false);
    } else {
      if (mode === 'TIMER') {
        let duration = timeLeft;
        if (duration === 0 && !isFinished) {
          duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
          if (duration <= 0) return;
          setTimeLeft(duration);
        }
        // 現在時刻に残り時間を足して、正確な「終了時刻」を固定する
        endTimeRef.current = Date.now() + duration;
      } else {
        // ストップウォッチ: 中断していた場合は再開用に開始時刻を調整
        startTimeRef.current = Date.now() - elapsedTime;
      }
      setIsRunning(true);
    }
  };

  const resetTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRunning(false);
    setIsFinished(false);
    if (mode === 'TIMER') {
        setTimeLeft(0);
    } else {
        setElapsedTime(0);
    }
  };

  /**
   * メインの計測ループ:
   * setIntervalで描画を更新しますが、値の計算には必ず Date.now() を使用します。
   * これにより、タブが背後でスリープしても時刻の計算が狂いません。
   */
  useEffect(() => {
    if (isRunning) {
      const intervalMs = 20; // 滑らかな表示のため約50fpsで更新
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();

        if (mode === 'TIMER') {
            const remaining = endTimeRef.current - now;
            if (remaining <= 0) {
                setTimeLeft(0);
                clearInterval(timerIntervalRef.current!);
                setIsRunning(false);
                setIsFinished(true);
                playAlarm();
            } else {
                setTimeLeft(remaining);
            }
        } else {
            setElapsedTime(now - startTimeRef.current);
        }
      }, intervalMs);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning, mode]);

  const formatTimerDisplay = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStopwatchDisplay = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const msPart = Math.floor((ms % 1000) / 10); 

    return {
        main: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
        sub: `.${msPart.toString().padStart(2, '0')}`
    };
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>, val: string, max: number) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setter(num);
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-md rounded-sm p-6 flex flex-col md:flex-row items-center justify-between gap-6 w-full max-w-4xl shadow-lg relative overflow-hidden min-h-[160px]">
      
      <div className="flex flex-col items-center md:items-start gap-3 flex-1 w-full">
        <div className="flex gap-4 text-sm tracking-widest border-b border-cyan-900/30 pb-1 px-1">
            <button 
                onClick={() => handleModeChange('TIMER')}
                className={`transition-colors hover:text-cyan-300 ${mode === 'TIMER' ? 'text-cyan-400 font-bold border-b-2 border-cyan-500 -mb-1.5 pb-1' : 'text-slate-600'}`}
            >
                TIMER
            </button>
            <button 
                onClick={() => handleModeChange('STOPWATCH')}
                className={`transition-colors hover:text-cyan-300 ${mode === 'STOPWATCH' ? 'text-cyan-400 font-bold border-b-2 border-cyan-500 -mb-1.5 pb-1' : 'text-slate-600'}`}
            >
                STOPWATCH
            </button>
        </div>
        
        <div className="relative flex items-baseline justify-center md:justify-start w-full">
            {mode === 'TIMER' ? (
                <div className={`font-digital text-6xl md:text-7xl tracking-widest tabular-nums font-bold italic transition-colors duration-300 ${isFinished ? 'text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]'}`}>
                    {timeLeft > 0 || isFinished ? formatTimerDisplay(timeLeft) : (
                        <span className="opacity-80">
                            {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
                        </span>
                    )}
                </div>
            ) : (
                <div className="font-digital text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] tracking-widest tabular-nums font-bold italic flex items-baseline">
                    <span className="text-6xl md:text-7xl">{formatStopwatchDisplay(elapsedTime).main}</span>
                    <span className="text-3xl md:text-4xl text-slate-400 ml-2 w-[1.5em]">{formatStopwatchDisplay(elapsedTime).sub}</span>
                </div>
            )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 z-10 mt-2 md:mt-0">
        {mode === 'TIMER' && !isRunning && timeLeft === 0 && !isFinished && (
            <div className="flex gap-3 text-slate-300 font-sans bg-black/20 p-2 rounded-sm animate-[fadeIn_0.2s]">
                <div className="flex flex-col items-center">
                    <input type="number" value={hours} onChange={(e) => handleInputChange(setHours, e.target.value, 99)} className="bg-gray-800 text-white text-center w-14 p-1 rounded border border-slate-700 focus:border-cyan-500 outline-none text-lg font-digital" />
                    <span className="text-[10px] mt-1 text-slate-500">HRS</span>
                </div>
                <div className="flex flex-col items-center">
                    <input type="number" value={minutes} onChange={(e) => handleInputChange(setMinutes, e.target.value, 59)} className="bg-gray-800 text-white text-center w-14 p-1 rounded border border-slate-700 focus:border-cyan-500 outline-none text-lg font-digital" />
                    <span className="text-[10px] mt-1 text-slate-500">MIN</span>
                </div>
                <div className="flex flex-col items-center">
                    <input type="number" value={seconds} onChange={(e) => handleInputChange(setSeconds, e.target.value, 59)} className="bg-gray-800 text-white text-center w-14 p-1 rounded border border-slate-700 focus:border-cyan-500 outline-none text-lg font-digital" />
                    <span className="text-[10px] mt-1 text-slate-500">SEC</span>
                </div>
            </div>
        )}

        <div className="flex gap-3">
            {isFinished && mode === 'TIMER' ? (
                <button onClick={resetTimer} className="px-6 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-sm font-sans tracking-wider transition-colors text-sm">STOP / RESET</button>
            ) : (
                <>
                    <button 
                        onClick={toggleTimer}
                        className={`px-8 py-1.5 rounded-sm font-sans tracking-wider transition-all shadow-lg text-sm min-w-[100px] ${isRunning ? 'bg-yellow-900/40 text-yellow-200 border border-yellow-700/50 hover:bg-yellow-800/40' : 'bg-cyan-900/40 text-cyan-200 border border-cyan-700/50 hover:bg-cyan-800/40'}`}
                    >
                        {isRunning ? 'PAUSE' : 'START'}
                    </button>
                    {(isRunning || (mode === 'TIMER' ? timeLeft > 0 : elapsedTime > 0)) && (
                        <button onClick={resetTimer} className="px-4 py-1.5 bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-sm font-sans tracking-wider transition-colors text-sm">RESET</button>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
