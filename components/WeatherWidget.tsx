
import React, { useState, useEffect, useRef } from 'react';
import { getWeatherLabel } from '../utils/weatherUtils';

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

/**
 * WeatherWidget: 
 * 現在地のGPS情報を取得し、Open-Meteo APIから天気を取得します。
 * 地名検索による上書きも可能です。
 */
export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 指定された緯度経度から天気を取得
  const fetchWeatherData = (lat: number, lon: number) => {
    setLoading(true);
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`)
      .then(res => res.json())
      .then(data => {
        if (data.current) {
          setWeather({
            temperature: data.current.temperature_2m,
            weatherCode: data.current.weather_code
          });
          setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setError(null);
        } else {
          setError('DATA UNAVAILABLE');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('FETCH FAILED');
        setLoading(false);
      });
  };

  const handleRefresh = () => {
    if (coords) fetchWeatherData(coords.lat, coords.lon);
  };
  
  // 地名から緯度経度を検索（ジオコーディング）
  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setLoading(true);
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
          const data = await res.json();
          
          if (data.results && data.results.length > 0) {
              const { latitude, longitude, name, country } = data.results[0];
              const newCoords = { lat: latitude, lon: longitude };
              setCoords(newCoords);
              setSearchQuery(`${name}, ${country || ''}`);
              fetchWeatherData(latitude, longitude);
              setIsSearching(false);
          } else {
              setError('LOCATION NOT FOUND');
              setLoading(false);
          }
      } catch (err) {
          setError('SEARCH FAILED');
          setLoading(false);
      }
  };

  useEffect(() => {
    if (isSearching) searchInputRef.current?.focus();
  }, [isSearching]);

  useEffect(() => {
    // ブラウザのGeolocation APIを使用して現在地を取得
    setLoading(true);
    if (!navigator.geolocation) {
      setError('GPS UNSUPPORTED');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        fetchWeatherData(latitude, longitude);
      },
      (err) => {
        setError('GPS SIGNAL LOST');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );

    // 同期イベントを購読
    const handleSystemSync = () => handleRefresh();
    window.addEventListener('system-sync', handleSystemSync);
    return () => window.removeEventListener('system-sync', handleSystemSync);
  }, []);

  const displayWeather = testMode ? { temperature: 35.5, weatherCode: 95 } : weather;
  const isSevere = displayWeather ? (displayWeather.weatherCode >= 95 || (displayWeather.weatherCode >= 66 && displayWeather.weatherCode <= 67) || (displayWeather.weatherCode >= 56 && displayWeather.weatherCode <= 57)) : false;

  if (loading && !displayWeather && !error) {
    return <div className="text-cyan-500/50 text-xs font-mono tracking-widest mt-6 animate-pulse">ACQUIRING SATELLITE LOCK...</div>;
  }

  return (
    <div className="flex flex-col items-center mt-6 animate-[fadeIn_1s_ease-out] w-full max-w-2xl relative">
      <div className="w-full flex justify-between items-center px-1 mb-1">
        <div className="text-[9px] text-slate-600 tracking-widest uppercase font-mono">{lastUpdated && `SYNC: ${lastUpdated}`}</div>
        <button onClick={() => setTestMode(!testMode)} className={`text-[10px] tracking-widest px-2 py-0.5 border rounded-sm transition-colors ${testMode ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>{testMode ? 'END TEST' : 'TEST SYSTEM'}</button>
      </div>

      <div className={`w-full flex items-center justify-between gap-4 md:gap-8 border px-6 py-2 rounded-sm backdrop-blur-sm relative transition-colors duration-500 ${isSevere ? 'bg-red-950/30 border-red-800 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'bg-slate-900/40 border-slate-800'}`}>
        {isSevere && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest animate-pulse z-20">WARNING: SEVERE WEATHER</div>}

        <div className="flex flex-col items-end border-r border-slate-700 pr-4 relative min-w-[140px]">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">TARGET LOCATION</span>
            {isSearching ? (
                <form onSubmit={handleSearch} className="flex items-center w-full">
                    <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="CITY NAME..." className="bg-black/50 text-cyan-400 text-xs font-mono border-b border-cyan-500 outline-none w-full uppercase tracking-wider p-1" />
                </form>
            ) : (
                <button onClick={() => setIsSearching(true)} className={`text-xs font-digital tracking-wider hover:text-cyan-400 transition-colors ${error ? 'text-red-400' : 'text-slate-300'}`}>
                    {testMode ? 'SIMULATION' : (error ? 'MANUAL OVERRIDE REQ.' : (coords ? `${coords.lat.toFixed(2)} / ${coords.lon.toFixed(2)}` : '---'))}
                </button>
            )}
        </div>

        <div className="flex flex-col items-center flex-1">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">CONDITION</span>
            <span className={`text-lg font-sans tracking-widest uppercase text-center ${isSevere ? 'text-red-200' : 'text-cyan-100'}`}>
                {displayWeather ? getWeatherLabel(displayWeather.weatherCode) : (error ? 'NO SIGNAL' : '---')}
            </span>
        </div>

        <div className="flex flex-col items-start border-l border-slate-700 pl-4 min-w-[80px]">
            <span className="text-[10px] text-slate-500 tracking-widest mb-0.5">TEMP</span>
            <span className="text-xl text-white font-digital tracking-widest font-bold italic">
                {displayWeather ? displayWeather.temperature : '--'}<span className="text-sm ml-1 text-slate-400">°C</span>
            </span>
        </div>
      </div>
    </div>
  );
};
