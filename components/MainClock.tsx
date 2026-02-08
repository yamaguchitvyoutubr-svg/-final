
import React, { useMemo } from 'react';

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
    <div className="flex flex-col items-center px-10 border-x border-slate-800/30">
      <span className={`text-[10px] tracking-[0.4em] font-bold ${color}`}>{label}</span>
      <span className="font-digital text-xl md:text-3xl tracking-[0.15em] text-slate-300 tabular-nums">
        {time}
      </span>
    </div>
  );
};

// Digital Calendar Widget
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
    const [latency, setLatency] = React.useState<number | null>(null);
    const [history, setHistory] = React.useState<number[]>(new Array(10).fill(0));

    React.useEffect(() => {
        const ping = async () => {
            const start = performance.now();
            try {
                await fetch('/?_ping=' + Date.now(), { method: 'GET', cache: 'no-store' });
                const ms = Math.round(performance.now() - start);
                setLatency(ms);
                setHistory(prev => [...prev.slice(1), ms]);
            } catch (e) {
                setLatency(null);
            }
        };
        ping();
        const interval = setInterval(ping, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4">
            <div className="w-full">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-1">NETWORK LATENCY</div>
                <div className="flex items-end gap-1 h-6 w-full opacity-70">
                    {history.map((ms, i) => (
                        <div key={i} className={`flex-1 border-t ${ms > 150 ? 'bg-red-900/40 border-red-500/50' : 'bg-cyan-900/40 border-cyan-500/50'}`} style={{ height: `${Math.min(Math.max((ms / 100) * 100, 10), 100)}%` }}></div>
                    ))}
                </div>
            </div>
            <div className="flex flex-col items-start border-l-2 border-slate-800 pl-3 py-1">
                <div className={`text-xl font-digital tracking-widest font-mono ${latency === null ? 'text-red-500' : 'text-cyan-400'}`}>
                    {latency !== null ? `${latency}ms` : 'OFFLINE'}
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
    <div className="flex items-center justify-center w-full max-w-[95%] gap-4 lg:gap-16">
        <CalendarWidget date={date} />

        <div className="flex flex-col items-center select-none z-10 flex-1">
            <div className="text-slate-500 text-[10px] md:text-xs mb-4 font-bold tracking-[0.6em] uppercase opacity-40">
                Primary Chronometer
            </div>
            
            <div className="font-digital text-7xl md:text-[8rem] leading-none tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative px-10">
                <span className="hidden md:inline-block absolute left-0 top-1/2 -translate-y-1/2 text-slate-800 text-6xl font-thin opacity-50 select-none">[</span>
                {timeString}
                <span className="hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 text-slate-800 text-6xl font-thin opacity-50 select-none">]</span>
            </div>

            <div className="mt-8 flex justify-center animate-[fadeIn_0.5s_ease-out]">
                <SubClock label="LONDON / UTC" zone="Europe/London" date={date} color="text-cyan-500/80" />
            </div>

            <div className="mt-6 w-48 h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
        </div>

        <NetworkStatus />
    </div>
  );
};
