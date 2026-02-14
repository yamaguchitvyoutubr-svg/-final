
import React, { useState, useEffect, useCallback } from 'react';

// --- Types ---

interface EEWData {
  type: 'EEW';
  time: string;
  hypocenter: string;
  cancelled: boolean;
  isWarning: boolean; 
}

/**
 * 翻訳用辞書 (Prefectures / Regions): 
 * P2P地震情報の日本語地名をスタイリッシュな英語に変換するためのマップです。
 */
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
  "トカラ": "TOKARA", "奄美": "AMAMI",
  "福島県中通り": "FUKUSHIMA NAKADORI",
  "宗谷地方": "SOYA REGION",
  "中越": "CHUETSU",
  "有明海": "ARIAKE SEA"
};

/**
 * 補助的な用語のマップ (Suffixes / Locations):
 * 「近海」「中南部」などの詳細情報を変換します。
 */
const SUFFIX_MAP: Record<string, string> = {
  "県": " PREF", "府": " PREF", "都": " METRO", "道": "", 
  "日本海": " SEA OF JAPAN", "太平洋": " PACIFIC", "オホーツク海": " OKHOTSK", "東シナ海": " EAST CHINA SEA",
  "沿岸": " COAST", "湾": " BAY", "灘": " SEA", "海峡": " STRAIT", "諸島": " ISLANDS", "列島": " ISLANDS",
  "近海": " NEAR SEA", "外洋": " OPEN SEA", "連島": " ISLANDS", "沖": " OFF",
  "北東部": " NORTH EAST", "北西部": " NORTH WEST", "南東部": " SOUTH EAST", "南西部": " SOUTH WEST",
  "北部": " NORTH", "南部": " SOUTH", "東部": " EAST", "西部": " WEST", "中部": " CENTRAL",
  "北東": " NORTH EAST", "北西": " NORTH WEST", "南東": " SOUTH EAST", "南西": " SOUTH WEST",
  "地方": " REGION", "半島": " PENINSULA", "島": " ISLAND",
  "北": " NORTH", "南": " SOUTH", "東": " EAST", "西": " WEST",
  "中南部": " CENTRAL SOUTH"
};

/**
 * 日本語の地名を英語（大文字）に変換するユーティリティ
 */
const translateText = (japaneseText: string): string => {
  if (!japaneseText) return "";
  let text = japaneseText;
  
  // 文字数の長いキーワードから優先的に置換（誤変換を防ぐため）
  const sortedPrefs = Object.keys(PREF_MAP).sort((a, b) => b.length - a.length);
  const sortedSuffixes = Object.keys(SUFFIX_MAP).sort((a, b) => b.length - a.length);

  sortedPrefs.forEach(key => { text = text.split(key).join(PREF_MAP[key]); });
  sortedSuffixes.forEach(key => { text = text.split(key).join(SUFFIX_MAP[key]); });
  
  text = text.replace(/\s+/g, ' ').trim();
  return text.toUpperCase();
};

/**
 * 緊急地震速報 (EEW) モニターコンポーネント:
 * P2PQuake APIを定期的にチェックし、最新の震源情報をリアルタイムに表示します。
 */
