import React, { useMemo, useState, useEffect } from 'react';

interface MainClockProps {
  date: Date;
}

// Side Panel Components

// 1. Real Market Data (USD/JPY)
const MarketMetrics: React.FC = () => {
    const [rate, setRate] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchRate = async () => {
        try {
            // Using open.er-api.com (Free, No Auth, CORS supported)
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await res.json();
            if (data && data.rates && data.rates.JPY) {
                setRate(data.rates.JPY);
            }
            setLoading(false);
        } catch (e) {
            console.error("Market data fetch failed", e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRate();
        const interval = setInterval(fetchRate, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hidden lg:flex flex-col items-end justify-center w-48 gap-4">
            <div className="w-full text-right">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-1">MARKET DATA</div>
                <div className="text-xs text-slate-400 font-sans tracking-wider">USD / JPY</div>
            </div>

            <div className="flex flex-col items-end border-r-2 border-slate-800 pr-3 py-1">
                <div className="text-[9px] text-slate-500 tracking-widest uppercase">CURRENT RATE</div>
                <div className="text-xl font-digital text-slate-300 tracking-widest">
                    {loading ? (
                        <span className="animate-pulse">---.--</span>
                    ) : (
                        <span className="text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
                            {rate ? rate.toFixed(2) : 'ERR'}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end border-r-2 border-slate-800 pr-3 py-1">
                <div className="text-[9px] text-slate-500 tracking-widest uppercase">SOURCE API</div>
                <div className="text-xs font-mono text-cyan-600/70 tracking-tighter">
                    OPEN.ER-API
                </div>
            </div>
        </div>
    );
};

// 2. Real Network Latency (Ping)
const NetworkStatus: React.FC = () => {
    const [latency, setLatency] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>(new Array(10).fill(0));

    useEffect(() => {
        const ping = async () => {
            const start = performance.now();
            try {
                // Change to simple GET request to root with cache busting
                // HEAD requests can be blocked by some CDNs or server configs
                await fetch('/?_' + Date.now(), { method: 'GET', cache: 'no-store' });
                const end = performance.now();
                const ms = Math.round(end - start);
                
                setLatency(ms);
                setHistory(prev => [...prev.slice(1), ms]);
            } catch (e) {
                setLatency(null); // Error state
            }
        };

        // Initial ping
        ping();
        const interval = setInterval(ping, 5000); // Ping every 5 seconds
        return () => clearInterval(interval);
    }, []);

    // Normalize height for the graph (max 100ms for visual scaling)
    const getBarHeight = (ms: number) => {
        return Math.min(Math.max((ms / 100) * 100, 10), 100);
    };

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4">
            <div className="w-full">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-1 text-left">NETWORK LATENCY</div>
                {/* Visualizer Graph */}
                <div className="flex items-end gap-1 h-6 w-full opacity-70">
                    {history.map((ms, i) => (
                        <div 
                            key={i} 
                            className={`flex-1 border-t transition-all duration-300 ${ms > 150 ? 'bg-red-900/40 border-red-500/50' : 'bg-cyan-900/40 border-cyan-500/50'}`} 
                            style={{ height: `${getBarHeight(ms)}%` }}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col items-start border-l-2 border-slate-800 pl-3 py-1">
                <div className="text-[9px] text-slate-500 tracking-widest uppercase">PING (RTT)</div>
                <div className={`text-xl font-digital tracking-widest font-mono ${latency === null ? 'text-red-500' : 'text-cyan-400'}`}>
                    {latency !== null ? `${latency}ms` : 'OFFLINE'}
                </div>
            </div>

            <div className="flex flex-col items-start border-l-2 border-slate-800 pl-3 py-1">
                <div className="text-[9px] text-slate-500 tracking-widest uppercase">STATUS</div>
                <div className="text-xs font-mono text-slate-400 tracking-widest">
                    {latency === null ? 'DISCONNECTED' : 'CONNECTED'}
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

  const dateString = useMemo(() => {
    // Format: NOVEMBER 22, 2025 (SAT)
    const datePart = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
    
    const dayPart = new Intl.DateTimeFormat('en-US', {
        weekday: 'short'
    }).format(date).toUpperCase();

    return `${datePart.toUpperCase()} (${dayPart})`;
  }, [date]);

  return (
    <div className="flex items-center justify-center w-full max-w-[90%] gap-8 lg:gap-16">
        {/* Left Side: Market Data */}
        <MarketMetrics />

        {/* Center: Main Clock */}
        <div className="flex flex-col items-center select-none z-10">
            <div className="text-slate-400 text-base md:text-lg mb-2 font-light tracking-wider opacity-80">
                CURRENT TIME
            </div>
            
            <div className="font-digital text-7xl md:text-[8rem] leading-none tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative">
                {/* Decorative brackets */}
                <span className="hidden md:inline-block absolute -left-8 top-1/2 -translate-y-1/2 text-slate-800 text-6xl font-thin opacity-50">[</span>
                {timeString}
                <span className="hidden md:inline-block absolute -right-8 top-1/2 -translate-y-1/2 text-slate-800 text-6xl font-thin opacity-50">]</span>
            </div>
            
            <div className="mt-4 text-slate-400 text-lg md:text-xl font-light tracking-[0.2em] uppercase border-b border-slate-800 pb-2 px-8">
                {dateString}
            </div>
        </div>

        {/* Right Side: Network Status */}
        <NetworkStatus />
    </div>
  );
};