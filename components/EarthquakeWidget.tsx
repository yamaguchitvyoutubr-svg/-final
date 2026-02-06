import React, { useState, useEffect, useRef } from 'react';

// --- Types ---

interface QuakeData {
  type: 'EARTHQUAKE';
  time: string;
  hypocenter: string;
  magnitude: number;
  maxScale: number; // 10=1, ..., 70=7
  depth: number;
}

interface TsunamiArea {
  grade: string; // "MajorWarning", "Warning", "Watch", "Unknown"
  name: string;
}

interface TsunamiData {
  type: 'TSUNAMI';
  time: string;
  cancelled: boolean;
  areas: TsunamiArea[]; // List of affected areas
  maxGrade: string; // For display priority
}

interface EEWData {
  type: 'EEW';
  time: string;
  hypocenter: string;
  cancelled: boolean;
  isWarning: boolean; // true = 警報(Warning), false = 予報(Forecast)
}

type DisplayMode = 'EARTHQUAKE' | 'TSUNAMI' | 'EEW';

// --- Translation Dictionaries ---

const PREF_MAP: Record<string, string> = {
  "北海道": "HOKKAIDO", "青森": "AOMORI", "岩手": "IWATE", "宮城": "MIYAGI", "秋田": "AKITA",
  "山形": "YAMAGATA", "福島": "FUKUSHIMA", "茨城": "IBARAKI", "栃木": "TOCHIGI", "群馬": "GUNMA",
  "埼玉": "SAITAMA", "千葉": "CHIBA", "東京": "TOKYO", "神奈川": "KANAGAWA", "新潟": "NIIGATA",
  "富山": "TOYAMA", "石川": "ISHIKAWA", "福井": "FUKUI", "山梨": "YAMANASHI", "長野": "NAGANO",
  "岐阜": "GIFU", "静岡": "SHIZUOKA", "愛知": "AICHI", "三重": "MIE", "滋賀": "SHIGA",
  "京都": "KYOTO", "大阪": "OSAKA", "兵庫": "HYOGO", "奈良": "NARA", "和歌山": "WAKAYAMA",
  "鳥取": "TOTTORI", "島根": "SHIMANE", "岡山": "OKAYAMA", "広島": "HIROSHIMA", "山口": "YAMAGUCHI",
  "徳島": "TOKUSHIMA", "香川": "KAGAWA", "愛媛": "EHIME", "高知": "KOCHI", "福岡": "FUKUOKA",
  "佐賀": "SAGA", "長崎": "NAGASAKI", "熊本": "KUMAMOTO", "大分": "OITA", "宮崎": "MIYAZAKI",
  "鹿児島": "KAGOSHIMA", "沖縄": "OKINAWA",
  // Specific Regions
  "トカラ": "TOKARA", "奄美": "AMAMI"
};

const SUFFIX_MAP: Record<string, string> = {
  // Prefectures
  "県": " PREF", "府": " PREF", "都": " METRO", "道": "", 
  
  // Oceans & Coasts (For Tsunami)
  "日本海": " SEA OF JAPAN", "太平洋": " PACIFIC", "オホーツク海": " OKHOTSK", "東シナ海": " EAST CHINA SEA",
  "沿岸": " COAST", "湾": " BAY", "灘": " SEA", "海峡": " STRAIT", "諸島": " ISLANDS", "列島": " ISLANDS",
  "近海": " NEAR SEA", "外洋": " OPEN SEA", "連島": " ISLANDS", "沖": " OFF",

  // 3-char Directions (Specific Regions)
  "北東部": " NORTH EAST", "北西部": " NORTH WEST", "南東部": " SOUTH EAST", "南西部": " SOUTH WEST",
  
  // 2-char Directions
  "北部": " NORTH", "南部": " SOUTH", "東部": " EAST", "西部": " WEST", "中部": " CENTRAL",
  "北東": " NORTH EAST", "北西": " NORTH WEST", "南東": " SOUTH EAST", "南西": " SOUTH WEST",

  // Geographical features
  "地方": " REGION", "半島": " PENINSULA", "島": " ISLAND",

  // 1-char Directions (Fallback)
  "北": " NORTH", "南": " SOUTH", "東": " EAST", "西": " WEST"
};

