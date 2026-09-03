import React, { useState } from 'react';
import { AppConfig, UnitStatus } from '../types';
import { FINISH_OPTIONS, TYPOLOGY_OPTIONS, ZONE_OPTIONS, ACTIVITY_CATALOG } from '../constants/catalog';
import { uid } from '../services/storage';
import { Pencil, Check, X, Plus, Trash2, Home, Sparkles, Building2, Star } from 'lucide-react';

interface EditAptModalProps {
  unitKey: string;
  config: AppConfig;
  status?: UnitStatus;
  userEmail: string | null;
  isEditor: boolean;
  onClose: () => void;
  onSave: (
    unitKey: string,
    updatedStatus: UnitStatus,
    targetTowerId?: string,
    targetFloorId?: string
  ) => void;
  onDelete?: (unitKey: string) => void;
  onOpenGate?: () => void;
  onToast: (msg: string) => void;
}

export const EditAptModal: React.FC<EditAptModalProps> = ({
  unitKey,
  config,
  status,
  userEmail,
  isEditor,
  onClose,
  onSave,
  onDelete,
  onOpenGate,
  onToast,
}) => {
  const parts = unitKey.split('#');
  const initialTowerId = parts[0];
  const initialFloorId = parts[1];
  const idx = parseInt(parts[2], 10);

  // Tower & Floor state
  const [selectedTowerId, setSelectedTowerId] = useState<string>(initialTowerId);
  const selectedTower = config.towers.find(t => t.id === selectedTowerId) || config.towers[0];

  const [selectedFloorId, setSelectedFloorId] = useState<string>(initialFloorId);
  const selectedFloor =
    selectedTower?.floors.find(f => f.id === selectedFloorId) || selectedTower?.floors[0];

  const initialTower = config.towers.find(t => t.id === initialTowerId);
  const initialFloor = initialTower?.floors.find(f => f.id === initialFloorId);
  const defaultNum = initialFloor ? initialFloor.start + idx : idx + 1;

  // Form states
  const [numberVal, setNumberVal] = useState<string>(
    status?.numberOverride ? String(status.numberOverride) : String(defaultNum)
  );
  const [m2Val, setM2Val] = useState<string>(status?.m2 !== null && status?.m2 !== undefined ? String(status.m2) : '62');
  const [typologyVal, setTypologyVal] = useState<string>(status?.typology || 'Tipo A');
  const [finishVal, setFinishVal] = useState<string>(status?.finish || 'Kit Full');
  const [roomsVal, setRoomsVal] = useState<string>(
    status?.rooms !== null && status?.rooms !== undefined ? String(status.rooms) : '3'
  );
  const [bathsVal, setBathsVal] = useState<string>(
    status?.baths !== null && status?.baths !== undefined ? String(status.baths) : '2'
  );
  const [customReforms, setCustomReforms] = useState<boolean>(!!status?.customReforms);
  const [noteVal, setNoteVal] = useState<string>(status?.note || '');

  const handleTowerChange = (newTId: string) => {
    setSelectedTowerId(newTId);
    const targetTower = config.towers.find(t => t.id === newTId);
    if (targetTower && targetTower.floors.length > 0) {
      const matchingFloor = targetTower.floors.find(f => f.id === selectedFloorId) || targetTower.floors[0];
      setSelectedFloorId(matchingFloor.id);
    }
  };

  // Activities
  const [activities, setActivities] = useState(status?.activities || []);
  const [newZone, setNewZone] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [customActText, setCustomActText] = useState('');

  const handleAddActivity = () => {
    const actName = newActivity || customActText.trim();
    if (!actName) return;

    const newAct = {
      id: uid(),
      name: actName,
      zone: newZone || 'General',
      done: false,
    };
    setActivities([...activities, newAct]);
    setNewActivity('');
    setCustomActText('');
    onToast('Tarea agregada a la lista');
  };

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const handleToggleActivity = (id: string) => {
    setActivities(
      activities.map(a => {
        if (a.id === id) {
          const nextDone = !a.done;
          return {
            ...a,
            done: nextDone,
            doneBy: nextDone ? userEmail || 'Coninsa' : null,
            doneAt: nextDone ? Date.now() : null,
          };
        }
        return a;
      })
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditor) {
      onToast('Modo solo lectura · Inicia sesión con tu correo @coninsa.co');
      if (onOpenGate) onOpenGate();
      return;
    }

    const updatedStatus: UnitStatus = {
      activities,
      note: noteVal.trim(),
      updated: Date.now(),
      lastEditedBy: userEmail || status?.lastEditedBy || null,
      m2: m2Val ? parseFloat(m2Val) : null,
      finish: finishVal || null,
      typology: typologyVal || null,
      rooms: roomsVal ? parseInt(roomsVal, 10) : null,
      baths: bathsVal ? parseInt(bathsVal, 10) : null,
      customReforms,
      numberOverride: numberVal.trim() !== String(defaultNum) ? numberVal.trim() : null,
      deleted: false,
    };

    onSave(unitKey, updatedStatus, selectedTowerId, selectedFloorId);
    const towerLabel = selectedTowerId !== initialTowerId ? ` (Torre ${selectedTowerId})` : '';
    onToast(`Datos del Apto ${numberVal}${towerLabel} guardados correctamente`);
    onClose();
  };

  const handleDelete = () => {
    if (!isEditor) {
      onToast('Modo solo lectura · Inicia sesión con tu correo @coninsa.co');
      return;
    }

    if (onDelete) {
      onDelete(unitKey);
    } else {
      const updatedStatus: UnitStatus = {
        ...(status || { activities: [], note: '', updated: Date.now(), lastEditedBy: null }),
        deleted: true,
        updated: Date.now(),
        lastEditedBy: userEmail || null,
      };
      onSave(unitKey, updatedStatus);
      onToast(`Apartamento ${numberVal} eliminado`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-[#CBD9CC] rounded-2xl w-full max-w-2xl relative shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#22406E] via-[#3C6FB0] to-[#2E5A94] text-white p-5 sm:p-6 relative shrink-0">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isEditor && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-white/10 hover:bg-red-500/80 border border-white/20 hover:border-red-400 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono-custom uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer font-bold shadow-2xs"
                title="Eliminar este apartamento"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-200" />
                <span className="hidden sm:inline">Eliminar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full leading-none cursor-pointer transition"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 font-mono-custom text-xs uppercase tracking-widest text-[#9FC93A] font-bold mb-1">
            <Pencil className="w-3.5 h-3.5" /> Modificar datos de la unidad
          </div>
          <div className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight">
            Apartamento {numberVal || defaultNum}
          </div>
          <div className="flex items-center gap-3 font-mono-custom text-xs text-white/90 mt-1">
            <span className="flex items-center gap-1 font-bold text-[#9FC93A]">
              <Building2 className="w-3.5 h-3.5" /> Torre {selectedTowerId}
            </span>
            <span>·</span>
            <span>{selectedFloor?.label || 'Piso'}</span>
            <span>·</span>
            <span className="opacity-75">ID: {unitKey}</span>
          </div>
        </div>

        {/* Read-only warning banner if not editor */}
        {!isEditor && (
          <div className="bg-[#FFFBEB] text-[#B45309] px-6 py-3 text-xs font-mono-custom flex items-center justify-between border-b border-[#FDE68A] shrink-0">
            <span>🔒 Modo solo lectura. Inicia sesión con correo @coninsa.co para guardar cambios.</span>
            {onOpenGate && (
              <button
                onClick={onOpenGate}
                className="underline font-bold text-[#92400E] hover:text-black ml-2 cursor-pointer whitespace-nowrap"
              >
                Identificarme
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
          {/* Section 1: Location, Identification & Dimensions */}
          <div>
            <h4 className="font-mono-custom text-xs uppercase tracking-widest text-[#22406E] font-bold pb-2 border-b border-[#E1E9E1] mb-4 flex items-center gap-2">
              <Home className="w-4 h-4 text-[#3C6FB0]" /> Ubicación, Identificación y Dimensiones
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#3C6FB0]" /> Torre / Edificio *
                </label>
                <select
                  disabled={!isEditor}
                  value={selectedTowerId}
                  onChange={e => handleTowerChange(e.target.value)}
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] font-bold focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                >
                  {config.towers.map(t => (
                    <option key={t.id} value={t.id}>
                      Torre {t.id} {t.name ? `- ${t.name}` : ''} ({t.stage || 'Etapa única'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#859990] font-mono-custom mt-1 block">
                  Asignación de torre en proyecto
                </span>
              </div>

              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Piso / Nivel *
                </label>
                <select
                  disabled={!isEditor}
                  value={selectedFloorId}
                  onChange={e => setSelectedFloorId(e.target.value)}
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] font-semibold focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                >
                  {selectedTower?.floors.map(fl => (
                    <option key={fl.id} value={fl.id}>
                      {fl.label} (Inicio #{fl.start} · {fl.count} aptos)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#859990] font-mono-custom mt-1 block">
                  Nivel en Torre {selectedTowerId}
                </span>
              </div>

              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Número de Apto *
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditor}
                  value={numberVal}
                  onChange={e => setNumberVal(e.target.value)}
                  placeholder={String(defaultNum)}
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] font-bold focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                />
                <span className="text-[10px] text-[#859990] font-mono-custom mt-1 block">
                  Original sugerido: {defaultNum}
                </span>
              </div>

              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Área Construida (m²)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  disabled={!isEditor}
                  value={m2Val}
                  onChange={e => setM2Val(e.target.value)}
                  placeholder="Ej: 62.5"
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Tipología
                </label>
                <select
                  disabled={!isEditor}
                  value={typologyVal}
                  onChange={e => setTypologyVal(e.target.value)}
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                >
                  <option value="">Sin definir</option>
                  {TYPOLOGY_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Finishes & Interior Layout */}
          <div>
            <h4 className="font-mono-custom text-xs uppercase tracking-widest text-[#22406E] font-bold pb-2 border-b border-[#E1E9E1] mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8DC63F]" /> Acabados y Distribución
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Tipo de Acabado (Kit)
                </label>
                <select
                  disabled={!isEditor}
                  value={finishVal}
                  onChange={e => setFinishVal(e.target.value)}
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] font-semibold focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                >
                  <option value="">Sin definir</option>
                  {FINISH_OPTIONS.map(f => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Habitaciones
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  disabled={!isEditor}
                  value={roomsVal}
                  onChange={e => setRoomsVal(e.target.value)}
                  placeholder="3"
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                />
              </div>

              <div>
                <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
                  Baños
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  disabled={!isEditor}
                  value={bathsVal}
                  onChange={e => setBathsVal(e.target.value)}
                  placeholder="2"
                  className="w-full bg-white border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg px-3 py-2 text-sm text-[#1E3A34] focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
                />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-[#F0F4F0]">
              <label
                htmlFor="modalCustomReforms"
                className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                  customReforms
                    ? 'bg-[#FAF5FF] border-[#DDD0F3] text-[#581C87]'
                    : 'bg-[#F8FAF8] border-[#E1E9E1] text-[#1E3A34] hover:bg-[#F3F7F3]'
                }`}
              >
                <input
                  type="checkbox"
                  id="modalCustomReforms"
                  disabled={!isEditor}
                  checked={customReforms}
                  onChange={e => setCustomReforms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#8A3FFC] border-[#CBD9CC] focus:ring-[#8A3FFC] cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-mono-custom text-xs font-bold">
                    <Star className={`w-3.5 h-3.5 ${customReforms ? 'fill-[#8A3FFC] text-[#8A3FFC]' : 'text-gray-400'}`} />
                    <span>Apartamento con Reforma Especial</span>
                    {customReforms && (
                      <span className="bg-[#8A3FFC] text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                        ★ Estrella morada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6C8079] mt-0.5">
                    Activa este indicador para destacar la unidad con una estrella morada en el tablero y contabilizarla en el panel de métricas de reformas.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Notes & Observations */}
          <div>
            <label className="block font-mono-custom text-[11px] uppercase tracking-wider text-[#6C8079] font-semibold mb-1.5">
              Notas de Obra y Observaciones
            </label>
            <textarea
              disabled={!isEditor}
              rows={3}
              value={noteVal}
              onChange={e => setNoteVal(e.target.value)}
              placeholder="Detalles sobre modificaciones solicitadas por el cliente, estado de entrega, observaciones de contratistas..."
              className="w-full bg-[#F8FAF8] border border-[#CBD9CC] focus:border-[#3C6FB0] rounded-lg p-3 text-xs text-[#1E3A34] focus:outline-none focus:ring-1 focus:ring-[#3C6FB0]"
            />
          </div>

          {/* Section 4: Activities / Checklist */}
          <div>
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#E1E9E1]">
              <h4 className="font-mono-custom text-xs uppercase tracking-widest text-[#22406E] font-bold">
                Actividades y Tareas ({activities.length})
              </h4>
            </div>

            {/* List of current activities */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3 p-2 bg-[#F8FAF8] rounded-lg border border-[#E1E9E1]">
              {activities.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono-custom text-[#859990]">
                  No hay tareas registradas. Agrega una nueva abajo.
                </div>
              ) : (
                activities.map(act => (
                  <div
                    key={act.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs ${
                      act.done
                        ? 'bg-[#EBF6DC]/70 border-[#CBD9CC] text-[#4F7F23]'
                        : 'bg-white border-[#E1E9E1] text-[#1E3A34]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActivity(act.id)}
                        disabled={!isEditor}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                          act.done
                            ? 'bg-[#6EAE2E] border-[#6EAE2E] text-white text-[10px] font-bold'
                            : 'bg-white border-[#CBD9CC]'
                        }`}
                      >
                        {act.done && '✓'}
                      </button>
                      <span className="bg-[#EFF4EF] text-[#22406E] font-mono-custom text-[9px] uppercase px-1.5 py-0.5 rounded font-bold shrink-0">
                        {act.zone || 'General'}
                      </span>
                      <span className={`truncate font-medium ${act.done ? 'line-through opacity-70' : ''}`}>
                        {act.name}
                      </span>
                    </div>

                    {isEditor && (
                      <button
                        type="button"
                        onClick={() => handleRemoveActivity(act.id)}
                        className="text-[#A9BAB1] hover:text-red-600 p-1 text-xs cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add activity form with isolated sticky action bar */}
            {isEditor && (
              <div className="bg-[#EFF4EF] rounded-xl border border-[#CBD9CC] overflow-hidden flex flex-col">
                <div className="p-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        className="w-full bg-white border border-[#CBD9CC] rounded-lg px-2.5 py-2 text-xs font-mono-custom text-[#1E3A34] focus:outline-none"
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
                      {newZone && ACTIVITY_CATALOG[newZone] ? (
                        <select
                          value={newActivity}
                          onChange={e => setNewActivity(e.target.value)}
                          className="w-full bg-white border border-[#CBD9CC] rounded-lg px-2.5 py-2 text-xs text-[#1E3A34] focus:outline-none"
                        >
                          <option value="">Selecciona actividad…</option>
                          {ACTIVITY_CATALOG[newZone].map(act => (
                            <option key={act} value={act}>
                              {act}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={customActText}
                          onChange={e => setCustomActText(e.target.value)}
                          placeholder="Nueva actividad o tarea..."
                          className="w-full bg-white border border-[#CBD9CC] rounded-lg px-3 py-2 text-xs text-[#1E3A34] focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="sticky bottom-0 z-10 bg-[#EFF4EF] border-t border-[#CBD9CC] px-3.5 py-2 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-mono-custom text-[#6C8079]">
                    {newZone ? <span>Zona: <strong className="text-[#22406E]">{newZone}</strong></span> : <span>Zona: <strong className="text-[#22406E]">General</strong></span>}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddActivity}
                    disabled={!newActivity && !customActText.trim()}
                    className="bg-[#3C6FB0] hover:bg-[#22406E] disabled:bg-[#A9BAB1] text-white font-mono-custom text-[11px] uppercase tracking-wider px-4 py-1.5 rounded-lg font-bold transition shrink-0 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Actividad
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete action */}
          {isEditor && (
            <div className="pt-2 border-t border-[#F0F4F0] flex justify-between items-center">
              <span className="text-xs text-[#859990] font-mono-custom">
                ¿Deseas dar de baja esta unidad?
              </span>
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-mono-custom text-[11px] uppercase tracking-wider font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar Apartamento
              </button>
            </div>
          )}
          </div>

          {/* Modal Sticky Bottom Footer Controls */}
          <div className="sticky bottom-0 z-20 bg-white -mx-5 -mb-5 sm:-mx-7 sm:-mb-7 px-5 sm:px-7 py-3.5 border-t border-[#E1E9E1] flex items-center justify-between shadow-md shrink-0">
            {isEditor ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200 px-3.5 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Eliminar Apartamento</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] text-[#1E3A34] px-4 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isEditor}
                className="bg-[#6EAE2E] hover:bg-[#5C9425] disabled:bg-[#A9BAB1] text-white px-5 sm:px-6 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> Guardar Modificaciones
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
