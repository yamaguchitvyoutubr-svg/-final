
import { TimeZoneConfig } from './types';

export const WORLD_ZONES: TimeZoneConfig[] = [
  {
    id: 'jp',
    label: 'TYO',
    subLabel: 'TOKYO / JAPAN',
    zone: 'Asia/Tokyo',
    lat: 35.6895,
    lon: 139.6917,
  },
  {
    id: 'uk',
    label: 'LON',
    subLabel: 'LONDON / UTC',
    zone: 'Europe/London',
    lat: 51.5074,
    lon: -0.1278,
  },
  {
    id: 'sg',
    label: 'SGP',
    subLabel: 'SINGAPORE / SGT',
    zone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: 'us-dc',
    label: 'WAS',
    subLabel: 'WASHINGTON D.C.',
    zone: 'America/New_York',
    lat: 38.8951,
    lon: -77.0364,
  }
];
