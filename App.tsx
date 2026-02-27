import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { AlarmModule } from './components/AlarmModule';
import { useClock } from './hooks/useClock';

/**
 * 背景アセットの型定義
 */
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

// ブラウザの自動再生制限を回避するための共有オーディオコンテキスト
let globalAudioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) globalAudioCtx = new AudioContextClass();
  }
  return globalAudioCtx;
};

// アラーム音（ビープ音）を再生する関数
const playSystemAlarmSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    // 短いビープ音を3回鳴らすパターン
    const createBeep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, startTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    };

    // ピピピ！と鳴らす
    createBeep(now, 1200);
    createBeep(now + 0.15, 1200);
    createBeep(now + 0.3, 1200);

  } catch (e) {
    console.error("Alarm sound error:", e);
  }
};

const App: React.FC = () => {
  // 高精度な時刻同期フック
  const { date } = useClock();

  // --- 状態管理 ---
  const [bgAssets, setBgAssets] = useState<BackgroundAsset[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false); // 設定パネルの開閉
  
  const [isBgMuted, setIsBgMuted] = useState(true);
  const [bgVolume, setBgVolume] = useState(0.5); // 背景動画の音量 (0-1)
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null); // 現在鳴っているアラーム
  const lastTriggeredTime = useRef<string>(""); // 重複発火防止用

  const [bgDimming, setBgDimming] = useState(0.85); // 背景の暗さ (0-1)
  const [bgBlur, setBgBlur] = useState(4);          // 背景のぼかし (px)
  const [isTransitioning, setIsTransitioning] = useState(false); // 切り替えアニメーション用フラグ
  const [activeEEW, setActiveEEW] = useState<EEWAlert | null>(null);

  // 各モジュールの表示・非表示フラグ
  const [visibility, setVisibility] = useState({
    weather: true,
    earthquake: true,
    timer: true,
    grid: true,
    alarms: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // アラーム音のループ再生用タイマー
  const alarmLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 初期化と保存ロジック ---
  useEffect(() => {
    // ローカルストレージからユーザー設定を復元
    const savedVisibility = localStorage.getItem('module_visibility_v5');
    if (savedVisibility) try { setVisibility(JSON.parse(savedVisibility)); } catch (e) {}
    const savedAlarms = localStorage.getItem('system_alarms_v3');
    if (savedAlarms) try { setAlarms(JSON.parse(savedAlarms)); } catch (e) {}
    const savedDim = localStorage.getItem('bg_dimming');
    const savedBlur = localStorage.getItem('bg_blur');
    const savedVol = localStorage.getItem('bg_volume');
    if (savedDim) setBgDimming(parseFloat(savedDim));
    if (savedBlur) setBgBlur(parseFloat(savedBlur));
    if (savedVol) setBgVolume(parseFloat(savedVol));
  }, []);

  // 設定変更時に自動保存
  useEffect(() => { localStorage.setItem('module_visibility_v5', JSON.stringify(visibility)); }, [visibility]);
  useEffect(() => { localStorage.setItem('system_alarms_v3', JSON.stringify(alarms)); }, [alarms]);
  useEffect(() => { localStorage.setItem('bg_dimming', bgDimming.toString()); }, [bgDimming]);
  useEffect(() => { localStorage.setItem('bg_blur', bgBlur.toString()); }, [bgBlur]);
  useEffect(() => { localStorage.setItem('bg_volume', bgVolume.toString()); }, [bgVolume]);

  /**
   * 背景動画の音量を適用
   * 音量が変更されたり、背景が切り替わったりした時にvideoタグへ反映
   */
  useEffect(() => {
    if (videoRef.current) {
        videoRef.current.volume = bgVolume;
    }
  }, [bgVolume, currentBgIndex, isSystemStarted]);

  /**
   * アラーム監視ロジック
   */
  useEffect(() => {
    if (!isSystemStarted) return;

    const currentTimeStr = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    // 同じ時刻(分)ですでに鳴らしていたらスキップ
    if (lastTriggeredTime.current === currentTimeStr) return;

    const matchedAlarm = alarms.find(a => a.enabled && a.time === currentTimeStr);
    
    if (matchedAlarm) {
      setFiringAlarm(matchedAlarm);
      lastTriggeredTime.current = currentTimeStr;
      
      playSystemAlarmSound();
      
      if (alarmLoopRef.current) clearInterval(alarmLoopRef.current);
      alarmLoopRef.current = setInterval(() => {
        playSystemAlarmSound();
      }, 1000);
    }
  }, [date, alarms, isSystemStarted]);

  // アラーム停止処理
  const dismissAlarm = () => {
    if (alarmLoopRef.current) {
        clearInterval(alarmLoopRef.current);
        alarmLoopRef.current = null;
    }
    setFiringAlarm(null);
  };

  /**
   * 背景切り替え処理 (ループロジック)
   */
  const nextBackground = useCallback(() => {
    if (bgAssets.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
        setCurrentBgIndex(prev => (prev + 1) % bgAssets.length);
        setIsTransitioning(false);
    }, 800);
  }, [bgAssets.length]);

  /**
   * 画像背景の自動ループタイマー
   */
  useEffect(() => {
    const currentAsset = bgAssets[currentBgIndex];
    if (bgAssets.length > 1 && currentAsset?.type === 'image') {
        const timer = setTimeout(() => {
            nextBackground();
        }, 20000);
        return () => clearTimeout(timer);
    }
  }, [bgAssets.length, currentBgIndex, nextBackground]);

  // アセットの削除処理
  const removeAsset = (id: string) => {
    setBgAssets(prev => {
        const filtered = prev.filter(a => a.id !== id);
        if (currentBgIndex >= filtered.length) setCurrentBgIndex(Math.max(0, filtered.length - 1));
        return filtered;
    });
  };

  // システム起動
  const handleStartSystem = async () => {
    const ctx = getAudioContext();
    if (ctx) await ctx.resume();
    setIsSystemStarted(true);
    // 起動時は動画の音声はミュート解除するが、音量は設定に従う
    setIsBgMuted(false); 
  };

  // 背景ファイルの読み込み処理
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAssets: BackgroundAsset[] = Array.from(files).map((file: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file as Blob),
        type: (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov')) ? 'video' : 'image',
        label: file.name.toUpperCase()
      }));
      setBgAssets(prev => [...prev, ...newAssets]);
      setCurrentBgIndex(bgAssets.length);
    }
  };

  const currentAsset = bgAssets[currentBgIndex] || null;

  return (
    <div className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans">
      
      {/* アラーム発火時のオーバーレイ */}
      {firingAlarm && (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-cyan-950/90 backdrop-blur-3xl animate-[pulse_0.5s_infinite]">
            <div className="flex flex-col items-center gap-8 p-10 md:p-20 border-y-4 border-cyan-400 w-full bg-black/50 text-center">
                <div className="text-cyan-400 font-digital text-4xl md:text-6xl tracking-widest uppercase animate-bounce">ALARM TRIGGERED</div>
                <div className="text-white text-6xl md:text-9xl font-black font-digital">{firingAlarm.time}</div>
                <div className="text-cyan-200 text-2xl tracking-[0.5em] uppercase border px-6 py-2 border-cyan-500/50">{firingAlarm.label}</div>
                
                <button 
                  onClick={dismissAlarm} 
                  className="mt-8 px-16 py-6 bg-cyan-500 text-black font-black tracking-[0.5em] text-xl md:text-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(6,182,212,0.6)]"
                >
                  DISMISS
                </button>
            </div>
        </div>
      )}

      {/* 緊急地震速報オーバーレイ */}
      {activeEEW && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-red-600/95 backdrop-blur-3xl animate-[pulse_0.4s_infinite]">
            <div className="flex flex-col items-center gap-10 p-8 md:p-20 border-[12px] border-white shadow-[0_0_150px_rgba(255,255,255,0.8)] max-w-[95vw] text-center">
                <div className="text-white font-black text-4xl md:text-8xl tracking-widest uppercase mb-4">緊急地震速報</div>
                <div className="bg-white text-red-600 px-10 py-4 text-3xl md:text-6xl font-black rounded-sm shadow-2xl">{activeEEW.hypocenter}</div>
                <button onClick={() => setActiveEEW(null)} className="mt-10 px-16 py-6 bg-white text-red-600 font-black tracking-[0.5em] text-2xl hover:bg-black hover:text-white transition-all duration-300 shadow-xl">解除 / ACKNOWLEDGE</button>
            </div>
        </div>
      )}

      {/* 背景レイヤー */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentAsset && (
            <div className="absolute inset-0">
                {currentAsset.type === 'video' ? (
                    <video 
                        ref={videoRef} 
                        key={currentAsset.url} 
                        autoPlay 
                        muted={isBgMuted} 
                        playsInline 
                        onEnded={() => nextBackground()}
                        className="w-full h-full object-cover"
                    >
                        <source src={currentAsset.url} />
                    </video>
                ) : (
                    <div className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-700" style={{ backgroundImage: `url(${currentAsset.url})` }} />
                )}
                <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: bgDimming, backdropFilter: `blur(${bgBlur}px)`, WebkitBackdropFilter: `blur(${bgBlur}px)` }} />
            </div>
        )}
      </div>

      {/* システム起動待機画面 */}
      {!isSystemStarted && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md">
              <button onClick={handleStartSystem} className="group relative px-12 py-4 bg-cyan-900/20 border border-cyan-500 text-cyan-400 font-digital tracking-[0.5em] text-xl hover:bg-cyan-500 hover:text-black transition-all duration-500">INITIALIZE SYSTEM</button>
          </div>
      )}

      {/* 設定コントロールパネル */}
      {isDisplaySettingsOpen && (
        <div className="fixed bottom-24 right-6 w-72 max-h-[75vh] bg-slate-900/95 border border-slate-700 p-4 rounded-sm z-50 shadow-2xl backdrop-blur-md animate-[slideIn_0.2s_ease-out] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2 flex-shrink-0">
                <span className="text-cyan-400 font-digital text-xs font-bold tracking-widest uppercase">System_Config</span>
                <button onClick={() => setIsDisplaySettingsOpen(false)} className="text-slate-500 hover:text-white text-xs">✕</button>
            </div>
            
            <div className="overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                {/* 1. モジュール表示管理 */}
                <section className="space-y-3">
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] block mb-2 border-l-2 border-cyan-600 pl-2">Display Modules</span>
                    {Object.keys(visibility).map((key) => (
                        <div key={key} className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-widest">{key}</span>
                            <button 
                                onClick={() => setVisibility(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibility] }))}
                                className={`w-8 h-4 rounded-full relative transition-colors ${visibility[key as keyof typeof visibility] ? 'bg-cyan-600' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${visibility[key as keyof typeof visibility] ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                    ))}
                </section>

                {/* 2. 背景視覚エフェクト調整 */}
                <section className="space-y-4">
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] block mb-2 border-l-2 border-cyan-600 pl-2">Visual Effects</span>
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-[8px] text-slate-400 tracking-widest uppercase">Background Dim: {Math.round(bgDimming * 100)}%</label>
                        </div>
                        <input type="range" min="0" max="1" step="0.05" value={bgDimming} onChange={(e) => setBgDimming(parseFloat(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none accent-cyan-500" />
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-[8px] text-slate-400 tracking-widest uppercase">Blur Intensity: {bgBlur}px</label>
                        </div>
                        <input type="range" min="0" max="20" step="1" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 appearance-none accent-cyan-500" />
                    </div>
                </section>

                {/* 3. 背景音量調整 (追加) */}
                <section className="space-y-4">
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] block mb-2 border-l-2 border-cyan-600 pl-2">Audio Control</span>
                    <div>
                        <div className="flex justify-between mb-1">
                            <label className="text-[8px] text-slate-400 tracking-widest uppercase">BG Video Volume: {Math.round(bgVolume * 100)}%</label>
                            <button 
                                onClick={() => setIsBgMuted(!isBgMuted)} 
                                className={`text-[8px] px-2 rounded-sm border ${isBgMuted ? 'border-red-800 text-red-500 bg-red-950/30' : 'border-cyan-800 text-cyan-500 bg-cyan-950/30'}`}
                            >
                                {isBgMuted ? 'MUTED' : 'ON AIR'}
                            </button>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={bgVolume} 
                            onChange={(e) => {
                                setBgVolume(parseFloat(e.target.value));
                                if(isBgMuted) setIsBgMuted(false); // スライダー操作でミュート解除
                            }} 
                            className="w-full h-1 bg-slate-800 appearance-none accent-cyan-500" 
                        />
                    </div>
                </section>

                {/* 4. 背景アセット管理 */}
                <section>
                    <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] block mb-2 border-l-2 border-cyan-600 pl-2">Asset Library</span>
                    <div className="space-y-2 mt-2">
                        {bgAssets.length === 0 ? (
                            <div className="text-[8px] text-slate-700 italic text-center py-4 border border-dashed border-slate-800">NO LOCAL ASSETS IMPORTED</div>
                        ) : (
                            bgAssets.map((asset, idx) => (
                                <div key={asset.id} className={`flex items-center justify-between p-2 rounded-sm border ${idx === currentBgIndex ? 'bg-cyan-950/30 border-cyan-700' : 'bg-black/40 border-slate-800'}`}>
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <span className={`text-[9px] font-mono truncate max-w-[130px] ${idx === currentBgIndex ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>{asset.label}</span>
                                        <span className="text-[7px] text-slate-600 font-mono uppercase tracking-tighter">{asset.type} • {idx === currentBgIndex ? 'ACTIVE' : 'IDLE'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentBgIndex(idx)} className="text-[8px] text-cyan-600 hover:text-cyan-400 uppercase font-bold tracking-tighter">[SEL]</button>
                                        <button onClick={() => removeAsset(asset.id)} className="text-[8px] text-red-900 hover:text-red-500 uppercase font-bold tracking-tighter">[DEL]</button>
                                    </div>
                                </div>
                            ))
                        )}
                        <button onClick={() => fileInputRef.current?.click()} className="w-full mt-3 py-2 border border-dashed border-slate-700 text-slate-500 hover:border-cyan-500 hover:text-cyan-400 text-[8px] font-bold tracking-widest transition-all uppercase">
                            Import New Background
                        </button>
                    </div>
                </section>
            </div>
        </div>
      )}

      {/* メインコンテンツ */}
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

      {/* 操作インターフェース */}
      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-40 hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)} title="System Configuration" className={`p-3 rounded-full border transition-all ${isDisplaySettingsOpen ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-white'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1