const translateText = (japaneseText: string): string => {
  if (!japaneseText) return "";
  let text = japaneseText;
  
  // 1. Replace Prefectures & Regions
  Object.keys(PREF_MAP).forEach(key => {
    text = text.split(key).join(PREF_MAP[key]);
  });

  // 2. Replace Suffixes
  Object.keys(SUFFIX_MAP).forEach(key => {
    text = text.split(key).join(SUFFIX_MAP[key]);
  });

  // 3. Cleanup
  text = text.replace(/\s+/g, ' ').trim();
  
  return text.toUpperCase();
};

// Helper to convert P2P Quake scale to JMA intensity
const getIntensityLabel = (scale: number): string => {
  if (scale === -1) return 'UNKNOWN';
  if (scale < 10) return '0';
  if (scale === 10) return '1';
  if (scale === 20) return '2';
  if (scale === 30) return '3';
  if (scale === 40) return '4';
  if (scale === 45) return '5- (LOWER)';
  if (scale === 50) return '5+ (UPPER)';
  if (scale === 55) return '6- (LOWER)';
  if (scale === 60) return '6+ (UPPER)';
  if (scale === 70) return '7 (MAX)';
  return '?';
};

// Helper for Tsunami Grades
const getTsunamiGradeLabel = (grade: string): string => {
  switch (grade) {
    case 'MajorWarning': return 'MAJOR WARNING';
    case 'Warning': return 'WARNING';
    case 'Watch': return 'ADVISORY';
    default: return 'INFO';
  }
};

const getTsunamiColor = (grade: string) => {
    switch (grade) {
        case 'MajorWarning': return 'text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]';
        case 'Warning': return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
        case 'Watch': return 'text-yellow-400';
        default: return 'text-cyan-400';
    }
};

// Audio Alert Logic
const playAlertSound = (isEEW: boolean = false) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Create a dissonant, urgent alarm pattern
    const repeat = isEEW ? 5 : 3;
    const interval = isEEW ? 0.4 : 0.6;
    
    for (let i = 0; i < repeat; i++) {
      const startTime = now + i * interval;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc2.type = 'square';
      
      const baseFreq = isEEW ? 1200 : 880;
      const dropFreq = isEEW ? 800 : 600;

      osc1.frequency.setValueAtTime(baseFreq, startTime); 
      osc1.frequency.linearRampToValueAtTime(dropFreq, startTime + (interval * 0.6)); 
      
      osc2.frequency.setValueAtTime(baseFreq + 40, startTime); 
      osc2.frequency.linearRampToValueAtTime(dropFreq + 40, startTime + (interval * 0.6));

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + (interval * 0.5));

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime + (interval * 0.6));
      osc1.stop(startTime + (interval * 0.6));
      osc2.stop(startTime + (interval * 0.6));
    }

  } catch (e) {
    console.error("Alert audio failed", e);
  }
};

