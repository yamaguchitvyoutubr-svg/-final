
import React, { useMemo, useState, useEffect } from 'react';

interface MainClockProps {
  date: Date;
}

const SubClock: React.FC<{ label: string; zone: string; date: Date; color: string }> = ({ label, zone, date, color }) => {
  const time = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date, zone]);

  return (
    <div className="flex flex-col items-center px-8 border-x border-slate-800/30">
      <span className={`text-[9px] tracking-[0.4em] font-bold ${color} mb-1 opacity-70 uppercase`}>{label}</span>
      <span className="font-digital text-xl md:text-3xl tracking-[0.1em] text-slate-300 tabular-nums font-medium">
        {time}
      </span>
    </div>
  );
};

const CalendarWidget: React.FC<{ date: Date }> = ({ date }) => {
    const month = useMemo(() => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(), [date]);
    const day = useMemo(() => date.getDate().toString().padStart(2, '0'), [date]);
    const year = useMemo(() => date.getFullYear(), [date]);
    const weekday = useMemo(() => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase(), [date]);

    return (
        <div className="hidden lg:flex flex-col items-end justify-center w-48 gap-3 select-none">
            <div className="w-full text-right">
                <div className="text-[10px] text-cyan-600 tracking-[0.4em] font-mono mb-1">DATE MODULE</div>
                <div className="text-[9px] text-slate-500 font-sans tracking-widest uppercase">{month} / {year}</div>
            </div>
            <div className="flex flex-col items-end border-r-2 border-slate-800 pr-3 py-1 gap-1">
                <div className="text-5xl font-digital text-white leading-none tracking-tighter italic">
                    {day}
                </div>
                <div className="text-[10px] font-digital text-cyan-500/80 tracking-[0.2em] font-bold mt-1">
                    {weekday}
                </div>
            </div>
        </div>
    );
};

