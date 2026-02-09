
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TimeZoneConfig } from '../types';
import { getWeatherLabel } from '../utils/weatherUtils';

interface CityCardProps {
  config: TimeZoneConfig;
  baseDate: Date;
}

export const CityCard: React.FC<CityCardProps> = ({ config, baseDate }) => {
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Time calculation logic
  const { time, dateDiff } = useMemo(() => {
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: config.zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const targetDateString = new Intl.DateTimeFormat('en-US', {
      timeZone: config.zone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).format(baseDate);

    const localDateString = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false
    }).format(baseDate);

    const targetDateObj = new Date(targetDateString);
    const localDateObj = new Date(localDateString);
    
    const diffMs = targetDateObj.getTime() - localDateObj.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    let dayLabel = "TODAY";
    if (targetDateObj.getDate() !== localDateObj.getDate()) {
        if (diffHours > 0) dayLabel = "TOMORROW";
        if (diffHours < 0) dayLabel = "YESTERDAY";
    }

    const sign = diffHours > 0 ? "+" : ""; 
    const offsetString = diffHours === 0 ? "SAME TIME" : `${sign}${diffHours} HRS`;

    return {
      time: timeFormatter.format(baseDate),
      dateDiff: `${dayLabel}, ${offsetString}`
    };
  }, [config.zone, baseDate]);

  const fetchWeather = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${config.lat}&longitude=${config.lon}&current=temperature_2m,weather_code&timezone=auto`
      );
      const data = await res.json();
      if (data.current) {
        setWeather({
          temp: data.current.temperature_2m,
          code: data.current.weather_code,
        });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [config.lat, config.lon]);

  useEffect(() => {
    fetchWeather();
    
    const handleSystemSync = () => {
        fetchWeather();
    };
    window.addEventListener('system-sync', handleSystemSync);

    return () => window.removeEventListener('system-sync', handleSystemSync);
  }, [fetchWeather]);

  const isSevere = weather ? (
      weather.code >= 95 || 
      (weather.code >= 66 && weather.code <= 67) || 
      (weather.code >= 56 && weather.code <= 57) 
  ) : false;

  return (
    <div className={`border p-3 flex flex-col justify-between h-32 md:h-36 relative group overflow-hidden rounded-sm transition-colors ${isSevere ? 'bg-red-950/20 border-red-900 hover:border-red-700' : 'bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]'}`}>
      <div className="flex justify-between items-start z-10 w-full">
        <div className="flex flex-col">
            <h3 className="text-slate-300 font-sans font-bold text-base tracking-wider leading-none">{config.label}</h3>
            <div className="flex flex-col gap-0.5 mt-1">
                {config.subLabel && <span className="text-[9px] text-slate-600 tracking-widest font-mono">{config.subLabel}</span>}
                {lastUpdated && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[7px] text-slate-700 font-mono tracking-tighter uppercase whitespace-nowrap">LAST SYNC: {lastUpdated}</span>
                        <button onClick={(e) => { e.stopPropagation(); fetchWeather(); }} className={`text-slate-700 hover:text-cyan-500 transition-colors ${isLoading ? 'animate-spin' : ''}`}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                        </button>
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
         <div className="text-3xl lg:text-4xl font-digital text-white tracking-widest tabular-nums drop-shadow-md font-bold italic">{time}</div>
      </div>

      <div className="text-center text-slate-400 text-[10px] md:text-xs font-sans z-10 tracking-wide mt-1">{dateDiff}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
    </div>
  );
};
