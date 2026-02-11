
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { AlarmModule } from './components/AlarmModule';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useClock } from './hooks/useClock';

interface BackgroundAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  label?: string;
}

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

interface EEWAlert {
  hypocenter: string;
  time: string;
  isWarning: boolean;
}

// アプリ全体で共有するAudioContext
let globalAudioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
};

// 警告音再生
const playEmergencySound = async (type: 'ALARM' | 'EEW') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // 常に最新の状態にレジューム
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const now = ctx.currentTime;
    
    if (type === 'EEW') {
        // EEW音：554Hzベースのチャイム
        const freqs = [554.37, 659.25, 830.61, 1108.73];
        const rhythm = [0, 0.12, 0.24, 0.36];
        for(let cycle = 0; cycle < 4; cycle++) {
            const offset = cycle * 0.9;
            freqs.forEach((freq, i) => {
                const startTime = now + offset + rhythm[i];
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + 0.7);
            });
        }
    } else {
        // ALARM SOUND: デジタル的な2音の繰り返し
        for (let i = 0; i < 8; i++) {
          const startTime = now + (i * 0.5);
          [880, 1320].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(idx === 0 ? freq : freq * 1.2, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.45);
          });
        }
    }
  } catch (e) {
    console.error("Emergency sound playback failed:", e);
  }
};

