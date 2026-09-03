import React from 'react';
import { UnitCardItem, AppConfig, UnitStatus } from '../types';
import { Pencil, Trash2, Star } from 'lucide-react';

interface UnitCardProps {
  item: UnitCardItem;
  config: AppConfig;
  status?: UnitStatus;
  isEditor?: boolean;
  onOpenUnit: (unitKey: string, kind: 'apt' | 'area') => void;
  onEditUnit?: (unitKey: string) => void;
  onDeleteUnit?: (unitKey: string, unitNumber: string | number) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  item,
  config,
  status,
  isEditor,
  onOpenUnit,
  onEditUnit,
  onDeleteUnit,
}) => {
  if (item.kind === 'area' && item.area) {
    const a = item.area;
    const activities = status?.activities || [];
    const total = activities.length;
    const done = activities.filter(x => x.done).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const pillClass = total === 0 ? 'bg-[#EFF4EF] text-[#6C8079]' : pct === 100 ? 'bg-[#EBF6DC] text-[#6EAE2E]' : 'bg-[#E1F3FA] text-[#1CA2C9]';
    const pillText = total === 0 ? 'Sin tareas' : pct === 100 ? 'Completo' : `${total - done} pend.`;
    const lineClass = total === 0 ? 'text-[#A9BAB1]' : pct === 100 ? 'text-[#6EAE2E]' : 'text-[#1CA2C9]';
    const lineText = total === 0 ? 'Sin definir' : pct === 100 ? 'Completado ✓' : `Pendientes ${total - done}/${total}`;

    const initials = a.name
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();

    return (
      <div className="bg-white border border-[#E1E9E1] hover:border-[#CBD9CC] rounded-xl p-3.5 flex gap-3.5 transition shadow-xs hover:shadow-md">
        <div className="w-20 shrink-0 rounded-lg relative py-3.5 px-1.5 text-white bg-gradient-to-br from-[#22406E] to-[#3C6FB0] flex flex-col items-center justify-center min-h-[116px] text-center shadow-xs">
          <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-white/50" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/50" />
          <div className="font-display text-2xl font-bold leading-none">{initials}</div>
          <div className="font-mono-custom text-[8.5px] uppercase tracking-wider opacity-80 mt-2">Área común</div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className={`self-end font-mono-custom text-[9.5px] uppercase tracking-wider py-1 px-2.5 rounded-full font-semibold whitespace-nowrap ${pillClass}`}>
            {pillText}
          </span>
          <div className="font-mono-custom text-[11px] text-[#6C8079] my-2 font-medium truncate uppercase">
            {a.name}
          </div>
          <div className="h-1.5 bg-[#EFF4EF] rounded-full overflow-hidden">
            <div className={`h-full ${pct === 100 ? 'bg-[#6EAE2E]' : 'bg-[#1CA2C9]'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className={`font-mono-custom text-[10px] mt-1.5 font-bold ${lineClass}`}>
            {lineText}
          </div>
          <div className="mt-auto pt-3 flex justify-end">
            <button
              onClick={() => onOpenUnit(item.key, 'area')}
              className="font-mono-custom text-[10px] uppercase tracking-wider bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] hover:border-[#1CA2C9] text-[#1E3A34] px-3 py-1.5 rounded transition cursor-pointer"
            >
              Ver ficha
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Apartment Card
  const parts = item.key.split('#');
  const towerId = parts[0];
  const floorId = parts[1];
  const idx = parseInt(parts[2], 10);
  const tower = config.towers.find(t => t.id === towerId);
  const floor = tower?.floors.find(f => f.id === floorId);

  const number = status?.numberOverride || (floor ? floor.start + idx : idx + 1);
  const cap = `Torre ${towerId}${floor ? ` · ${floor.label}` : ''}${status?.typology ? ` · ${status.typology}` : ''}`;

  const finish = status?.finish || null;
  const finishPillClass =
    finish === 'Kit Premium'
      ? 'bg-[#E4EBF9] text-[#22406E] font-bold'
      : finish === 'Kit Full'
      ? 'bg-[#EBF6DC] text-[#6EAE2E] font-semibold'
      : finish === 'Kit Medio'
      ? 'bg-[#E1F3FA] text-[#1CA2C9] font-semibold'
      : 'bg-[#EFF4EF] text-[#6C8079]';

  const finishLabel = finish || 'Sin acabados';

  const activities = status?.activities || [];
  const total = activities.length;
  const done = activities.filter(x => x.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const lineClass = total === 0 ? 'text-[#A9BAB1]' : pct === 100 ? 'text-[#6EAE2E]' : 'text-[#1CA2C9]';
  const lineText = total === 0 ? 'Sin tareas' : pct === 100 ? 'Completado ✓' : `Pendientes ${total - done}/${total}`;
  const areaText = status?.m2 ? `Área ${status.m2} m²` : 'Área sin definir';

  return (
    <div className={`bg-white border ${status?.customReforms ? 'border-purple-200 hover:border-purple-300' : 'border-[#E1E9E1] hover:border-[#CBD9CC]'} rounded-xl p-3.5 flex gap-3.5 transition shadow-xs hover:shadow-md relative`}>
      <div className="w-20 shrink-0 rounded-lg relative py-3.5 px-1.5 text-white bg-gradient-to-br from-[#22406E] to-[#3C6FB0] flex flex-col items-center justify-center min-h-[116px] text-center shadow-xs">
        <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-white/50" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/50" />
        {status?.customReforms && (
          <div
            className="absolute -top-1.5 -left-1.5 bg-[#8A3FFC] text-white p-1 rounded-full shadow-md border-2 border-white flex items-center justify-center z-10"
            title="Apartamento con Reforma Especial"
          >
            <Star className="w-3.5 h-3.5 fill-white text-white" />
          </div>
        )}
        <div className="font-display text-2xl font-bold leading-none">{number}</div>
        <div className="font-mono-custom text-[8.5px] uppercase tracking-wider opacity-80 mt-2">{cap}</div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="self-end flex items-center gap-1.5 flex-wrap justify-end">
          {status?.customReforms && (
            <span
              title="Apartamento con reformas personalizadas"
              className="font-mono-custom text-[9.5px] uppercase tracking-wider py-1 px-2 rounded-full whitespace-nowrap bg-[#F3EEFA] text-[#7C3AED] border border-[#DDD0F3] font-bold flex items-center gap-1 shadow-2xs"
            >
              <Star className="w-3 h-3 text-[#8A3FFC] fill-[#8A3FFC]" />
              <span>Reforma</span>
            </span>
          )}
          <span className={`font-mono-custom text-[9.5px] uppercase tracking-wider py-1 px-2.5 rounded-full whitespace-nowrap ${finishPillClass}`}>
            {finishLabel}
          </span>
        </div>
        <div className="font-mono-custom text-[11px] text-[#6C8079] my-2 font-medium truncate uppercase">
          {areaText}
        </div>
        <div className="h-1.5 bg-[#EFF4EF] rounded-full overflow-hidden">
          <div className={`h-full ${pct === 100 ? 'bg-[#6EAE2E]' : 'bg-[#1CA2C9]'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`font-mono-custom text-[10px] mt-1.5 font-bold ${lineClass}`}>
          {lineText}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-end gap-1.5">
          {onDeleteUnit && (
            <button
              onClick={() => onDeleteUnit(item.key, number)}
              title={`Eliminar Apto ${number}`}
              className="font-mono-custom text-[10px] text-red-500 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 p-1.5 rounded transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditUnit && (
            <button
              onClick={() => onEditUnit(item.key)}
              title="Modificar datos del apartamento"
              className="font-mono-custom text-[10px] uppercase tracking-wider bg-white hover:bg-[#F3F7F3] border border-[#CBD9CC] hover:border-[#3C6FB0] text-[#22406E] px-2.5 py-1.5 rounded transition cursor-pointer flex items-center gap-1 font-semibold"
            >
              <Pencil className="w-3 h-3 text-[#3C6FB0]" />
              <span>Modificar</span>
            </button>
          )}
          <button
            onClick={() => onOpenUnit(item.key, 'apt')}
            className="font-mono-custom text-[10px] uppercase tracking-wider bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] hover:border-[#1CA2C9] text-[#1E3A34] px-3 py-1.5 rounded transition cursor-pointer"
          >
            Ver ficha
          </button>
        </div>
      </div>
    </div>
  );
};
