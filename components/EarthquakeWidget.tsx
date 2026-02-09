
import React, { useState, useEffect, useRef } from 'react';

// --- Types ---

interface QuakeData {
  type: 'EARTHQUAKE';
  time: string;
  hypocenter: string;
  magnitude: number;
  maxScale: number; 
  depth: number;
}

interface TsunamiArea {
  grade: string; 
  name: string;
}

interface TsunamiData {
  type: 'TSUNAMI';
  time: string;
  cancelled: boolean;
  areas: TsunamiArea[]; 
  maxGrade: string; 
}

interface EEWData {
  type: 'EEW';
  time: string;
  hypocenter: string;
  cancelled: boolean;
  isWarning: boolean; 
}

type DisplayMode = 'EARTHQUAKE' | 'TSUNAMI' | 'EEW';

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
  "トカラ": "TOKARA", "奄美": "AMAMI"
};

const SUFFIX_MAP: Record<string, string> = {
  "県": " PREF", "府": " PREF", "都": " METRO", "道": "", 
  "日本海": " SEA OF JAPAN", "太平洋": " PACIFIC", "オホーツク海": " OKHOTSK", "東シナ海": " EAST CHINA SEA",
  "沿岸": " COAST", "湾": " BAY", "灘": " SEA", "海峡": " STRAIT", "諸島": " ISLANDS", "列島": " ISLANDS",
  "近海": " NEAR SEA", "外洋": " OPEN SEA", "連島": " ISLANDS", "沖": " OFF",
  "北東部": " NORTH EAST", "北西部": " NORTH WEST", "南東部": " SOUTH EAST", "南西部": " SOUTH WEST",
  "北部": " NORTH", "南部": " SOUTH", "東部": " EAST", "西部": " WEST", "中部": " CENTRAL",
  "北東": " NORTH EAST", "北西": " NORTH WEST", "南東": " SOUTH EAST", "南西": " SOUTH WEST",
  "地方": " REGION", "半島": " PENINSULA", "島": " ISLAND",
  "北": " NORTH", "南": " SOUTH", "東": " EAST", "西": " WEST"
};

const translateText = (japaneseText: string): string => {
  if (!japaneseText) return "";
  let text = japaneseText;
  Object.keys(PREF_MAP).forEach(key => { text = text.split(key).join(PREF_MAP[key]); });
  Object.keys(SUFFIX_MAP).forEach(key => { text = text.split(key).join(SUFFIX_MAP[key]); });
  text = text.replace(/\s+/g, ' ').trim();
  return text.toUpperCase();
};

const getIntensityLabel = (scale: number): string => {
  if (scale === -1) return 'UNKNOWN';
  if (scale < 10) return '0';
  if (scale === 10) return '1';
  if (scale === 20) return '2';
  if (scale === 30) return '3';
  if (scale === 40) return '4';
  if (scale === 45) return '5-';
  if (scale === 50) return '5+';
  if (scale === 55) return '6-';
  if (scale === 60) return '6+';
  if (scale === 70) return '7';
  return '?';
};

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