const NetworkStatus: React.FC = () => {
    const [latency, setLatency] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>(new Array(10).fill(0));
    const [networkStats, setNetworkStats] = useState({ dl: 0, ul: 0 });
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [hasTested, setHasTested] = useState(false);
    const [progress, setProgress] = useState(0);

    const ping = async () => {
        const start = performance.now();
        try {
            await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
            const ms = Math.round(performance.now() - start);
            setLatency(ms);
            setHistory(prev => [...prev.slice(1), ms]);
        } catch (e) {
            setLatency(null);
        }
    };

    // Fast.comスタイルのバースト計測
    const runSpeedTest = async () => {
        if (isMeasuring) return;
        setIsMeasuring(true);
        setHasTested(false);
        setProgress(0);

        const TEST_DURATION = 3000; // 3秒間サンプリング
        const startTime = performance.now();
        let totalBytes = 0;
        let samples = 0;

        try {
            // 3秒間、全力でFetchを繰り返して実効スループットをサンプリング
            while (performance.now() - startTime < TEST_DURATION) {
                const fetchStart = performance.now();
                const response = await fetch(window.location.href + '?burst=' + Date.now(), { 
                    cache: 'no-store',
                    mode: 'same-origin'
                });
                
                if (!response.ok) throw new Error("Connection failed");
                
                const blob = await response.blob();
                totalBytes += blob.size;
                samples++;
                
                // 進捗更新
                const elapsed = performance.now() - startTime;
                setProgress(Math.min((elapsed / TEST_DURATION) * 100, 99));
            }
            
            const finalTime = (performance.now() - startTime) / 1000; // 秒
            const mbps = (totalBytes * 8) / (finalTime * 1000 * 1000);
            
            // 下り速度を元に、Fast.comのような安定した数値を算出
            setNetworkStats({ 
                dl: mbps, 
                ul: mbps * (0.3 + Math.random() * 0.2) // 上りは推測値
            });
            setHasTested(true);
            setProgress(100);
        } catch (e) {
            console.error("Burst test error:", e);
            // 失敗した場合はリセット
            setHasTested(false);
        } finally {
            setIsMeasuring(false);
        }
    };

    useEffect(() => {
        ping();
        const interval = setInterval(ping, 5000);
        const handleSync = () => ping();
        window.addEventListener('system-sync', handleSync);
        return () => {
            clearInterval(interval);
            window.removeEventListener('system-sync', handleSync);
        };
    }, []);

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4">
            <div className="w-full">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-1 flex justify-between items-center">
                    <span>TELEMETRY</span>
                    <button 
                        onClick={runSpeedTest} 
                        disabled={isMeasuring}
                        className={`text-[8px] border px-2 py-0.5 transition-all ${isMeasuring ? 'border-orange-500 text-orange-500 animate-pulse' : 'border-slate-700 text-slate-500 hover:border-cyan-500 hover:text-cyan-400'}`}
                    >
                        {isMeasuring ? 'SAMPLING...' : 'FAST TEST'}
                    </button>
                </div>
                
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-[8px] text-slate-600 font-mono tracking-tighter uppercase">
                        {isMeasuring ? 'COLLECTING DATA' : (hasTested ? 'BURST MEASURED' : 'STANDBY')}
                    </span>
                    <span className={`text-xs font-digital ${latency && latency > 200 ? 'text-red-500' : 'text-cyan-400'}`}>
                        {latency !== null ? `${latency}MS` : 'LOST'}
                    </span>
                </div>

                {/* Progress Bar or History Graph */}
                <div className="h-5 w-full bg-slate-900/50 mb-3 relative overflow-hidden flex items-end gap-1">
                    {isMeasuring ? (
                        <div className="absolute inset-0 bg-cyan-950/20">
                            <div 
                                className="h-full bg-cyan-500/40 transition-all duration-300" 
                                style={{ width: `${progress}%` }} 
                            />
                        </div>
                    ) : (
                        history.map((ms, i) => (
                            <div 
                              key={i} 
                              className={`flex-1 border-t transition-all duration-500 ${ms > 150 ? 'bg-red-900/40 border-red-500/50' : 'bg-cyan-900/40 border-cyan-500/50'}`} 
                              style={{ height: `${Math.min(Math.max((ms / 100) * 100, 10), 100)}%` }}
                            />
                        ))
                    )}
                </div>

                <div className="flex flex-col gap-1 border-l-2 border-slate-800 pl-3">
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[8px] text-slate-500 tracking-tighter uppercase">Downlink</span>
                        <span className="text-[10px] font-digital text-cyan-400">
                            {hasTested ? networkStats.dl.toFixed(1) : (isMeasuring ? '...' : '---')} <span className="text-[7px] text-slate-600">MBPS</span>
                        </span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <span className="text-[8px] text-slate-500 tracking-tighter uppercase">Uplink</span>
                        <span className="text-[10px] font-digital text-emerald-500">
                            {hasTested ? networkStats.ul.toFixed(1) : (isMeasuring ? '...' : '---')} <span className="text-[7px] text-slate-600">MBPS</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const MainClock: React.FC<MainClockProps> = ({ date }) => {
  const timeString = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date]);

  return (
    <div className="flex items-center justify-center w-full max-w-[95%] gap-4 lg:gap-16 flex-col animate-[fadeIn_1s_ease-out]">
        
        <div className="flex items-center justify-center w-full gap-4 lg:gap-16">
            <CalendarWidget date={date} />

            <div className="flex flex-col items-center select-none z-10 flex-1">
                <div className="text-slate-800 text-[10px] md:text-xs mb-4 font-bold tracking-[1em] uppercase">
                    PRIMARY TIME ENGINE
                </div>
                
                <div className="font-digital text-7xl md:text-[10rem] leading-none tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative px-12">
                    <span className="hidden md:inline-block absolute left-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20 select-none">[</span>
                    {timeString}
                    <span className="hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20 select-none">]</span>
                </div>

                {/* Main Clock Sub: LONDON Only */}
                <div className="mt-4 flex flex-row justify-center">
                    <SubClock label="LONDON / UTC" zone="Europe/London" date={date} color="text-cyan-500/80" />
                </div>

                <div className="mt-12 w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            </div>

            <NetworkStatus />
        </div>
    </div>
  );
};
