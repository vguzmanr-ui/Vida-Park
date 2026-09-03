import React from 'react';
import { AppConfig, UnitStatus } from '../types';
import { FINISH_OPTIONS, TYPOLOGY_OPTIONS, ZONE_OPTIONS, FINISH_DOT_COLORS } from '../constants/catalog';
import { Star, Building2, CheckCircle2, Clock } from 'lucide-react';

interface MetricsModalProps {
  config: AppConfig;
  statuses: Record<string, UnitStatus>;
  onClose: () => void;
  onSelectUnit?: (key: string) => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({ config, statuses, onClose, onSelectUnit }) => {
  // Collect all apartment keys
  const allAptKeys: string[] = [];
  config.towers.forEach(t => {
    t.floors.forEach(f => {
      for (let i = 0; i < f.count; i++) {
        const k = `${t.id}#${f.id}#${i}`;
        if (!statuses[k]?.deleted) allAptKeys.push(k);
      }
    });
  });

  const totalUnits = allAptKeys.length;
  let totalActs = 0;
  let doneActs = 0;
  let customReforms = 0;

  let reformsActsTotal = 0;
  let reformsActsDone = 0;
  let standardActsTotal = 0;
  let standardActsDone = 0;

  const typologyCount: Record<string, number> = {};
  const finishCount: Record<string, number> = {};
  const zonePending: Record<string, number> = {};
  const reformsFinishCount: Record<string, number> = {};
  const reformsTypologyCount: Record<string, number> = {};

  allAptKeys.forEach(k => {
    const u = statuses[k];
    const hasReform = !!u?.customReforms;
    const typ = u?.typology || 'Sin definir';
    typologyCount[typ] = (typologyCount[typ] || 0) + 1;

    const fin = u?.finish || 'Sin definir';
    finishCount[fin] = (finishCount[fin] || 0) + 1;

    if (hasReform) {
      customReforms++;
      reformsFinishCount[fin] = (reformsFinishCount[fin] || 0) + 1;
      reformsTypologyCount[typ] = (reformsTypologyCount[typ] || 0) + 1;
    }

    if (u && u.activities) {
      totalActs += u.activities.length;
      u.activities.forEach(a => {
        if (a.done) {
          doneActs++;
          if (hasReform) reformsActsDone++;
          else standardActsDone++;
        } else {
          const z = a.zone || 'General';
          zonePending[z] = (zonePending[z] || 0) + 1;
        }
        if (hasReform) reformsActsTotal++;
        else standardActsTotal++;
      });
    }
  });

  const globalPct = totalActs > 0 ? Math.round((doneActs / totalActs) * 100) : 0;
  const pendingActs = totalActs - doneActs;
  const reformsPct = totalUnits > 0 ? Math.round((customReforms / totalUnits) * 100) : 0;
  const reformsPctDone = reformsActsTotal > 0 ? Math.round((reformsActsDone / reformsActsTotal) * 100) : 0;
  const standardPctDone = standardActsTotal > 0 ? Math.round((standardActsDone / standardActsTotal) * 100) : 0;

  // Tower Stats including reforms breakdown
  const towerStats = config.towers.map(t => {
    let tTotal = 0;
    let tDone = 0;
    let tApts = 0;
    let tReforms = 0;
    const reformsList: { key: string; number: string | number; pct: number; finish: string }[] = [];

    t.floors.forEach(f => {
      for (let i = 0; i < f.count; i++) {
        const k = `${t.id}#${f.id}#${i}`;
        if (!statuses[k]?.deleted) {
          tApts++;
          const u = statuses[k];
          const aptNum = u?.numberOverride || f.start + i;
          let aptTotal = 0;
          let aptDone = 0;

          if (u?.activities) {
            aptTotal = u.activities.length;
            aptDone = u.activities.filter(a => a.done).length;
            tTotal += aptTotal;
            tDone += aptDone;
          }

          if (u?.customReforms) {
            tReforms++;
            const aptPct = aptTotal > 0 ? Math.round((aptDone / aptTotal) * 100) : 0;
            reformsList.push({
              key: k,
              number: aptNum,
              pct: aptPct,
              finish: u.finish || 'Sin acabado',
            });
          }
        }
      }
    });

    const pct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0;
    const towerReformsPct = tApts > 0 ? Math.round((tReforms / tApts) * 100) : 0;

    return {
      id: t.id,
      stage: t.stage,
      pct,
      apts: tApts,
      floorsCount: t.floors.length,
      done: tDone,
      total: tTotal,
      reforms: tReforms,
      reformsPct: towerReformsPct,
      reformsList,
    };
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-3 sm:p-6 md:p-8 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-[#CBD9CC] rounded-2xl w-full max-w-5xl relative shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E1E9E1] flex justify-between items-start bg-gradient-to-r from-[#FAFCFA] to-[#EFF5EF]">
          <div>
            <div className="font-mono-custom text-[11px] uppercase tracking-widest text-[#6EAE2E] font-bold mb-1">
              Indicadores de Control y Obra
            </div>
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tight text-[#1E3A34] m-0 font-bold">
              Avance ejecutivo — {config.projectName || 'Vida Park'}
            </h2>
            <p className="text-xs text-[#6C8079] mt-1 m-0">
              Consolidado de entregas, tipos de acabados, reformas especiales y tareas por frente de trabajo
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6C8079] hover:text-[#1E3A34] text-2xl leading-none p-1.5 rounded-lg hover:bg-white/80 transition cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Top Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#EAF1E8] rounded-xl p-4.5 border border-[#CBD9CC]/60 shadow-2xs">
              <div className="font-mono-custom text-[10.5px] uppercase tracking-wider font-bold text-[#6E8A72] mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#6E8A72]" /> Total unidades
              </div>
              <div className="font-display text-3xl font-bold text-[#1B2E28] leading-none mb-1">{totalUnits}</div>
              <div className="text-xs text-[#6C8079]">{config.towers.length} Torres habilitadas</div>
            </div>

            <div className="bg-[#EEF7DE] rounded-xl p-4.5 border border-[#CBD9CC]/60 shadow-2xs">
              <div className="font-mono-custom text-[10.5px] uppercase tracking-wider font-bold text-[#6FA023] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6FA023]" /> Avance global
              </div>
              <div className="font-display text-3xl font-bold text-[#1B2E28] leading-none mb-1">{globalPct}%</div>
              <div className="text-xs text-[#6C8079]">
                {doneActs} de {totalActs} tareas listas
              </div>
            </div>

            <div className="bg-[#E3F3FB] rounded-xl p-4.5 border border-[#CBD9CC]/60 shadow-2xs">
              <div className="font-mono-custom text-[10.5px] uppercase tracking-wider font-bold text-[#1893BE] mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1893BE]" /> Tareas pendientes
              </div>
              <div className="font-display text-3xl font-bold text-[#1B2E28] leading-none mb-1">{pendingActs}</div>
              <div className="text-xs text-[#6C8079]">En proceso de ejecución</div>
            </div>

            {/* Reformas especiales tile - Purple themed with Star */}
            <div className="bg-[#F3EEFA] rounded-xl p-4.5 border border-[#DDD0F3] shadow-2xs relative overflow-hidden">
              <div className="absolute top-2 right-2 text-purple-200">
                <Star className="w-8 h-8 fill-purple-200/50" />
              </div>
              <div className="font-mono-custom text-[10.5px] uppercase tracking-wider font-bold text-[#7C3AED] mb-2 flex items-center gap-1.5 relative z-10">
                <Star className="w-3.5 h-3.5 fill-[#8A3FFC] text-[#8A3FFC]" /> Reformas especiales
              </div>
              <div className="font-display text-3xl font-bold text-[#4C1D95] leading-none mb-1 relative z-10">
                {customReforms}
              </div>
              <div className="text-xs text-[#7C3AED] font-medium relative z-10">
                {reformsPct}% de aptos ({customReforms}/{totalUnits})
              </div>
            </div>
          </div>

          {/* Section: Dedicated Custom Reforms Panel */}
          <div className="bg-gradient-to-br from-[#FAF5FF] via-[#F6EEFD] to-[#F1E4FA] border border-[#DDD0F3] rounded-2xl p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-purple-200/70 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#8A3FFC] text-white flex items-center justify-center shadow-xs">
                  <Star className="w-4 h-4 fill-white text-white" />
                </div>
                <div>
                  <h4 className="font-display text-base uppercase tracking-wider text-[#4C1D95] font-bold m-0 flex items-center gap-2">
                    Métricas de Reformas y Personalizaciones
                  </h4>
                  <p className="text-xs text-purple-700/80 m-0">
                    Seguimiento detallado de unidades con especificaciones personalizadas
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/90 border border-purple-200 px-3 py-1.5 rounded-full font-mono-custom text-xs text-[#6B21A8] font-bold shadow-2xs">
                <span>{customReforms} unidades con reforma</span>
                <span>·</span>
                <span className="text-[#8A3FFC]">{reformsPct}% del proyecto</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Progress comparison */}
              <div className="bg-white/85 border border-purple-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="font-mono-custom text-[11px] uppercase tracking-wider text-[#6B21A8] font-bold mb-2">
                    Avance de Tareas en Reformas
                  </div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-display text-3xl font-bold text-[#581C87]">{reformsPctDone}%</span>
                    <span className="text-xs text-purple-700">
                      ({reformsActsDone} de {reformsActsTotal} tareas)
                    </span>
                  </div>
                  <div className="h-2.5 bg-purple-100 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-[#8A3FFC] to-[#6B21A8] transition-all duration-300"
                      style={{ width: `${reformsPctDone}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-purple-100 text-xs text-[#6B21A8] flex justify-between items-center">
                  <span>Aptos estándar:</span>
                  <span className="font-mono-custom font-bold text-[#1E3A34]">{standardPctDone}% avance</span>
                </div>
              </div>

              {/* Tower Distribution */}
              <div className="bg-white/85 border border-purple-200 rounded-xl p-4 shadow-2xs md:col-span-2">
                <div className="font-mono-custom text-[11px] uppercase tracking-wider text-[#6B21A8] font-bold mb-3 flex items-center justify-between">
                  <span>Distribución de Reformas por Torre</span>
                  <span className="text-[10px] text-purple-600 font-normal">Identificación de unidades</span>
                </div>

                {customReforms === 0 ? (
                  <div className="py-6 text-center text-xs text-purple-600 font-mono-custom">
                    No hay apartamentos con reformas marcadas actualmente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {towerStats
                      .filter(t => t.reforms > 0)
                      .map(t => (
                        <div
                          key={t.id}
                          className="bg-purple-50/50 border border-purple-100 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-display font-bold text-xs text-[#4C1D95] uppercase">
                              Torre {t.id}
                            </span>
                            <span className="bg-purple-200/80 text-purple-900 font-mono-custom text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {t.reforms} {t.reforms === 1 ? 'reforma' : 'reformas'} ({t.reformsPct}%)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {t.reformsList.map(apt => (
                              <button
                                key={apt.key}
                                type="button"
                                onClick={() => onSelectUnit && onSelectUnit(apt.key)}
                                title={`Abrir ficha de Apto ${apt.number} · ${apt.finish} (${apt.pct}% avance)`}
                                className={`inline-flex items-center gap-1 bg-white border border-purple-200 text-[#581C87] px-2 py-0.5 rounded font-mono-custom text-[11px] font-bold shadow-2xs transition ${
                                  onSelectUnit ? 'hover:bg-purple-600 hover:text-white hover:border-purple-600 cursor-pointer' : ''
                                }`}
                              >
                                <Star className="w-2.5 h-2.5 fill-[#8A3FFC] text-[#8A3FFC] group-hover:fill-white" />
                                <span>Apto {apt.number}</span>
                                <span className="text-[9.5px] opacity-80 font-normal">({apt.pct}%)</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tower Progress Section */}
          <div>
            <h4 className="font-display text-base uppercase tracking-wider text-[#1E3A34] font-bold mb-3 flex items-center justify-between">
              <span>Avance por torre</span>
              <span className="font-mono-custom text-xs font-normal text-[#6C8079]">
                {config.towers.length} torres registradas
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {towerStats.map(t => (
                <div key={t.id} className="bg-[#EFF4EF] border border-[#E1E9E1] rounded-xl p-4 shadow-xs">
                  <div className="flex justify-between items-baseline mb-2">
                    <div className="font-display text-base font-bold text-[#1E3A34]">
                      🏢 Torre {t.id}
                      <span className="text-xs text-[#6C8079] font-normal font-sans ml-2">
                        ({t.floorsCount} pisos · {t.apts} aptos)
                      </span>
                    </div>
                    <div className="font-mono-custom font-bold text-sm text-[#1E3A34]">{t.pct}%</div>
                  </div>
                  <div className="h-2.5 bg-white rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full ${t.pct === 100 ? 'bg-[#6EAE2E]' : 'bg-[#30AFE4]'}`}
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6C8079] pt-1">
                    <span>
                      {t.done} de {t.total} tareas listas
                    </span>
                    {t.reforms > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono-custom text-[11px] text-[#7C3AED] font-bold bg-[#F3EEFA] border border-[#DDD0F3] px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-[#8A3FFC] text-[#8A3FFC]" /> {t.reforms} {t.reforms === 1 ? 'reforma' : 'reformas'}
                      </span>
                    ) : (
                      <span className="font-mono-custom text-[11px] text-[#859990]">Sin reformas</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Column Grid: Typologies, Finishes, Zones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipologías */}
            <div className="bg-[#EFF4EF] border border-[#E1E9E1] rounded-xl p-4">
              <h5 className="font-display text-sm uppercase tracking-wider font-bold text-[#1E3A34] mb-3">
                🗂 Tipo de apartamento
              </h5>
              <div className="space-y-2 text-xs">
                {TYPOLOGY_OPTIONS.map(typ => {
                  const count = typologyCount[typ] || 0;
                  const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0;
                  const refCount = reformsTypologyCount[typ] || 0;
                  return (
                    <div key={typ} className="flex justify-between items-center">
                      <span className="font-semibold text-[#1E3A34]">{typ}:</span>
                      <div className="flex items-center gap-1.5">
                        {refCount > 0 && (
                          <span
                            title={`${refCount} con reforma`}
                            className="bg-purple-100 text-purple-700 text-[10px] font-mono-custom px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                          >
                            <Star className="w-2.5 h-2.5 fill-purple-600 text-purple-600" /> {refCount}
                          </span>
                        )}
                        <span className="bg-white border border-[#CBD9CC] rounded px-2 py-0.5 font-mono-custom text-[11px] font-bold text-[#3C6FB0]">
                          {count} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                {typologyCount['Sin definir'] ? (
                  <div className="flex justify-between items-center pt-2 border-t border-[#CBD9CC] text-[#6C8079]">
                    <span>Sin definir:</span>
                    <span className="font-mono-custom">{typologyCount['Sin definir']}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Acabados */}
            <div className="bg-[#EFF4EF] border border-[#E1E9E1] rounded-xl p-4">
              <h5 className="font-display text-sm uppercase tracking-wider font-bold text-[#1E3A34] mb-3">
                🎨 Distribución acabados
              </h5>
              <div className="space-y-2 text-xs">
                {[...FINISH_OPTIONS, 'Sin definir'].map(fin => {
                  const count = finishCount[fin] || 0;
                  if (count === 0 && fin === 'Sin definir') return null;
                  const pct = totalUnits > 0 ? Math.round((count / totalUnits) * 100) : 0;
                  const refCount = reformsFinishCount[fin] || 0;
                  return (
                    <div key={fin} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: FINISH_DOT_COLORS[fin] || '#CBD9CC' }}
                      />
                      <span className="truncate text-[#1E3A34] font-medium">{fin}:</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        {refCount > 0 && (
                          <span
                            title={`${refCount} reformas con este acabado`}
                            className="bg-purple-100 text-purple-700 text-[10px] font-mono-custom px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                          >
                            <Star className="w-2.5 h-2.5 fill-purple-600 text-purple-600" /> {refCount}
                          </span>
                        )}
                        <span className="font-mono-custom font-bold text-[#1E3A34]">
                          {count} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pendientes por zona */}
            <div className="bg-[#EFF4EF] border border-[#E1E9E1] rounded-xl p-4">
              <h5 className="font-display text-sm uppercase tracking-wider font-bold text-[#1E3A34] mb-3">
                📍 Pendientes por zona
              </h5>
              <div className="space-y-2 text-xs">
                {ZONE_OPTIONS.map(z => {
                  const count = zonePending[z] || 0;
                  return (
                    <div key={z} className="flex justify-between items-center">
                      <span className="font-medium text-[#1E3A34] truncate">{z}:</span>
                      <span className="bg-white border border-[#CBD9CC] rounded px-2 py-0.5 font-mono-custom text-[11px] font-bold text-[#1CA2C9]">
                        {count} pend.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#EFF4EF] px-6 py-3.5 border-t border-[#E1E9E1] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#1E3A34] hover:bg-[#2C4F47] text-white px-6 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition cursor-pointer shadow-xs"
          >
            Cerrar panel
          </button>
        </div>
      </div>
    </div>
  );
};
