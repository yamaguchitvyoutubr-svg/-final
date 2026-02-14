
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { TimeZoneConfig } from '../types';

interface MainClockProps {
  date: Date;
}

/**
 * 都市検索オーバーレイ: 
 * Open-MeteoのジオコーディングAPIを使用して、英語の都市名から
 * タイムゾーンや位置情報を検索し、選択するための画面です。
 */
const CitySearchOverlay: React.FC<{ 
    onSelect: (config: TimeZoneConfig) => void; 
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 開始時に検索窓にフォーカスを当てる
    useEffect(() => { inputRef.current?.focus(); }, []);

    // APIを叩いて都市を検索する処理
    const search = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            // 無料のジオコーディングAPIを使用
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
            const data = await res.json();
            setResults(data.results || []);
        } catch (e) { console.error("Search error:", e); }
        setLoading(false);
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col p-4 border border-cyan-500/50 animate-[fadeIn_0.2s]">
            <form onSubmit={search} className="flex gap-2 mb-4">
                <input 
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ENTER CITY NAME (EN)..."
                    className="flex-1 bg-transparent border-b border-cyan-500 text-cyan-400 font-mono text-sm outline-none p-1"
                />
                <button type="submit" className="text-cyan-500 hover:text-white px-2 uppercase text-[10px] font-bold">[FIND]</button>
                <button type="button" onClick={onClose} className="text-slate-500 hover:text-red-500 px-2 uppercase text-[10px] font-bold">[X]</button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-2">
                {loading ? <div className="text-cyan-800 text-[10px] animate-pulse">SCANNING GLOBAL DATABASE...</div> : 
                 results.map(r => (
                    <div 
                        key={r.id} 
                        onClick={() => onSelect({
                            id: r.id.toString(),
                            label: r.name.toUpperCase(), // 選択された都市名をラベルにセット
                            subLabel: `${r.name.toUpperCase()} / ${r.country?.toUpperCase() || '---'}`,
                            zone: r.timezone,
                            lat: r.latitude,
                            lon: r.longitude
                        })}
                        className="p-2 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-950/20 cursor-pointer group transition-all"
                    >
                        <div className="text-xs text-slate-300 font-bold group-hover:text-cyan-400">{r.name}, {r.country}</div>
                        <div className="text-[8px] text-slate-600 font-mono">{r.timezone}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * サブクロック（メイン時計の下にある小さな時計）:
 * ユーザーがクリックすることで、その場所の都市を変更できます。
 */
const SubClock: React.FC<{ config: TimeZoneConfig; date: Date; color: string; onEdit: () => void }> = ({ config, date, color, onEdit }) => {
  // 指定されたタイムゾーンの時刻を計算
  const time = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: config.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date, config.zone]);

  // 表示用の都市名を抽出（国名を含まない形式）
  const cityName = useMemo(() => {
    if (config.subLabel) {
      return config.subLabel.split('/')[0].trim();
    }
    return config.label;
  }, [config]);

  return (
    <div 
        onClick={onEdit}
        className="flex flex-col items-center px-4 md:px-10 border-x border-slate-900/30 first:border-l-0 last:border-r-0 cursor-pointer hover:bg-white/5 transition-colors group"
    >
      <span className={`text-[8px] md:text-[10px] tracking-[0.3em] font-bold ${color} mb-1 opacity-70 uppercase group-hover:opacity-100 group-hover:text-cyan-400 transition-all`}>
          {cityName}
      </span>
      <span className="font-digital text-lg md:text-3xl tracking-[0.1em] text-slate-300 tabular-nums font-medium group-hover:text-white">
        {time}
      </span>
    </div>
  );
};

/**
 * カレンダー表示モジュール: 
 * 現在の日付・月・年・曜日をスタイリッシュに表示します。
 */
const CalendarWidget: React.FC<{ date: Date }> = ({ date }) => {
    const month = useMemo(() => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(), [date]);
    const day = useMemo(() => date.getDate().toString().padStart(2, '0'), [date]);
    const year = useMemo(() => date.getFullYear(), [date]);
    const weekday = useMemo(() => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase(), [date]);

    return (
        <div className="flex flex-col items-center lg:items-end justify-center w-32 md:w-48 gap-1 md:gap-3 select-none">
            <div className="w-full text-center lg:text-right">
                <div className="text-[8px] md:text-[10px] text-cyan-600 tracking-[0.2em] md:tracking-[0.4em] font-mono mb-0.5 md:mb-1 uppercase">Date Module</div>
                <div className="text-[8px] md:text-[9px] text-slate-500 font-sans tracking-widest uppercase">{month} / {year}</div>
            </div>
            <div className="flex flex-col items-center lg:items-end border-slate-800 lg:border-r-2 lg:pr-3 py-1 gap-0.5 md:gap-1">
                <div className="text-3xl md:text-5xl font-digital text-white leading-none tracking-tighter italic">{day}</div>
                <div className="text-[8px] md:text-[10px] font-digital text-cyan-500/80 tracking-[0.1em] md:tracking-[0.2em] font-bold mt-0.5 md:mt-1">{weekday}</div>
            </div>
        </div>
    );
};

/**
 * カウントダウンウィジェット: 
 * 目標時刻までの残り時間を計算します。デフォルトは翌日の0時です。
 */
const CountdownWidget: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
    // localStorageから保存された目標時間を取得
    const [targetDateStr, setTargetDateStr] = useState<string>(localStorage.getItem('system_countdown_target') || "");
    const [isEditing, setIsEditing] = useState(false);

    // 残り時間の計算ロジック
    const timeLeft = useMemo(() => {
        let target: number;
        if (targetDateStr) {
            target = new Date(targetDateStr).getTime();
        } else {
            // 目標設定がない場合は「今日の深夜0時」をデフォルトに
            const nextMidnight = new Date(currentDate);
            nextMidnight.setHours(24, 0, 0, 0);
            target = nextMidnight.getTime();
        }
        const diff = target - currentDate.getTime();
        if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
        return {
            d: Math.floor(diff / (1000 * 60 * 60 * 24)),
            h: Math.floor((diff / (1000 * 60 * 60)) % 24),
            m: Math.floor((diff / (1000 * 60)) % 60),
            s: Math.floor((diff / 1000) % 60),
            expired: false
        };
    }, [targetDateStr, currentDate]);

    // 保存処理
    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newTarget = formData.get('target') as string;
        if (newTarget) {
            setTargetDateStr(newTarget);
            localStorage.setItem('system_countdown_target', newTarget);
        }
        setIsEditing(false);
    };

    // リセット処理
    const handleReset = () => {
        setTargetDateStr("");
        localStorage.removeItem('system_countdown_target');
        setIsEditing(false);
    };

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4 select-none relative group">
            <div className="w-full">
                <div className="flex justify-between items-end border-b border-slate-800 pb-1 mb-2">
                    <div className="text-[10px] text-cyan-600 tracking-widest font-mono uppercase">Countdown</div>
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-[8px] text-slate-600 hover:text-cyan-400 transition-colors uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100">[SET]</button>
                    )}
                </div>
                {isEditing ? (
                    <form onSubmit={handleSave} className="space-y-2 animate-[fadeIn_0.2s] bg-slate-900/95 p-2 border border-slate-700 rounded-sm z-50 shadow-2xl">
                        <input name="target" type="datetime-local" defaultValue={targetDateStr} className="w-full bg-black border border-slate-700 text-[10px] text-white p-1 rounded-sm focus:border-cyan-500 outline-none" />
                        <div className="flex gap-1">
                            <button type="submit" className="flex-1 bg-cyan-900/40 text-cyan-400 text-[8px] py-1 border border-cyan-800 hover:bg-cyan-500 hover:text-black transition-all">SET</button>
                            <button type="button" onClick={handleReset} className="flex-1 bg-red-900/40 text-red-400 text-[8px] py-1 border border-red-800 hover:bg-red-500 hover:text-white transition-all">CLR</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3 cursor-pointer" onClick={() => setIsEditing(true)}>
                        <div className="flex flex-col gap-2 border-l border-slate-800 pl-3">
                            <div className="flex justify-between items-baseline">
                                <span className={`text-[24px] font-digital leading-none italic ${timeLeft.expired ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft.d}</span>
                                <span className="text-[8px] text-slate-500 tracking-widest uppercase">Days</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <div className={`flex gap-2 font-digital text-lg italic ${timeLeft.expired ? 'text-red-900' : 'text-cyan-400'}`}>
                                    <span>{timeLeft.h.toString().padStart(2, '0')}</span><span className="animate-pulse">:</span><span>{timeLeft.m.toString().padStart(2, '0')}</span><span className="animate-pulse">:</span><span>{timeLeft.s.toString().padStart(2, '0')}</span>
                                </div>
                                <span className="text-[8px] text-slate-600 font-mono uppercase">Remain</span>
                            </div>
                        </div>
                        <div className="text-[7px] text-slate-700 font-mono tracking-widest uppercase pl-3 truncate w-full">
                            {targetDateStr ? `TO: ${targetDateStr.replace('T', ' ')}` : "DEF: NEXT MIDNIGHT"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * メインクロックコンポーネント: 
 * 画面中央の巨大なデジタル時計と、その下の2つのサブ時計、カレンダー、カウントダウンを統合します。
 */
export const MainClock: React.FC<MainClockProps> = ({ date }) => {
  // サブ時計1の状態管理（localStorageから復元）
  const [sub1, setSub1] = useState<TimeZoneConfig>(() => {
    const saved = localStorage.getItem('main_sub1');
    return saved ? JSON.parse(saved) : { id: 'ru', label: 'MOSCOW', zone: 'Europe/Moscow', subLabel: 'MOSCOW / RUSSIA' };
  });
  // サブ時計2の状態管理（localStorageから復元）
  const [sub2, setSub2] = useState<TimeZoneConfig>(() => {
    const saved = localStorage.getItem('main_sub2');
    return saved ? JSON.parse(saved) : { id: 'us-ny', label: 'NEW YORK', zone: 'America/New_York', subLabel: 'NEW YORK / USA' };
  });
  // 現在どのスロットを編集中か（1または2、編集してなければnull）
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // 設定変更時にlocalStorageへ自動保存
  useEffect(() => { localStorage.setItem('main_sub1', JSON.stringify(sub1)); }, [sub1]);
  useEffect(() => { localStorage.setItem('main_sub2', JSON.stringify(sub2)); }, [sub2]);

  const timeString = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[95%] gap-6 md:gap-16 animate-[fadeIn_1s_ease-out] relative">
        {/* 都市編集中の場合に検索窓を重ねて表示 */}
        {editingSlot !== null && (
            <div className="absolute inset-x-0 -top-20 z-[110] flex justify-center">
                <div className="w-80 h-64 shadow-2xl">
                    <CitySearchOverlay 
                        onClose={() => setEditingSlot(null)}
                        onSelect={(conf) => {
                            if (editingSlot === 1) setSub1(conf);
                            else setSub2(conf);
                            setEditingSlot(null);
                        }}
                    />
                </div>
            </div>
        )}

        <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-6 lg:gap-16">
            <CalendarWidget date={date} />
            <div className="flex flex-col items-center select-none z-10 flex-1">
                <div className="text-slate-800 text-[8px] md:text-xs mb-2 md:mb-4 font-bold tracking-[0.5em] md:tracking-[1em] uppercase">Primary Time Engine</div>
                <div className="font-digital text-6xl md:text-[10rem] leading-none tracking-tight md:tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative px-2 md:px-12">
                    <span className="hidden md:inline-block absolute left-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20">[</span>
                    {timeString}
                    <span className="hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20">]</span>
                </div>
                {/* サブ表示エリア：各都市をクリックして編集可能 */}
                <div className="mt-4 md:mt-6 flex flex-row justify-center gap-2">
                    <SubClock config={sub1} date={date} color="text-slate-400" onEdit={() => setEditingSlot(1)} />
                    <SubClock config={sub2} date={date} color="text-cyan-500/80" onEdit={() => setEditingSlot(2)} />
                </div>
                <div className="mt-8 md:mt-12 w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            </div>
            <CountdownWidget currentDate={date} />
        </div>
    </div>
  );
};