const App: React.FC = () => {
  const { date } = useClock();
  const [bgAssets, setBgAssets] = useState<BackgroundAsset[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const [bgVolume, setBgVolume] = useState(0.3);
  const [isBgMuted, setIsBgMuted] = useState(true);
  
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const lastCheckedMinute = useRef<number>(-1);

  const [bgDimming, setBgDimming] = useState(0.85);
  const [bgBlur, setBgBlur] = useState(4);

  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(30);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [activeEEW, setActiveEEW] = useState<EEWAlert | null>(null);

  const [visibility, setVisibility] = useState({
    weather: false,
    earthquake: false,
    timer: false,
    grid: false,
    alarms: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideshowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) setShowTutorial(true);
    const savedVisibility = localStorage.getItem('module_visibility_v3_minimal');
    if (savedVisibility) try { setVisibility(JSON.parse(savedVisibility)); } catch (e) {}
    const savedAlarms = localStorage.getItem('system_alarms_v3');
    if (savedAlarms) try { setAlarms(JSON.parse(savedAlarms)); } catch (e) {}
    const savedDim = localStorage.getItem('bg_dimming');
    const savedBlur = localStorage.getItem('bg_blur');
    if (savedDim) setBgDimming(parseFloat(savedDim));
    if (savedBlur) setBgBlur(parseFloat(savedBlur));
    
    const savedBgVol = localStorage.getItem('bg_volume');
    const savedShuffle = localStorage.getItem('bg_shuffle');
    if (savedBgVol) setBgVolume(parseFloat(savedBgVol));
    if (savedShuffle) setIsShuffle(savedShuffle === 'true');
  }, []);

  useEffect(() => { localStorage.setItem('module_visibility_v3_minimal', JSON.stringify(visibility)); }, [visibility]);
  useEffect(() => { localStorage.setItem('system_alarms_v3', JSON.stringify(alarms)); }, [alarms]);
  useEffect(() => { localStorage.setItem('bg_volume', bgVolume.toString()); }, [bgVolume]);
  useEffect(() => { localStorage.setItem('bg_shuffle', isShuffle.toString()); }, [isShuffle]);

  // EEW 監視
  useEffect(() => {
    if (!isSystemStarted) return;
    const fetchEEWGlobal = async () => {
        try {
            const res = await fetch('https://api.p2pquake.net/v2/history?codes=554&limit=1', { cache: 'no-store' });
            if (!res.ok) return;
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return;
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const latest = data[0];
                const diffSec = (Date.now() - new Date(latest.time).getTime()) / 1000;
                if (diffSec < 180 && !latest.cancelled && latest.earthquake) {
                    const alert = {
                        hypocenter: latest.earthquake.hypocenter.name || '不明',
                        time: latest.time,
                        isWarning: latest.issue.type === 'Warning'
                    };
                    setActiveEEW(prev => {
                      if (!prev || prev.time !== alert.time) {
                        playEmergencySound('EEW');
                        return alert;
                      }
                      return prev;
                    });
                } else {
                    setActiveEEW(null);
                }
            }
        } catch (e) {}
    };
    const interval = setInterval(fetchEEWGlobal, 5000);
    fetchEEWGlobal();
    const handleTestEEW = (e: any) => {
        const detail = e.detail || { hypocenter: "TEST AREA", time: new Date().toISOString() };
        setActiveEEW({ hypocenter: detail.hypocenter, time: detail.time, isWarning: true });
        playEmergencySound('EEW');
    };
    window.addEventListener('test-eew-trigger', handleTestEEW);
    return () => {
        clearInterval(interval);
        window.removeEventListener('test-eew-trigger', handleTestEEW);
    };
  }, [isSystemStarted]);

  // アラームチェック
  useEffect(() => {
    if (!isSystemStarted) return;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    if (currentMinutes === lastCheckedMinute.current) return;
    lastCheckedMinute.current = currentMinutes;
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const matched = alarms.find(a => a.enabled && a.time === timeString);
    if (matched) {
      setTriggeredAlarm(matched);
      playEmergencySound('ALARM');
    }
  }, [date, alarms, isSystemStarted]);

  const handleForceSync = () => {
    setIsSyncing(true);
    // イベントを発火：useClockフックや各ウィジェットが受信する
    window.dispatchEvent(new CustomEvent('system-sync'));
    setTimeout(() => setIsSyncing(false), 1000);
  };

  const nextBackground = useCallback(() => {
    if (bgAssets.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
        setCurrentBgIndex(prev => {
            if (isShuffle) {
                let next;
                do { next = Math.floor(Math.random() * bgAssets.length); } while (next === prev);
                return next;
            }
            return (prev + 1) % bgAssets.length;
        });
        setIsTransitioning(false);
    }, 800);
  }, [bgAssets.length, isShuffle]);

  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    if (isSlideshowActive && bgAssets.length > 1 && isSystemStarted) {
        slideshowTimerRef.current = setInterval(() => {
            const current = bgAssets[currentBgIndex];
            if (current?.type === 'video' && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) return;
            nextBackground();
        }, slideshowInterval * 1000);
    }
    return () => { if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current); };
  }, [isSlideshowActive, slideshowInterval, bgAssets.length, currentBgIndex, isSystemStarted, nextBackground]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && isSystemStarted) {
        video.volume = isBgMuted ? 0 : bgVolume;
        video.muted = isBgMuted;
        if (video.paused) { video.play().catch(() => { video.muted = true; }); }
    }
  }, [bgVolume, isBgMuted, currentBgIndex, isSystemStarted]);

  const handleStartSystem = async () => {
    // AudioContextを初期化してアンロック
    const ctx = getAudioContext();
    if (ctx) {
      // resumeはユーザーアクション内で行う必要がある
      await ctx.resume();
      // 一瞬だけ無音を流してアンロックを確実にする
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
    setIsSystemStarted(true);
    setIsBgMuted(false);
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAssets: BackgroundAsset[] = Array.from(files).map((file: File) => {
        const type = (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov')) ? 'video' : 'image';
        return {
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file as Blob),
          type: type as 'image' | 'video',
          label: file.name.toUpperCase()
        };
      });
      setBgAssets(prev => [...prev, ...newAssets]);
      setCurrentBgIndex(bgAssets.length);
    }
  };

  const handleResetBackgrounds = () => {
    setBgAssets([]);
    setCurrentBgIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentAsset = bgAssets[currentBgIndex] || null;

  return (
    <div className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans">
      
      {activeEEW && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-red-600/95 backdrop-blur-3xl animate-[pulse_0.4s_infinite]">
            <div className="flex flex-col items-center gap-10 p-8 md:p-20 border-[12px] border-white shadow-[0_0_150px_rgba(255,255,255,0.8)] max-w-[95vw] text-center">
                <div className="text-white font-black text-4xl md:text-8xl tracking-widest uppercase mb-4">緊急地震速報</div>
                <div className="bg-white text-red-600 px-10 py-4 text-3xl md:text-6xl font-black rounded-sm shadow-2xl">{activeEEW.hypocenter}</div>
                <div className="text-white font-digital tracking-[0.3em] text-2xl md:text-5xl uppercase font-bold">EARTHQUAKE EARLY WARNING</div>
                <button onClick={() => setActiveEEW(null)} className="mt-10 px-16 py-6 bg-white text-red-600 font-black tracking-[0.5em] text-2xl hover:bg-black hover:text-white transition-all duration-300 rounded-none shadow-xl">解除 / ACKNOWLEDGE</button>
            </div>
        </div>
      )}

      {triggeredAlarm && !activeEEW && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-xl animate-pulse">
            <div className="flex flex-col items-center gap-8 p-10 md:p-16 border-8 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.8)] max-w-[90vw]">
                <div className="text-red-500 font-digital text-7xl md:text-[12rem] leading-none tracking-tighter italic">{triggeredAlarm.time}</div>
                <div className="text-white font-digital tracking-[0.5em] text-xl md:text-4xl uppercase text-center font-bold">{triggeredAlarm.label} DETECTED</div>
                <button onClick={() => setTriggeredAlarm(null)} className="mt-8 px-12 py-4 md:px-20 md:py-6 bg-white text-red-600 font-black tracking-[0.5em] text-xl md:text-2xl hover:bg-red-600 hover:text-white transition-all duration-300">ACKNOWLEDGE</button>
            </div>
        </div>
      )}

      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentAsset && (
            <div className="absolute inset-0">
                {currentAsset.type === 'video' ? (
                    <video ref={videoRef} key={currentAsset.url} autoPlay muted={isBgMuted} playsInline loop={bgAssets.length === 1} onEnded={() => isSlideshowActive && nextBackground()} className="w-full h-full object-cover">
                        <source src={currentAsset.url} />
                    </video>
                ) : (
                    <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${currentAsset.url})` }} />
                )}
                <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: bgDimming, backdropFilter: `blur(${bgBlur}px)`, WebkitBackdropFilter: `blur(${bgBlur}px)` }} />
            </div>
        )}
      </div>

      {!isSystemStarted && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md">
              <button onClick={handleStartSystem} className="group relative px-12 py-4 bg-cyan-900/20 border border-cyan-500 text-cyan-400 font-digital tracking-[0.5em] text-xl hover:bg-cyan-500 hover:text-black transition-all duration-500">INITIALIZE SYSTEM</button>
          </div>
      )}

      <main className="w-full flex flex-col items-center gap-8 md:gap-12 z-10 relative my-auto py-8">
        <section className="w-full flex flex-col items-center py-4 gap-6">
          <MainClock date={date} />
          {visibility.weather && <WeatherWidget />}
          {visibility.earthquake && <EarthquakeWidget />}
        </section>
        {visibility.alarms && <AlarmModule alarms={alarms} setAlarms={setAlarms} />}
        {visibility.timer && <Timer />}
        {visibility.grid && <WorldGrid date={date} />}
      </main>
      
      <LocalMusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {isDisplaySettingsOpen && (
        <div className="fixed bottom-24 right-6 bg-black/95 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl w-80 backdrop-blur-xl max-h-[70vh] overflow-y-auto custom-scrollbar">
            <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-4 border-b border-slate-800 pb-2 flex justify-between items-center">
              <span>SYSTEM CONFIGURATION</span>
              <button onClick={handleForceSync} disabled={isSyncing} className={`text-[8px] px-2 py-0.5 border transition-all ${isSyncing ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-cyan-900/30 border-cyan-800 text-cyan-400 hover:bg-cyan-500 hover:text-black'}`}>
                {isSyncing ? 'SYNCING...' : 'FORCE SYNC'}
              </button>
            </h4>
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries({ weather: 'WEATHER', earthquake: 'DISASTER', alarms: 'ALARM', timer: 'CHRONO', grid: 'WORLD' }).map(([key, label]) => (
                        <button key={key} onClick={() => toggleVisibility(key as any)} className={`px-2 py-2 text-[9px] font-bold tracking-widest border transition-all ${visibility[key as keyof typeof visibility] ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-transparent border-slate-800 text-slate-600'}`}>{label}</button>
                    ))}
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 uppercase">Visual Engine</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-500 font-mono uppercase tracking-widest"><span>Dimming</span><span className="text-cyan-400">{Math.round(bgDimming * 100)}%</span></div>
                      <input type="range" min="0" max="1" step="0.05" value={bgDimming} onChange={(e) => setBgDimming(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] text-slate-500 font-mono uppercase tracking-widest"><span>Blur Intensity</span><span className="text-cyan-400">{bgBlur}px</span></div>
                      <input type="range" min="0" max="20" step="1" value={bgBlur} onChange={(e) => setBgBlur(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500" />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 uppercase">System Diagnostics</h4>
                  <button onClick={() => playEmergencySound('ALARM')} className="w-full text-[8px] py-1.5 border border-cyan-900/50 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all font-bold tracking-widest uppercase mb-2">Test Alarm Sound</button>
                  <button onClick={() => playEmergencySound('EEW')} className="w-full text-[8px] py-1.5 border border-red-900/50 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold tracking-widest uppercase">Test EEW Alert Sound</button>
                </div>

                {bgAssets.length > 0 && (
                   <div className="pt-3 border-t border-slate-800">
                      <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 uppercase">Background Media Controls</h4>
                      <div className="space-y-3">
                        {currentAsset?.type === 'video' && (
                          <div className="space-y-1">
                             <div className="flex justify-between text-[8px] text-slate-500 font-mono uppercase tracking-widest"><span>Video Volume</span><span className="text-cyan-400">{Math.round(bgVolume * 100)}%</span></div>
                             <input type="range" min="0" max="1" step="0.01" value={bgVolume} onChange={(e) => setBgVolume(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500" />
                             <button onClick={() => setIsBgMuted(!isBgMuted)} className={`mt-2 w-full text-[8px] py-1 border transition-all ${isBgMuted ? 'border-red-900/50 text-red-500' : 'border-cyan-900/50 text-cyan-500'}`}>{isBgMuted ? 'UNMUTE VIDEO' : 'MUTE VIDEO'}</button>
                          </div>
                        )}
                        
                        {bgAssets.length > 1 && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                             <button onClick={() => setIsSlideshowActive(!isSlideshowActive)} className={`text-[8px] py-1.5 border transition-all ${isSlideshowActive ? 'border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-600'}`}>{isSlideshowActive ? 'LOOP ON' : 'LOOP OFF'}</button>
                             <button onClick={() => setIsShuffle(!isShuffle)} className={`text-[8px] py-1.5 border transition-all ${isShuffle ? 'border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-600'}`}>{isShuffle ? 'SHUFFLE ON' : 'SHUFFLE OFF'}</button>
                          </div>
                        )}

                        <div className="space-y-1">
                            <div className="flex justify-between text-[8px] text-slate-500 font-mono uppercase tracking-widest"><span>Switch Interval</span><span className="text-cyan-400">{slideshowInterval}s</span></div>
                            <input type="range" min="5" max="300" step="5" value={slideshowInterval} onChange={(e) => setSlideshowInterval(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500" />
                        </div>
                        
                        <button onClick={handleResetBackgrounds} className="w-full mt-2 text-[8px] py-1.5 border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-all font-bold tracking-widest uppercase">Clear All Assets</button>
                      </div>
                   </div>
                )}
            </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-20 hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)} title="Configuration" className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
        <button onClick={() => setIsMusicOpen(!isMusicOpen)} title="Audio Terminal" className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </button>
        <button onClick={() => fileInputRef.current?.click()} title="Import Background" className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/mp4,video/quicktime,.mov" multiple className="hidden" />
      </div>
    </div>
  );
};

export default App;
