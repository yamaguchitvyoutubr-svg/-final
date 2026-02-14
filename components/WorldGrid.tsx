
import React, { useState, useEffect } from 'react';
import { WORLD_ZONES as DEFAULT_ZONES } from '../constants';
import { CityCard } from './CityCard';
import { TimeZoneConfig } from '../types';

interface WorldGridProps {
  date: Date;
}

export const WorldGrid: React.FC<WorldGridProps> = ({ date }) => {
  const [zones, setZones] = useState<TimeZoneConfig[]>(() => {
    const saved = localStorage.getItem('user_world_zones_v2');
    return saved ? JSON.parse(saved) : DEFAULT_ZONES;
  });

  useEffect(() => {
    localStorage.setItem('user_world_zones_v2', JSON.stringify(zones));
  }, [zones]);

  const updateZone = (index: number, newConfig: TimeZoneConfig) => {
    const newZones = [...zones];
    newZones[index] = newConfig;
    setZones(newZones);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {zones.map((zone, idx) => (
        <CityCard 
            key={`${zone.id}-${idx}`} 
            config={zone} 
            baseDate={date} 
            onEdit={(newConf) => updateZone(idx, newConf)} 
        />
      ))}
    </div>
  );
};
