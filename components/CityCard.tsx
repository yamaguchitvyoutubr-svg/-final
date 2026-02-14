
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { TimeZoneConfig } from '../types';
import { getWeatherLabel } from '../utils/weatherUtils';

interface CityCardProps {
  config: TimeZoneConfig;
  baseDate: Date;
  onEdit: (newConf: TimeZoneConfig) => void;
}

export const CityCard: React.FC<CityCardProps> = ({ config, baseDate, onEdit }) => {
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Time calculation
  const { time, dateDiff } = useMemo(() => {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: config.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // Get target time details
    const targetString = new Intl.DateTimeFormat('en-US', {
        timeZone: config.zone,
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
    }).format(baseDate);
    const localString = new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
    }).format(baseDate);

    const targetDate = new Date(targetString);
    const localDate = new Date(localString);
    const diffHours = Math.round((targetDate.getTime() - localDate.getTime()) / (1000 * 60 * 60));

    let dayLabel = "TODAY";
    if (targetDate.getDate() !== localDate.getDate()) {
        dayLabel = diffHours > 0 ? "TOMORROW" : "YESTERDAY";
    }

    return {
      time: timeFormatter.format(baseDate),
      dateDiff: `${dayLabel}, ${diffHours >= 0 ? '+' : ''}${diffHours} HRS`
    };
  }, [config.zone, baseDate]);

  const fetchWeather = useCallback(async () => {
    if (!config.lat) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lon}&current=temperature_2m,weather_code&timezone=auto`);
      const data = await res.json();
      if (data.current) {
        setWeather({ temp: data.current.temperature_2m, code: data.current.weather_code });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (e) {} finally { setIsLoading(false); }
  }, [config.lat, config.lon]);

  useEffect(() => { 
    fetchWeather();
    const h = () => fetchWeather();
    window.addEventListener('system-sync', h);
    return () => window.removeEventListener('system-sync', h);
  }, [fetchWeather]);

  const searchCities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        setSearchResults(data.results || []);
    } catch (e) { console.error(e); }
  };

  const isSevere = weather ? (weather.code >= 95 || (weather.code >= 66 && weather.code <= 67) || (weather.code >= 56 && weather.code <= 57)) : false;

  return (
    <div className={`border p-3 flex flex-col justify-between h-32 md:h-36 relative group overflow-hidden rounded-sm transition-all duration-300 ${isSevere ? 'bg-red-950/20 border-red-900' : 'bg-[#161616] border-[#2a2a2a] hover:border-cyan-500/50'}`}>
      {isSearching && (
        <div className="absolute inset-0 z-50 bg-black/95 p-3 flex flex-col animate-[fadeIn_0.2s]">
            <form onSubmit={searchCities} className="flex gap-1 mb-2">
                <input 
                    ref={searchInputRef}
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="CITY NAME..."
                    className="flex-1 bg-transparent border-b border-cyan-500 text-cyan-400 text-[10px] font-mono outline-none"
                />
                <button type="button" onClick={() => setIsSearching(false)} className="text-slate-500 text-[10px]">[X]</button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-1">
                {searchResults.map(r => (
                    <div key={r.id} onClick={() => {
                        onEdit({
                            id: r.id.toString(),
                            label: r.name.substring(0, 3).toUpperCase(),
                            subLabel: `${r.name.toUpperCase()} / ${r.country?.toUpperCase() || '---'}`,
                            zone: r.timezone,
                            lat: r.latitude,
                            lon: r.longitude
                        });
                        setIsSearching(false);
                    }} className="text-[10px] text-slate-400 hover:text-cyan-400 cursor-pointer p-1 border-b border-slate-900 truncate">
                        {r.name}, {r.country}
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="flex justify-between items-start z-10 w-full">
        <div className="flex flex-col cursor-pointer" onClick={() => { setIsSearching(true); setSearchQuery(''); setSearchResults([]); }}>
            <h3 className="text-slate-300 font-sans font-bold text-base tracking-wider leading-none group-hover:text-cyan-400 transition-colors">{config.label}</h3>
            <div className="flex flex-col gap-0.5 mt-1">
                {config.subLabel && <span className="text-[9px] text-slate-600 tracking-widest font-mono truncate max-w-[120px]">{config.subLabel}</span>}
                {lastUpdated && (
                    <div className="flex items-center gap-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[7px] text-slate-700 font-mono tracking-tighter uppercase">SYNC: {lastUpdated}</span>
                    </div>
                )}
            </div>
        </div>
        {weather && (
            <div className="flex flex-col items-end text-right">
                <div className="flex items-center gap-1">
                    {isSevere && <span className="text-[8px] text-red-500 animate-pulse font-bold">⚠</span>}
                    <span className={`text-[9px] font-sans tracking-wider uppercase ${isSevere ? 'text-red-400' : 'text-cyan-400/80'}`}>{getWeatherLabel(weather.code)}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-digital tracking-widest">{weather.temp}°C</span>
            </div>
        )}
      </div>

      <div className="flex justify-center items-center z-10 flex-grow">
         <div className="text-3xl lg:text-4xl font-digital text-white tracking-widest tabular-nums italic font-bold">{time}</div>
      </div>

      <div className="text-center text-slate-400 text-[10px] md:text-xs font-sans z-10 tracking-wide mt-1">{dateDiff}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
    </div>
  );
};