export const EarthquakeWidget: React.FC = () => {
  const [quakeData, setQuakeData] = useState<QuakeData | null>(null);
  const [tsunamiData, setTsunamiData] = useState<TsunamiData | null>(null);
  const [eewData, setEewData] = useState<EEWData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [activeMode, setActiveMode] = useState<DisplayMode>('EARTHQUAKE');
  const [pollingInterval] = useState<number>(6000); 
  const [lastAlertTime, setLastAlertTime] = useState<string | null>(null);

  const fetchEEW = async (silent = true) => {
      if (testMode) return;
      try {
        const eewRes = await fetch('https://api.p2pquake.net/v2/history?codes=554&limit=5', { cache: 'no-store' });
        if (eewRes.ok) {
            const json = await eewRes.json();
            if (Array.isArray(json) && json.length > 0) {
                const latestEEW = json[0];
                const diff = (Date.now() - new Date(latestEEW.time).getTime()) / 1000;
                if (diff < 180 && !latestEEW.cancelled && latestEEW.earthquake) {
                    setEewData({
                        type: 'EEW',
                        time: latestEEW.time,
                        hypocenter: translateText(latestEEW.earthquake.hypocenter.name || 'UNKNOWN'),
                        cancelled: latestEEW.cancelled,
                        isWarning: latestEEW.issue.type === 'Warning'
                    });
                } else { setEewData(null); }
            }
        }
      } catch (e) { if (!silent) console.error(e); }
  };

  const fetchDetails = async (silent = true) => {
      if (testMode) return;
      try {
        const [quakeRes, tsunamiRes] = await Promise.all([
            fetch('https://api.p2pquake.net/v2/history?codes=551&limit=5', { cache: 'no-store' }),
            fetch('https://api.p2pquake.net/v2/history?codes=552&limit=5', { cache: 'no-store' })
        ]);
        if (quakeRes.ok) {
            const json = await quakeRes.json();
            if (Array.isArray(json) && json.length > 0) {
                const q = json[0].earthquake;
                setQuakeData({
                    type: 'EARTHQUAKE', time: q.time, hypocenter: translateText(q.hypocenter.name),
                    magnitude: q.hypocenter.magnitude, maxScale: json[0].earthquake.maxScale, depth: q.hypocenter.depth
                });
            }
        }
        if (tsunamiRes.ok) {
            const json = await tsunamiRes.json();
            if (Array.isArray(json) && json.length > 0) {
                const areas = json[0].areas.map((a: any) => ({ grade: a.grade, name: translateText(a.name) }));
                let maxGrade = 'Unknown';
                if (areas.some((a:any) => a.grade === 'MajorWarning')) maxGrade = 'MajorWarning';
                else if (areas.some((a:any) => a.grade === 'Warning')) maxGrade = 'Warning';
                else if (areas.some((a:any) => a.grade === 'Watch')) maxGrade = 'Watch';
                setTsunamiData({ type: 'TSUNAMI', time: json[0].time, cancelled: json[0].cancelled, areas, maxGrade });
            }
        }
      } catch (e) { if (!silent) console.error(e); }
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchEEW(false), fetchDetails(false)]);
    setLoading(false);
  };

  useEffect(() => {
      if (testMode) return;
      const interval = setInterval(() => fetchEEW(true), 6000);
      fetchEEW(true); 
      return () => clearInterval(interval);
  }, [testMode]);

  useEffect(() => {
      if (testMode) return;
      const interval = setInterval(() => fetchDetails(true), pollingInterval);
      fetchDetails(true); 
      return () => clearInterval(interval);
  }, [testMode]);

  // システム同期イベントの購読
  useEffect(() => {
    const handleSystemSync = () => {
        handleManualRefresh();
    };
    window.addEventListener('system-sync', handleSystemSync);
    return () => window.removeEventListener('system-sync', handleSystemSync);
  }, []);

  const toggleTestMode = () => {
    if (!testMode) {
      setTestMode(true);
      setActiveMode('EEW'); 
      setEewData({ type: 'EEW', time: new Date().toISOString(), hypocenter: "TEST AREA", cancelled: false, isWarning: true });
    } else {
      setTestMode(false);
      setEewData(null);
      handleManualRefresh();
    }
  };

  const isQuakeAlert = quakeData ? quakeData.maxScale >= 30 : false;
  const isTsunamiActive = tsunamiData && !tsunamiData.cancelled;
  const isEEWActive = !!eewData;

  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900/40';

  if (activeMode === 'EEW') {
      borderColor = 'border-red-500'; bgColor = 'bg-red-950/40';
  } else if (activeMode === 'EARTHQUAKE') {
      if (isQuakeAlert) borderColor = 'border-yellow-600';
  } else {
      if (isTsunamiActive) borderColor = 'border-yellow-500';
  }

  return (
    <div className={`relative flex flex-col items-center mt-4 w-full max-w-2xl transition-all duration-500 h-28 ${(!quakeData && !tsunamiData && !eewData) ? 'opacity-50' : 'opacity-100'}`}>
      <div className="w-full flex justify-between items-end mb-1 px-1">
          <div className="flex gap-2">
            {!isEEWActive && (
                <>
                <button onClick={() => setActiveMode('EARTHQUAKE')} className={`text-[9px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all border-t border-x ${activeMode === 'EARTHQUAKE' ? 'bg-[#0a0a0a] text-cyan-400 border-slate-700' : 'text-slate-600 border-transparent hover:text-slate-400'}`}>SEISMIC</button>
                <button onClick={() => setActiveMode('TSUNAMI')} className={`text-[9px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all border-t border-x ${activeMode === 'TSUNAMI' ? 'bg-[#0a0a0a] text-cyan-400 border-slate-700' : 'text-slate-600 border-transparent hover:text-slate-400'}`}>TSUNAMI</button>
                </>
            )}
            {isEEWActive && <div className="bg-red-600 text-white text-[9px] font-bold px-3 py-0.5 rounded-t-sm tracking-widest animate-pulse">EEW ALERT ACTIVE</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[9px] text-cyan-500 font-mono tracking-tighter uppercase">HIGH-SPEED</span>
            </div>
            <button onClick={toggleTestMode} className={`text-[9px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>{testMode ? 'EXIT' : 'TEST'}</button>
          </div>
      </div>

      <div className={`w-full bg-[#0a0a0a] border-l-4 pr-6 pl-4 py-3 relative overflow-hidden flex items-center justify-between gap-4 shadow-lg backdrop-blur-md transition-all duration-300 h-28 ${borderColor} ${bgColor}`}>
        {activeMode === 'EEW' ? (
            <>
                <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div><span className="text-[10px] font-black text-red-500">EMERGENCY</span></div>
                    <div className="text-[10px] text-red-400/60 font-mono">LIVE</div>
                </div>
                <div className="flex-1 flex flex-col items-center z-10 text-center px-2">
                    <span className="text-[10px] text-red-500/80 tracking-widest uppercase font-bold animate-pulse">EARTHQUAKE EARLY WARNING</span>
                    <span className="font-sans font-black tracking-tighter text-3xl text-white">{eewData?.hypocenter}</span>
                </div>
                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-red-500 tracking-widest uppercase mb-0.5 font-bold">MODE</span>
                    <div className="text-xl font-black italic text-red-500 animate-pulse">FAST</div>
                </div>
            </>
        ) : activeMode === 'EARTHQUAKE' ? (
            <>
                <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${isQuakeAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`}></div><span className="text-[10px] text-slate-500">MONITORING</span></div>
                    <div className="text-[10px] text-slate-600 font-mono">{quakeData?.time.substring(11, 19)}</div>
                </div>
                <div className="flex-1 flex flex-col items-center z-10 text-center">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase">RECENT EPICENTER</span>
                    <span className="font-sans font-bold text-xl text-slate-200">{quakeData?.hypocenter || '---'}</span>
                </div>
                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase">INTENSITY</span>
                    <div className="text-2xl font-digital font-bold italic text-emerald-400">{quakeData ? getIntensityLabel(quakeData.maxScale) : '-'}</div>
                </div>
            </>
        ) : (
            <>
                 <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1"><div className={`w-2 h-2 rounded-full ${isTsunamiActive ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`}></div><span className="text-[10px] text-slate-500">TSUNAMI</span></div>
                    <div className="text-[10px] text-slate-600 font-mono">{tsunamiData?.time.substring(11, 19)}</div>
                </div>
                <div className="flex-1 flex flex-col items-center z-10 text-center px-2">
                    <span className="text-slate-600 tracking-widest text-[10px] font-mono uppercase">Oceanic Stability: Normal</span>
                </div>
                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase">GRADE</span>
                    <div className="text-xl font-bold font-sans italic text-cyan-400">{tsunamiData && !tsunamiData.cancelled ? getTsunamiGradeLabel(tsunamiData.maxGrade) : 'NONE'}</div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};
