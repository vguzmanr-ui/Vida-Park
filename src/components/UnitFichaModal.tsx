import React, { useState, useEffect } from 'react';
import { UnitStatus, AppConfig } from '../types';
import { FINISH_OPTIONS, TYPOLOGY_OPTIONS, ZONE_OPTIONS, ACTIVITY_CATALOG } from '../constants/catalog';
import { generateQrSvg } from '../utils/qrcode';
import { uid } from '../services/storage';
import { Pencil, Plus, Check, Trash2, Star } from 'lucide-react';

interface UnitFichaModalProps {
  unitKey: string | null;
  kind: 'apt' | 'area';
  config: AppConfig;
  status?: UnitStatus;
  isEditor: boolean;
  userEmail: string | null;
  onClose: () => void;
  onUpdateStatus: (unitKey: string, status: UnitStatus) => void;
  onEditUnit?: (unitKey: string) => void;
  onDeleteUnit?: (unitKey: string, unitNumber?: string | number) => void;
  onToast: (msg: string) => void;
}

export const UnitFichaModal: React.FC<UnitFichaModalProps> = ({
  unitKey,
  kind,
  config,
  status,
  isEditor,
  userEmail,
  onClose,
  onUpdateStatus,
  onEditUnit,
  onDeleteUnit,
  onToast,
}) => {
  if (!unitKey) return null;

  // Local editing states
  const [currentStatus, setCurrentStatus] = useState<UnitStatus>(() => {
    return status || {
      activities: [],
      note: '',
      updated: null,
      lastEditedBy: null,
      m2: null,
      finish: null,
      typology: null,
      rooms: null,
      baths: null,
      customReforms: false,
    };
  });

  const [newZone, setNewZone] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [customActText, setCustomActText] = useState('');

  useEffect(() => {
    if (status) {
      setCurrentStatus(status);
    }
  }, [status]);

  const updateField = (partial: Partial<UnitStatus>) => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    const next: UnitStatus = {
      ...currentStatus,
      ...partial,
      updated: Date.now(),
      lastEditedBy: userEmail || currentStatus.lastEditedBy || null,
    };
    setCurrentStatus(next);
    onUpdateStatus(unitKey, next);
  };

  const handleToggleActivity = (actId: string) => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    const newActs = currentStatus.activities.map(a => {
      if (a.id === actId) {
        const nextDone = !a.done;
        return {
          ...a,
          done: nextDone,
          doneBy: nextDone ? userEmail || 'Coninsa' : null,
          doneAt: nextDone ? Date.now() : null,
        };
      }
      return a;
    });
    updateField({ activities: newActs });
  };

  const handleRemoveActivity = (actId: string) => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    const newActs = currentStatus.activities.filter(a => a.id !== actId);
    updateField({ activities: newActs });
  };

  const handleAddActivity = () => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    const actName = (newActivity === '__custom__' ? customActText.trim() : (newActivity || customActText.trim()));
    if (!actName) {
      onToast('Por favor selecciona o escribe la actividad a guardar');
      return;
    }

    const newActs = [
      ...currentStatus.activities,
      {
        id: uid(),
        name: actName,
        zone: newZone || 'General',
        done: false,
      },
    ];
    updateField({ activities: newActs });
    setNewActivity('');
    setCustomActText('');
    onToast(`Actividad "${actName}" guardada en la ficha`);
  };

  const handleDeleteApartment = () => {
    if (!isEditor) {
      onToast('Modo solo lectura · Inicia sesión con tu correo @coninsa.co para eliminar');
      return;
    }
    const unitTitle = isApt ? `Apto ${unitNumber}` : areaName;
    if (onDeleteUnit && unitKey) {
      onDeleteUnit(unitKey, isApt ? unitNumber : areaName);
    } else {
      updateField({ deleted: true });
      onClose();
      onToast(`${unitTitle} eliminado correctamente`);
    }
  };

  // Calculations & Info
  const isApt = kind === 'apt';
  let towerId = '';
  let floorLabel = '';
  let unitNumber: string | number = '';
  let areaName = '';

  if (isApt) {
    const parts = unitKey.split('#');
    towerId = parts[0];
    const floorId = parts[1];
    const idx = parseInt(parts[2], 10);
    const tower = config.towers.find(t => t.id === towerId);
    const floor = tower?.floors.find(f => f.id === floorId);
    floorLabel = floor ? floor.label : '';
    unitNumber = currentStatus.numberOverride || (floor ? floor.start + idx : idx + 1);
  } else {
    const areaId = unitKey.replace('area-', '');
    areaName = config.areas.find(a => a.id === areaId)?.name || 'Área común';
  }

  const activities = currentStatus.activities || [];
  const total = activities.length;
  const done = activities.filter(a => a.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const qrText = isApt
    ? `VIDA PARK\nTorre ${towerId} - Apto ${unitNumber}\nID: ${unitKey}`
    : `VIDA PARK\n${areaName}\nID: ${unitKey}`;
  const qrSvg = generateQrSvg(qrText, 4, 0);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto backdrop-blur-xs">
      <div className={`bg-white border border-[#CBD9CC] rounded-xl w-full ${isApt ? 'max-w-4xl' : 'max-w-xl'} relative shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]`}>
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#22406E] to-[#3C6FB0] text-white p-5 sm:p-6 relative shrink-0">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isApt && isEditor && (
              <button
                onClick={handleDeleteApartment}
                title="Eliminar este apartamento del proyecto"
                className="bg-white/10 hover:bg-red-500/80 border border-white/25 hover:border-red-400 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono-custom uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer font-bold shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-200" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
            {isApt && onEditUnit && (
              <button
                onClick={() => {
                  onClose();
                  onEditUnit(unitKey);
                }}
                className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-mono-custom uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer font-bold shadow-2xs"
                title="Modificar todos los datos del apartamento"
              >
                <Pencil className="w-3.5 h-3.5 text-[#9FC93A]" />
                <span className="hidden sm:inline">Modificar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none p-1 cursor-pointer"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          <div className="font-mono-custom text-xs uppercase tracking-widest text-white/70 mb-1">
            {isApt ? 'Ficha de apartamento' : 'Ficha de área común'}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">
              {isApt ? `Apto ${unitNumber}` : areaName}
            </div>
            {isApt && currentStatus.customReforms && (
              <span
                title="Apartamento con Reforma Especial"
                className="inline-flex items-center gap-1 bg-[#8A3FFC] text-white font-mono-custom text-xs px-2.5 py-1 rounded-full font-bold shadow-sm"
              >
                <Star className="w-3.5 h-3.5 fill-white text-white" />
                <span>Con Reforma</span>
              </span>
            )}
          </div>
          {isApt && (
            <div className="font-mono-custom text-xs uppercase tracking-wider text-white/85 mt-1">
              Torre {towerId} · {floorLabel}
            </div>
          )}
        </div>

        {/* Info Strip */}
        {isApt && (
          <div className="flex flex-wrap bg-[#EFF4EF] px-4 py-3 border-b border-[#E1E9E1] shrink-0">
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Avance</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">{pct}%</div>
            </div>
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Área</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">
                {currentStatus.m2 ? `${currentStatus.m2} m²` : '—'}
              </div>
            </div>
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Tipología</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">
                {currentStatus.typology || '—'}
              </div>
            </div>
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Acabado</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">
                {currentStatus.finish || '—'}
              </div>
            </div>
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Hab.</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">
                {currentStatus.rooms ?? '—'}
              </div>
            </div>
            <div className="flex-1 min-w-[70px] text-center border-r border-[#CBD9CC] px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Baños</div>
              <div className="font-display text-base font-bold text-[#1E3A34]">
                {currentStatus.baths ?? '—'}
              </div>
            </div>
            <div className="flex-1 min-w-[70px] text-center px-2 py-1">
              <div className="font-mono-custom text-[8.5px] uppercase text-[#6C8079] tracking-wider mb-0.5">Reforma</div>
              <div className="font-display text-base font-bold flex items-center justify-center">
                {currentStatus.customReforms ? (
                  <span className="text-[#8A3FFC] flex items-center gap-1 text-sm font-bold">
                    <Star className="w-3.5 h-3.5 fill-[#8A3FFC] text-[#8A3FFC]" /> Sí
                  </span>
                ) : (
                  <span className="text-[#6C8079] text-sm font-normal">No</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View-only notification */}
        {!isEditor && (
          <div className="bg-[#E1F3FA] text-[#146A85] px-6 py-2.5 text-xs font-mono-custom flex items-center gap-2 border-b border-[#BFEAF9] shrink-0">
            👁 Modo solo lectura — inicia sesión con tu correo @coninsa.co para modificar tareas y acabados.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className={`flex flex-col ${isApt ? 'md:flex-row' : ''} gap-6 items-start`}>
            {/* Main Column: Checklist & Notes */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-mono-custom text-xs uppercase tracking-widest text-[#6C8079] font-bold">
                  Actividades pendientes ({done}/{total})
                </h5>
                <span className="font-mono-custom text-xs font-bold text-[#3C6FB0]">{pct}% completado</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-[#EFF4EF] rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full ${pct === 100 ? 'bg-[#6EAE2E]' : 'bg-[#1CA2C9]'} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Checklist items */}
              <div className="flex flex-col gap-1 max-h-[280px] overflow-y-auto mb-4 border border-[#E1E9E1] rounded-lg p-2 bg-[#F3F7F3]/40">
                {activities.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#6C8079] font-mono-custom">
                    Sin tareas registradas todavía. Agrega la primera abajo.
                  </div>
                ) : (
                  activities.map(act => (
                    <div
                      key={act.id}
                      className={`flex items-start gap-2.5 p-2 rounded transition border ${
                        act.done
                          ? 'bg-[#EBF6DC]/60 border-[#CBD9CC]/50 text-[#6C8079]'
                          : 'bg-white border-[#E1E9E1] text-[#1E3A34]'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleActivity(act.id)}
                        disabled={!isEditor}
                        className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition ${
                          act.done
                            ? 'bg-[#6EAE2E] border-[#6EAE2E] text-white font-bold text-xs'
                            : 'bg-white border-[#CBD9CC] hover:border-[#1CA2C9]'
                        }`}
                      >
                        {act.done && '✓'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs leading-relaxed font-medium ${act.done ? 'line-through opacity-70' : ''}`}>
                          {act.zone && (
                            <span className="inline-block bg-[#EFF4EF] text-[#22406E] border border-[#CBD9CC] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mr-1.5 font-bold">
                              {act.zone}
                            </span>
                          )}
                          {act.name}
                        </div>
                        {act.done && act.doneBy && (
                          <div className="font-mono-custom text-[9.5px] text-[#6EAE2E] mt-0.5">
                            ✓ {act.doneBy} {act.doneAt ? `· ${formatDate(act.doneAt)}` : ''}
                          </div>
                        )}
                      </div>
                      {isEditor && (
                        <button
                          onClick={() => handleRemoveActivity(act.id)}
                          className="text-[#A9BAB1] hover:text-red-600 p-1 text-xs leading-none"
                          title="Eliminar tarea"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add activity form with anchored sticky action bar */}
              {isEditor && (
                <div className="mb-5 bg-[#EFF4EF] rounded-xl border border-[#CBD9CC] overflow-hidden shadow-2xs flex flex-col">
                  {/* Form Header */}
                  <div className="px-3.5 pt-3 pb-2 flex items-center justify-between bg-[#E4ECE4] border-b border-[#CBD9CC]/70 shrink-0">
                    <span className="font-mono-custom text-[11px] uppercase tracking-wider text-[#22406E] font-bold flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-[#8DC63F]" />
                      Agregar nueva actividad
                    </span>
                    <span className="text-[10px] text-[#6C8079] font-mono-custom">
                      Se guarda inmediatamente
                    </span>
                  </div>

                  {/* Form Inputs Area (can change or expand without shifting the Guardar button) */}
                  <div className="p-3 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] font-bold mb-1">
                          1. Zona
                        </label>
                        <select
                          value={newZone}
                          onChange={e => {
                            setNewZone(e.target.value);
                            setNewActivity('');
                          }}
                          className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-2.5 py-2 text-xs font-mono-custom text-[#1E3A34] font-semibold focus:outline-none"
                        >
                          <option value="">Zona (General)...</option>
                          {ZONE_OPTIONS.map(z => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] font-bold mb-1">
                          2. Actividad o Tarea
                        </label>
                        {newZone && ACTIVITY_CATALOG[newZone] && newActivity !== '__custom__' ? (
                          <select
                            value={newActivity}
                            onChange={e => setNewActivity(e.target.value)}
                            className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-xs text-[#1E3A34] font-medium focus:outline-none"
                          >
                            <option value="">Selecciona actividad del catálogo…</option>
                            {ACTIVITY_CATALOG[newZone].map(act => (
                              <option key={act} value={act}>
                                {act}
                              </option>
                            ))}
                            <option value="__custom__">✍️ Escribir otra actividad personalizada...</option>
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customActText}
                              onChange={e => setCustomActText(e.target.value)}
                              placeholder={newZone ? `Actividad en ${newZone}…` : "Escribe actividad o tarea pendiente…"}
                              className="flex-1 bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-xs text-[#1E3A34] focus:outline-none"
                            />
                            {newZone && ACTIVITY_CATALOG[newZone] && newActivity === '__custom__' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewActivity('');
                                  setCustomActText('');
                                }}
                                className="text-[10px] font-mono-custom text-[#3C6FB0] hover:underline px-1.5 py-1 whitespace-nowrap cursor-pointer"
                              >
                                Volver a lista
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Fixed / Sticky Action Footer - Guardar button never moves */}
                  <div className="sticky bottom-0 z-10 bg-[#EFF4EF] border-t border-[#CBD9CC] px-3.5 py-2.5 flex items-center justify-between shrink-0">
                    <div className="text-[11px] font-mono-custom text-[#6C8079] truncate pr-2">
                      {newZone ? (
                        <span>Zona: <strong className="text-[#22406E]">{newZone}</strong></span>
                      ) : (
                        <span>Zona: <strong className="text-[#22406E]">General</strong></span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddActivity}
                      disabled={(!newActivity || newActivity === '__custom__') && !customActText.trim()}
                      className="bg-[#22406E] hover:bg-[#3C6FB0] disabled:bg-[#A9BAB1] text-white font-mono-custom text-xs uppercase tracking-wider px-6 py-2 rounded-lg font-bold transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-[#8DC63F]" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Notes of construction */}
              <div className="mt-4">
                <label className="block font-mono-custom text-[10px] uppercase tracking-widest text-[#6C8079] font-bold mb-1">
                  Notas de obra & Observaciones
                </label>
                <textarea
                  value={currentStatus.note || ''}
                  disabled={!isEditor}
                  onChange={e => updateField({ note: e.target.value })}
                  placeholder="Materiales pendientes, detalles de contratistas, observaciones de visita…"
                  className="w-full min-h-[70px] bg-[#F3F7F3] border border-[#CBD9CC] rounded-lg p-2.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9] placeholder:text-[#A9BAB1] resize-y"
                />
              </div>

              {/* Meta */}
              <div className="mt-3 font-mono-custom text-[10px] text-[#A9BAB1]">
                {currentStatus.updated
                  ? `Última modificación: ${formatDate(currentStatus.updated)}${
                      currentStatus.lastEditedBy ? ` por ${currentStatus.lastEditedBy}` : ''
                    }`
                  : 'Sin modificaciones registradas'}
              </div>
            </div>

            {/* Side Column (Apartment Specs & QR) */}
            {isApt && (
              <div className="w-full md:w-72 shrink-0 bg-[#EFF4EF] border border-[#E1E9E1] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-mono-custom text-xs uppercase tracking-widest text-[#6C8079] font-bold">
                    Detalles de acabados
                  </h5>
                  {onEditUnit && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditUnit(unitKey);
                      }}
                      className="text-[#22406E] hover:text-[#3C6FB0] font-mono-custom text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                      title="Editar todos los datos"
                    >
                      <Pencil className="w-3 h-3 text-[#3C6FB0]" />
                      <span>Modificar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-mono-custom text-[9.5px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                      Área construida (m²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      disabled={!isEditor}
                      value={currentStatus.m2 ?? ''}
                      onChange={e => updateField({ m2: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Ej: 62.5"
                      className="w-full bg-white border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                    />
                  </div>

                  <div>
                    <label className="block font-mono-custom text-[9.5px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                      Tipología
                    </label>
                    <select
                      disabled={!isEditor}
                      value={currentStatus.typology || ''}
                      onChange={e => updateField({ typology: e.target.value || null })}
                      className="w-full bg-white border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                    >
                      <option value="">Sin definir</option>
                      {TYPOLOGY_OPTIONS.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono-custom text-[9.5px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                      Tipo de acabado (Kit)
                    </label>
                    <select
                      disabled={!isEditor}
                      value={currentStatus.finish || ''}
                      onChange={e => updateField({ finish: e.target.value || null })}
                      className="w-full bg-white border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                    >
                      <option value="">Sin definir</option>
                      {FINISH_OPTIONS.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="block font-mono-custom text-[9.5px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                        Habitaciones
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!isEditor}
                        value={currentStatus.rooms ?? ''}
                        onChange={e => updateField({ rooms: e.target.value ? parseInt(e.target.value, 10) : null })}
                        placeholder="3"
                        className="w-full bg-white border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block font-mono-custom text-[9.5px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                        Baños
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!isEditor}
                        value={currentStatus.baths ?? ''}
                        onChange={e => updateField({ baths: e.target.value ? parseInt(e.target.value, 10) : null })}
                        placeholder="2"
                        className="w-full bg-white border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#CBD9CC]">
                    <input
                      type="checkbox"
                      id="customReformsCheck"
                      disabled={!isEditor}
                      checked={!!currentStatus.customReforms}
                      onChange={e => updateField({ customReforms: e.target.checked })}
                      className="w-4 h-4 rounded text-[#3C6FB0] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="customReformsCheck" className="font-mono-custom text-xs text-[#1E3A34] cursor-pointer">
                      Reformas personalizadas
                    </label>
                  </div>

                  {/* QR Box */}
                  <div className="mt-4 pt-4 border-t border-[#CBD9CC] text-center">
                    <div className="inline-block bg-white p-2.5 rounded-lg border border-[#CBD9CC] shadow-xs">
                      <div className="w-28 h-28 mx-auto" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                    </div>
                    <div className="font-mono-custom text-[9px] uppercase tracking-wider text-[#6C8079] mt-2">
                      QR permanente para obra<br />{unitKey}
                    </div>
                  </div>

                  {/* Delete button in sidebar */}
                  {isEditor && (
                    <div className="pt-3 mt-3 border-t border-[#CBD9CC]">
                      <button
                        type="button"
                        onClick={handleDeleteApartment}
                        className="w-full text-red-600 hover:text-red-700 bg-red-50/70 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg py-2 px-3 font-mono-custom text-xs uppercase tracking-wider font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Eliminar apartamento</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Bottom Footer */}
        <div className="sticky bottom-0 z-20 bg-[#EFF4EF] px-5 sm:px-6 py-3.5 border-t border-[#E1E9E1] flex items-center justify-between shadow-md shrink-0">
          {isApt && isEditor ? (
            <button
              type="button"
              onClick={handleDeleteApartment}
              title="Eliminar esta unidad del proyecto"
              className="text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 hover:border-red-300 px-3 sm:px-4 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Eliminar apartamento</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            {isApt && onEditUnit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditUnit(unitKey);
                }}
                className="bg-white hover:bg-[#F3F7F3] border border-[#CBD9CC] text-[#22406E] px-4 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 text-[#3C6FB0]" />
                <span>Modificar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1E3A34] hover:bg-[#2C4F47] text-white px-6 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition cursor-pointer shadow-xs"
            >
              Cerrar ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
