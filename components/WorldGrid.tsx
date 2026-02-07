
import React from 'react';
import { WORLD_ZONES } from '../constants';
import { CityCard } from './CityCard';

interface WorldGridProps {
  date: Date;
}

export const WorldGrid: React.FC<WorldGridProps> = ({ date }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {WORLD_ZONES.map((zone) => (
        <CityCard key={zone.id} config={zone} baseDate={date} />
      ))}
    </div>
  );
};
