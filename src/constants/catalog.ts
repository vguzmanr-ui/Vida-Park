import { CommonArea, MasterActivityItem } from '../types';

export const TOWER_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const STAGES = [
  { id: 'etapa1', label: 'Etapa 1', towers: ['A', 'B'] },
  { id: 'etapa2', label: 'Etapa 2', towers: ['C', 'D'] },
  { id: 'etapa3', label: 'Etapa 3', towers: ['G', 'H'] },
  { id: 'etapa4', label: 'Etapa 4', towers: ['E', 'F'] },
];

export function stageForTower(towerId: string): string {
  const found = STAGES.find(s => s.towers.includes(towerId));
  return found ? found.label : 'Etapa 1';
}

export const DEFAULT_AREAS: CommonArea[] = [
  { id: 'lobby', name: 'Lobby' },
  { id: 'coworking-room', name: 'Coworking room' },
  { id: 'piscinas-recreativas', name: 'Piscinas recreativas' },
  { id: 'scout-park', name: 'Scout park' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salon-encuentros', name: 'Salón de encuentros' },
  { id: 'piscina-3-carriles', name: 'Piscina 3 carriles' },
  { id: 'spin-studio', name: 'Spin Studio' },
  { id: 'gimnasio', name: 'Gimnasio' },
  { id: 'salon-yoga', name: 'Salón de yoga' },
  { id: 'spa-nordico', name: 'Spa nórdico' },
];

export const FINISH_OPTIONS = ['Kit Premium', 'Kit Full', 'Kit Medio', 'Obra gris'] as const;
export const TYPOLOGY_OPTIONS = ['Tipo A', 'Tipo B', 'Tipo C', 'Tipo D', 'Tipo E'] as const;

export const ACTIVITY_CATALOG: Record<string, string[]> = {
  'General': [
    'Primera mano de pintura',
    'Segunda mano de pintura',
    'Tercera mano de pintura',
    'Zócalos en madera',
    'Pisos y enchapes detallados',
    'Sellos internos',
    'Topepuertas',
    'Cielos detallados en baños, cocinas, balcones, ZR y dinteles de closet',
    'Tapas de aparatos eléctricos',
    'Luminarias en cielo',
    'Cortagoteras en ventanas y balcón',
  ],
  'Zona de Ropas': [
    'Mueble de ZR, salpicadero, grifería y desagües',
    'Zócalos detallados',
  ],
  'Cocinas': [
    'Electrodomesticos (Cubierta, campana y horno)',
    'Salpicadero de cocinas',
    'Grifería de cocina',
    'Mesones de cocinas detallados',
  ],
  'Habitaciones': [
    'Closet y vestier en habitaciones',
  ],
  'Baños': [
    'Cabinas',
    'Incrustaciones',
    'Sanitarios',
    'Muebles de baño',
    'Lavamanos',
    'Griferia',
    'Espejo',
    'Ducha',
    'Rejilla ducha',
  ],
  'Balcón': [
    'Lagrimal detallado',
    'Sellos en antepecho',
    'Rejilla',
    'Piso en ceramica',
    'zócalos',
    'Puerta Calentador',
    'Pintura en pasamanos',
  ],
};

export const ZONE_OPTIONS = Object.keys(ACTIVITY_CATALOG);

export const FINISH_DOT_COLORS: Record<string, string> = {
  'Kit Premium': '#6FA023',
  'Kit Full': '#26B1B8',
  'Kit Medio': '#30AFE4',
  'Obra gris': '#8B99A5',
  'Sin definir': '#C7D0D6',
};