export const EarthquakeWidget: React.FC = () => {
  const [quakeData, setQuakeData] = useState<QuakeData | null>(null);
  const [tsunamiData, setTsunamiData] = useState<TsunamiData | null>(null);
  const [eewData, setEewData] = useState<EEWData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [activeMode, setActiveMode] = useState<DisplayMode>('EARTHQUAKE');
  
  // Track monitoring speed (User request: 6s for Emergency)
  const [pollingInterval, setPollingInterval] = useState<number>(30000); // Normal: 30s
  const [lastAlertTime, setLastAlertTime] = useState<string | null>(null);

  // --- Dynamic Polling Logic ---
  useEffect(() => {
    // If EEW is active, or a significant event happened, force 6s polling for everything
    let isEmergency = false;
    if (eewData || (quakeData && quakeData.magnitude >= 6.0) || (tsunamiData && !tsunamiData.cancelled)) {
      isEmergency = true;
    }

    if (!testMode) {
      setPollingInterval(isEmergency ? 6000 : 30000);
    }
  }, [quakeData, tsunamiData, eewData, testMode]);

  // --- Independent Fetchers ---

  const fetchEEW = async (silent = true) => {
      if (testMode || !navigator.onLine) return;
      try {
        const eewRes = await fetch('https://api.p2pquake.net/v2/history?codes=554&limit=5', { cache: 'no-store', headers: { 'Accept': 'application/json' } });
        if (eewRes.ok) {
            const text = await eewRes.text();
            if (text && text.trim().length > 0) {
                const json = JSON.parse(text);
                if (Array.isArray(json) && json.length > 0) {
                    const latestEEW = json[0];
                    const eventTime = new Date(latestEEW.time).getTime();
                    const now = Date.now();
                    const diff = (now - eventTime) / 1000;
                    
                    // Show EEW if within last 3 minutes
                    if (diff < 180 && !latestEEW.cancelled && latestEEW.earthquake) {
                        setEewData({
                            type: 'EEW',
                            time: latestEEW.time,
                            hypocenter: translateText(latestEEW.earthquake.hypocenter.name || 'UNKNOWN'),
                            cancelled: latestEEW.cancelled,
                            isWarning: latestEEW.issue.type === 'Warning'
                        });
                    } else {
                        setEewData(null);
                    }
                } else {
                    setEewData(null);
                }
            }
        }
      } catch (e) {
         if (!silent) console.error("EEW fetch failed", e);
      }
  };

  const fetchDetails = async (silent = true) => {
      if (testMode || !navigator.onLine) return;
      try {
        const [quakeRes, tsunamiRes] = await Promise.all([
            fetch('https://api.p2pquake.net/v2/history?codes=551&limit=20', { cache: 'no-store', headers: { 'Accept': 'application/json' } }),
            fetch('https://api.p2pquake.net/v2/history?codes=552&limit=10', { cache: 'no-store', headers: { 'Accept': 'application/json' } })
        ]);

        if (quakeRes.ok) {
            const text = await quakeRes.text();
            if (text && text.trim().length > 0) {
                const json = JSON.parse(text);
                if (Array.isArray(json) && json.length > 0) {
                    const latestQuake = json[0];
                    if (latestQuake && latestQuake.earthquake) {
                        const q = latestQuake.earthquake;
                        setQuakeData({
                            type: 'EARTHQUAKE',
                            time: q.time,
                            hypocenter: translateText(q.hypocenter.name),
                            magnitude: q.hypocenter.magnitude,
                            maxScale: q.maxScale,
                            depth: q.hypocenter.depth
                        });
                    }
                }
            }
        }

        if (tsunamiRes.ok) {
            const text = await tsunamiRes.text();
            if (text && text.trim().length > 0) {
                const json = JSON.parse(text);
                if (Array.isArray(json) && json.length > 0) {
                    const latestTsunami = json[0];
                    if (latestTsunami && latestTsunami.areas) {
                        const areas: TsunamiArea[] = latestTsunami.areas.map((a: any) => ({
                            grade: a.grade,
                            name: translateText(a.name)
                        }));
                        
                        let maxGrade = 'Unknown';
                        if (areas.some(a => a.grade === 'MajorWarning')) maxGrade = 'MajorWarning';
                        else if (areas.some(a => a.grade === 'Warning')) maxGrade = 'Warning';
                        else if (areas.some(a => a.grade === 'Watch')) maxGrade = 'Watch';
            
                        setTsunamiData({
                            type: 'TSUNAMI',
                            time: latestTsunami.time,
                            cancelled: latestTsunami.cancelled,
                            areas: areas,
                            maxGrade: maxGrade
                        });
                    } else {
                        setTsunamiData(null);
                    }
                }
            }
        }
      } catch (e) {
         if (!silent) console.error("Details fetch failed", e);
      }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchEEW(false), fetchDetails(false)]);
    setLoading(false);
  };

  // --- Pollers ---

  // 1. EEW Poller - STRICT 6s for high speed monitoring
  useEffect(() => {
      if (testMode) return;
      const interval = setInterval(() => fetchEEW(true), 6000);
      fetchEEW(true); 
      return () => clearInterval(interval);
  }, [testMode]);

  // 2. Details Poller - Dynamic (Normal: 30s / Emergency: 6s)
  useEffect(() => {
      if (testMode) return;
      const interval = setInterval(() => fetchDetails(true), pollingInterval);
      fetchDetails(true); 
      return () => clearInterval(interval);
  }, [pollingInterval, testMode]);


  // --- Alert Sound Trigger Logic ---
  useEffect(() => {
      if (testMode) return; 

      let shouldAlert = false;
      let eventTime = '';
      let isEEW = false;

      if (eewData) {
          if (eewData.time !== lastAlertTime) {
              shouldAlert = true;
              eventTime = eewData.time;
              isEEW = true;
          }
      } else {
          if (quakeData && quakeData.maxScale >= 30) {
              if (quakeData.time !== lastAlertTime) {
                  shouldAlert = true;
                  eventTime = quakeData.time;
              }
          }
          if (tsunamiData && !tsunamiData.cancelled) {
              if (tsunamiData.time !== lastAlertTime) {
                  shouldAlert = true;
                  eventTime = tsunamiData.time;
              }
          }
      }

      if (shouldAlert && eventTime) {
          playAlertSound(isEEW);
          setLastAlertTime(eventTime);
          // When a sound triggers, immediately fetch details again to ensure consistency
          fetchDetails(true);
      }

  }, [quakeData, tsunamiData, eewData, lastAlertTime, testMode]);


  // --- Auto Rotation & Mode Override ---
  useEffect(() => {
      if (eewData || (testMode && activeMode === 'EEW')) {
          setActiveMode('EEW');
          return;
      }

      if (testMode) return;
      
      const rotation = setInterval(() => {
          setActiveMode(prev => {
              if (prev === 'EARTHQUAKE') return 'TSUNAMI';
              if (prev === 'TSUNAMI') return 'EARTHQUAKE';
              return 'EARTHQUAKE'; 
          });
      }, 10000);
      return () => clearInterval(rotation);
  }, [testMode, eewData]); 

  // --- Test Simulation ---
  const toggleTestMode = () => {
    if (!testMode) {
      setTestMode(true);
      setActiveMode('EEW'); 
      playAlertSound(true);

      setEewData({
          type: 'EEW',
          time: new Date().toISOString(),
          hypocenter: "TEST AREA (SIMULATION)",
          cancelled: false,
          isWarning: true
      });
      setQuakeData({
        type: 'EARTHQUAKE',
        time: new Date().toISOString(),
        hypocenter: "TEST AREA (SIMULATION)",
        magnitude: 7.8,
        maxScale: 60,
        depth: 10
      });
    } else {
      setTestMode(false);
      setQuakeData(null);
      setTsunamiData(null);
      setEewData(null);
      setLastAlertTime(null);
      setTimeout(handleManualRefresh, 100);
    }
  };

  // --- Render Constants ---

  const isQuakeAlert = quakeData ? quakeData.maxScale >= 30 : false;
  const isQuakeMajor = quakeData ? quakeData.maxScale >= 45 : false;
  const isTsunamiActive = tsunamiData && !tsunamiData.cancelled;
  const isTsunamiMajor = isTsunamiActive && tsunamiData?.maxGrade === 'MajorWarning';
  const isTsunamiWarning = isTsunamiActive && (tsunamiData?.maxGrade === 'Warning' || tsunamiData?.maxGrade === 'MajorWarning');
  const isEEWActive = !!eewData || (testMode && activeMode === 'EEW');

  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900/40';
  let shadow = '';

  if (activeMode === 'EEW') {
      borderColor = 'border-red-500';
      bgColor = 'bg-red-950/40';
      shadow = 'shadow-[0_0_30px_rgba(239,68,68,0.5)]';
  } else if (activeMode === 'EARTHQUAKE') {
      if (isQuakeMajor) {
          borderColor = 'border-red-600';
          bgColor = 'bg-red-950/20';
          shadow = 'shadow-[0_0_20px_rgba(220,38,38,0.3)]';
      } else if (isQuakeAlert) {
          borderColor = 'border-yellow-600';
          bgColor = 'bg-yellow-950/10';
      }
  } else {
      if (isTsunamiMajor) {
          borderColor = 'border-purple-600';
          bgColor = 'bg-purple-950/30';
          shadow = 'shadow-[0_0_20px_rgba(147,51,234,0.4)]';
      } else if (isTsunamiWarning) {
          borderColor = 'border-red-600';
          bgColor = 'bg-red-950/20';
      } else if (isTsunamiActive) {
          borderColor = 'border-yellow-500';
      }
  }

  return (
    <div className={`relative flex flex-col items-center mt-4 w-full max-w-2xl transition-all duration-500 h-28 ${(!quakeData && !tsunamiData && !eewData) ? 'opacity-50' : 'opacity-100'}`}>
      
      {/* Header / Monitoring Rate Info */}
      <div className="w-full flex justify-between items-end mb-1 px-1">
          <div className="flex gap-2">
            {!isEEWActive && (
                <>
                <button 
                    onClick={() => setActiveMode('EARTHQUAKE')}
                    className={`text-[9px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all border-t border-x ${activeMode === 'EARTHQUAKE' ? 'bg-[#0a0a0a] text-cyan-400 border-slate-700' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                >
                    SEISMIC
                </button>
                <button 
                    onClick={() => setActiveMode('TSUNAMI')}
                    className={`text-[9px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all border-t border-x ${activeMode === 'TSUNAMI' ? 'bg-[#0a0a0a] text-cyan-400 border-slate-700' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                >
                    TSUNAMI
                </button>
                </>
            )}
            {isEEWActive && (
                 <div className="bg-red-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-t-sm tracking-widest animate-pulse">
                     EEW ALERT ACTIVE
                 </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Monitoring Rate Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[9px] text-cyan-500 font-mono tracking-tighter uppercase">
                    EEW: 6s / MON: {pollingInterval / 1000}s
                </span>
            </div>
            
            <button 
                onClick={handleManualRefresh}
                disabled={loading}
                className="text-slate-600 hover:text-cyan-400 transition-colors focus:outline-none p-0.5"
                title="Force Refresh (Bypasses interval)"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
            </button>

            <button 
                onClick={toggleTestMode}
                className={`text-[9px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}
            >
                {testMode ? 'EXIT' : 'TEST'}
            </button>
          </div>
      </div>

      {/* Main Monitor Container */}
      <div className={`w-full bg-[#0a0a0a] border-l-4 pr-6 pl-4 py-3 relative overflow-hidden flex items-center justify-between gap-4 shadow-lg backdrop-blur-md transition-all duration-300 h-28 ${borderColor} ${bgColor} ${shadow}`}>
        
        {/* Animated Background Scanline */}
        {(isQuakeAlert || isTsunamiActive || isEEWActive) && (
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shimmer_${isEEWActive ? '0.5s' : '1.5s'}_infinite]`}></div>
        )}

        {activeMode === 'EEW' ? (
            <>
                <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                        <span className="text-[10px] tracking-[0.2em] font-black text-red-500 animate-pulse">
                            EMERGENCY
                        </span>
                    </div>
                    <div className="text-[10px] text-red-400/60 font-mono">
                        POLLED: {new Date().toLocaleTimeString()}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center z-10 text-center px-2">
                    <span className="text-[10px] text-red-500/80 tracking-widest uppercase font-bold mb-0.5 animate-pulse">
                        EARTHQUAKE EARLY WARNING
                    </span>
                    <div className="flex flex-col items-center">
                        <span className="font-sans font-black tracking-tighter text-3xl leading-tight text-white drop-shadow-[0_0_15px_rgba(255,0,0,0.9)]">
                            {eewData ? eewData.hypocenter : '---'}
                        </span>
                        <span className="text-xs text-red-400 mt-1 font-black bg-red-950/50 px-2 py-0.5">
                             {eewData?.isWarning ? 'IMMEDIATE ACTION REQUIRED' : 'PRELIMINARY DATA ACQUIRED'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-red-500 tracking-widest uppercase mb-0.5 font-bold">MODE</span>
                    <div className="text-xl font-black font-sans italic text-red-500 animate-pulse">
                        FAST
                    </div>
                </div>
            </>
        ) : activeMode === 'EARTHQUAKE' ? (
            <>
                <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isQuakeAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div>
                        <span className={`text-[10px] tracking-[0.2em] font-bold ${isQuakeMajor ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                            {isQuakeAlert ? 'LIVE ALERT' : 'MONITORING'}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                        {quakeData ? quakeData.time.substring(0, 16).replace('T', ' ') : 'STANDBY'}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center z-10 text-center">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase mb-0.5">RECENT EPICENTER</span>
                    <span className={`font-sans font-bold tracking-wider text-xl leading-tight ${isQuakeMajor ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'text-slate-200'}`}>
                        {quakeData ? quakeData.hypocenter : '---'}
                    </span>
                    {quakeData && (
                        <span className="text-[10px] text-slate-500 font-mono mt-1">
                        DEPTH: {quakeData.depth}KM / MAG: M{quakeData.magnitude.toFixed(1)}
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase mb-0.5">MAX INTENSITY</span>
                    <div className={`text-2xl font-digital font-bold italic tabular-nums ${isQuakeMajor ? 'text-red-500' : isQuakeAlert ? 'text-yellow-400' : 'text-emerald-400'}`}>
                        {quakeData ? getIntensityLabel(quakeData.maxScale) : '-'}
                    </div>
                </div>
            </>
        ) : (
            <>
                 <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${isTsunamiActive ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></div>
                        <span className={`text-[10px] tracking-[0.2em] font-bold ${isTsunamiMajor ? 'text-purple-400 animate-pulse' : isTsunamiWarning ? 'text-red-500' : 'text-slate-500'}`}>
                            {isTsunamiActive ? 'TSUNAMI' : 'NO THREAT'}
                        </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                        {tsunamiData ? tsunamiData.time.substring(0, 16).replace('T', ' ') : 'CLEAR'}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center z-10 text-center px-2">
                    {isTsunamiActive ? (
                        <>
                            <span className="text-[10px] text-slate-500 tracking-widest uppercase mb-0.5">
                                AFFECTED REGIONS
                            </span>
                            <div className="flex flex-col items-center">
                                <span className={`font-sans font-bold tracking-wider text-md leading-tight ${getTsunamiColor(tsunamiData?.maxGrade || '')}`}>
                                    {tsunamiData?.areas[0].name}
                                </span>
                                {tsunamiData && tsunamiData.areas.length > 1 && (
                                    <span className="text-[10px] text-slate-500 mt-0.5">
                                        + {tsunamiData.areas.length - 1} OTHER LOCATIONS
                                    </span>
                                )}
                            </div>
                        </>
                    ) : (
                         <span className="text-slate-600 tracking-widest text-[10px] font-mono uppercase">
                             Oceanic Seismic Activity Stable
                         </span>
                    )}
                </div>

                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase mb-0.5">MAX GRADE</span>
                    <div className={`text-xl font-bold font-sans italic ${getTsunamiColor(tsunamiData?.maxGrade || '')}`}>
                        {tsunamiData && !tsunamiData.cancelled ? getTsunamiGradeLabel(tsunamiData.maxGrade) : 'NONE'}
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