export const EarthquakeWidget: React.FC = () => {
  const [eewData, setEewData] = useState<EEWData | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // APIから情報を取得するメイン処理
  const fetchEEW = useCallback(async (silent = true) => {
      if (testMode) return; // テスト中は実際のAPI取得を無視
      try {
        const res = await fetch('https://api.p2pquake.net/v2/history?codes=554&limit=1', { cache: 'no-store' });
        
        if (!res.ok) return;
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) return;

        const json = await res.json();
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        
        if (Array.isArray(json) && json.length > 0) {
            const latestEEW = json[0];
            // 情報の鮮度（180秒以内）をチェック
            const diff = (Date.now() - new Date(latestEEW.time).getTime()) / 1000;
            
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
        }
      } catch (e) {
        if (!silent) console.error("EEW Monitor Error:", e);
      }
  }, [testMode]);

  useEffect(() => {
      // 5秒おきにチェック
      const interval = setInterval(() => fetchEEW(true), 5000);
      fetchEEW(true);

      const handleSystemSync = () => {
          fetchEEW(false);
      };
      window.addEventListener('system-sync', handleSystemSync);

      return () => {
          clearInterval(interval);
          window.removeEventListener('system-sync', handleSystemSync);
      };
  }, [fetchEEW]);

  // デバッグ用のテストアラート発火処理
  const toggleTestMode = () => {
    if (!testMode) {
      setTestMode(true);
      const testEew = { 
        type: 'EEW', 
        time: new Date().toISOString(), 
        hypocenter: translateText("福島県中通り近海 中南部"), 
        cancelled: false, 
        isWarning: true 
      };
      setEewData(testEew as EEWData);
      
      // システム全体に地震速報イベントを飛ばす（警告音のトリガー）
      window.dispatchEvent(new CustomEvent('test-eew-trigger', { 
        detail: { hypocenter: "FUKUSHIMA NAKADORI OFF CENTRAL SOUTH", time: testEew.time } 
      }));
    } else {
      setTestMode(false);
      setEewData(null);
      fetchEEW(false);
    }
  };

  const isEEWActive = !!eewData;
  const borderColor = isEEWActive ? 'border-red-600' : 'border-slate-800';
  const bgColor = isEEWActive ? 'bg-red-950/40' : 'bg-slate-900/40';

  return (
    <div className={`relative flex flex-col items-center mt-4 w-full max-w-2xl transition-all duration-500 h-24 ${!isEEWActive ? 'opacity-50' : 'opacity-100'}`}>
      <div className="w-full flex justify-between items-end mb-1 px-1">
          <div className="flex gap-2">
            <div className={`text-[9px] tracking-widest px-3 py-0.5 rounded-t-sm transition-all border-t border-x ${isEEWActive ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-[#0a0a0a] text-slate-500 border-slate-800'}`}>
                EEW MONITOR {lastSync && `[SYNC: ${lastSync}]`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/40 border border-slate-800">
                <span className={`w-1.5 h-1.5 rounded-full ${isEEWActive ? 'bg-red-500 animate-ping' : 'bg-cyan-500 animate-pulse'}`}></span>
                <span className="text-[9px] text-cyan-500 font-mono tracking-tighter uppercase">REAL-TIME</span>
            </div>
            <button onClick={toggleTestMode} className={`text-[9px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>
                {testMode ? 'EXIT TEST' : 'TEST ALERT'}
            </button>
          </div>
      </div>

      <div className={`w-full bg-[#0a0a0a] border-l-4 pr-6 pl-4 py-3 relative overflow-hidden flex items-center justify-between gap-4 shadow-lg backdrop-blur-md transition-all duration-300 h-24 ${borderColor} ${bgColor}`}>
        {isEEWActive ? (
            <>
                <div className="flex flex-col items-start z-10 min-w-[110px]">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                        <span className="text-[10px] font-black text-red-500">CRITICAL</span>
                    </div>
                    <div className="text-[10px] text-red-400/60 font-mono">{eewData?.time.substring(11, 19)}</div>
                </div>
                <div className="flex-1 flex flex-col items-center z-10 text-center px-2">
                    <span className="text-[10px] text-red-500/80 tracking-widest uppercase font-bold animate-pulse">EARTHQUAKE EARLY WARNING</span>
                    <span className="font-sans font-black tracking-tighter text-2xl text-white break-words leading-tight">{eewData?.hypocenter}</span>
                </div>
                <div className="flex flex-col items-end z-10 min-w-[80px]">
                    <span className="text-[10px] text-red-500 tracking-widest uppercase mb-0.5 font-bold">STATUS</span>
                    <div className="text-xl font-black italic text-red-500 animate-pulse">ALIVE</div>
                </div>
            </>
        ) : (
            <div className="w-full flex items-center justify-center">
                <span className="text-slate-600 tracking-[0.5em] text-[10px] font-mono uppercase italic animate-pulse">
                    Monitoring P2PQuake Feed...
                </span>
            </div>
        )}
      </div>
    </div>
  );
};
