import React, { useState } from 'react';
import { AppConfig, UnitStatus } from '../types';
import { FINISH_OPTIONS, TYPOLOGY_OPTIONS, ZONE_OPTIONS, ACTIVITY_CATALOG } from '../constants/catalog';
import { uid } from '../services/storage';
import { Star } from 'lucide-react';

interface AddAptModalProps {
  initialTowerId: string;
  initialFloorId?: string;
  config: AppConfig;
  userEmail: string | null;
  onClose: () => void;
  onSaveNewApt: (towerId: string, floorId: string, status: UnitStatus, newConfig: AppConfig) => void;
  onToast: (msg: string) => void;
}

export const AddAptModal: React.FC<AddAptModalProps> = ({
  initialTowerId,
  initialFloorId,
  config,
  userEmail,
  onClose,
  onSaveNewApt,
  onToast,
}) => {
  const [towerId, setTowerId] = useState(initialTowerId);
  const tower = config.towers.find(t => t.id === towerId) || config.towers[0];
  const [floorId, setFloorId] = useState(initialFloorId || (tower?.floors[0]?.id || ''));

  const currentFloor = tower?.floors.find(f => f.id === floorId) || tower?.floors[0];
  const defaultNextNum = currentFloor ? (currentFloor.start || 1) + currentFloor.count : 101;

  const [numberVal, setNumberVal] = useState(String(defaultNextNum));
  const [finishVal, setFinishVal] = useState<string>('Kit Full');
  const [roomsVal, setRoomsVal] = useState('3');
  const [bathsVal, setBathsVal] = useState('2');
  const [m2Val, setM2Val] = useState('62');
  const [typologyVal, setTypologyVal] = useState('Tipo A');
  const [customReforms, setCustomReforms] = useState(false);

  const [pendingRows, setPendingRows] = useState<Array<{ zone: string; activity: string }>>([
    { zone: 'General', activity: 'Tercera mano de pintura' },
    { zone: 'Cocinas', activity: 'Electrodomesticos (Cubierta, campana y horno)' },
  ]);

  const handleAddPendingRow = () => {
    setPendingRows([...pendingRows, { zone: '', activity: '' }]);
  };

  const handleRemovePendingRow = (index: number) => {
    setPendingRows(pendingRows.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: 'zone' | 'activity', value: string) => {
    const updated = [...pendingRows];
    updated[index][field] = value;
    if (field === 'zone') {
      updated[index].activity = '';
    }
    setPendingRows(updated);
  };

  const handleSave = () => {
    if (!tower || !currentFloor) {
      onToast('Selecciona una torre y piso válidos');
      return;
    }

    const idx = currentFloor.count;
    const updatedFloorCount = currentFloor.count + 1;

    // Update config with incremented floor count
    const updatedTowers = config.towers.map(t => {
      if (t.id !== tower.id) return t;
      return {
        ...t,
        floors: t.floors.map(f => (f.id === currentFloor.id ? { ...f, count: updatedFloorCount } : f)),
      };
    });

    const newConfig: AppConfig = {
      ...config,
      towers: updatedTowers,
    };

    const activities = pendingRows
      .filter(r => r.activity.trim() !== '')
      .map(r => ({
        id: uid(),
        name: r.activity.trim(),
        zone: r.zone || 'General',
        done: false,
      }));

    const status: UnitStatus = {
      activities,
      note: '',
      updated: Date.now(),
      lastEditedBy: userEmail || null,
      m2: m2Val ? parseFloat(m2Val) : null,
      finish: finishVal || null,
      typology: typologyVal || null,
      rooms: roomsVal ? parseInt(roomsVal, 10) : null,
      baths: bathsVal ? parseInt(bathsVal, 10) : null,
      customReforms,
      numberOverride: numberVal !== String(defaultNextNum) ? numberVal : null,
    };

    onSaveNewApt(tower.id, currentFloor.id, status, newConfig);
    onToast(`Apartamento ${numberVal} registrado con éxito`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-[#CBD9CC] rounded-xl w-full max-w-2xl relative shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Banner */}
        <div className="bg-gradient-to-r from-[#22406E] to-[#3C6FB0] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none p-1 cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight m-0">
            Registrar nuevo apartamento
          </h2>
          <div className="font-mono-custom text-xs uppercase tracking-wider text-white/75 mt-1">
            Formulario de control de obra — Torre {tower?.id}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                N° Apartamento *
              </label>
              <input
                type="text"
                value={numberVal}
                onChange={e => setNumberVal(e.target.value)}
                placeholder="Ej. 214"
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              />
            </div>

            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Torre
              </label>
              <select
                value={towerId}
                onChange={e => {
                  setTowerId(e.target.value);
                  const newT = config.towers.find(t => t.id === e.target.value);
                  if (newT && newT.floors.length > 0) {
                    setFloorId(newT.floors[0].id);
                  }
                }}
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              >
                {config.towers.map(t => (
                  <option key={t.id} value={t.id}>
                    Torre {t.id} ({t.stage})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Piso
              </label>
              <select
                value={floorId}
                onChange={e => {
                  setFloorId(e.target.value);
                  const fl = tower?.floors.find(f => f.id === e.target.value);
                  if (fl) {
                    setNumberVal(String(fl.start + fl.count));
                  }
                }}
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              >
                {tower?.floors.map(fl => (
                  <option key={fl.id} value={fl.id}>
                    {fl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Tipo acabado (Kit) *
              </label>
              <select
                value={finishVal}
                onChange={e => setFinishVal(e.target.value)}
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              >
                {FINISH_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Habitaciones
              </label>
              <input
                type="number"
                min="0"
                value={roomsVal}
                onChange={e => setRoomsVal(e.target.value)}
                placeholder="3"
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              />
            </div>

            <div>
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Baños
              </label>
              <input
                type="number"
                min="0"
                value={bathsVal}
                onChange={e => setBathsVal(e.target.value)}
                placeholder="2"
                className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3 py-2 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              />
            </div>
          </div>

          {/* Area box */}
          <div className="bg-[#EFF4EF] border border-[#E1E9E1] rounded-lg p-4 flex gap-4">
            <div className="flex-1">
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Área construida (m²) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={m2Val}
                onChange={e => setM2Val(e.target.value)}
                placeholder="Ej. 62"
                className="w-full bg-white border border-[#CBD9CC] rounded-md p-2.5 font-display text-xl text-[#3C6FB0] font-bold focus:outline-none focus:border-[#1CA2C9]"
              />
            </div>
            <div className="flex-1">
              <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
                Tipología
              </label>
              <select
                value={typologyVal}
                onChange={e => setTypologyVal(e.target.value)}
                className="w-full bg-white border border-[#CBD9CC] rounded-md p-2.5 font-display text-xl text-[#3C6FB0] font-bold focus:outline-none focus:border-[#1CA2C9]"
              >
                {TYPOLOGY_OPTIONS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom reforms */}
          <div className="py-2">
            <label
              htmlFor="newAptCustomCheck"
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                customReforms
                  ? 'bg-[#FAF5FF] border-[#DDD0F3] text-[#581C87]'
                  : 'bg-[#F8FAF8] border-[#E1E9E1] text-[#1E3A34] hover:bg-[#F3F7F3]'
              }`}
            >
              <input
                type="checkbox"
                id="newAptCustomCheck"
                checked={customReforms}
                onChange={e => setCustomReforms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[#8A3FFC] border-[#CBD9CC] focus:ring-[#8A3FFC] cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-mono-custom text-xs font-bold">
                  <Star className={`w-3.5 h-3.5 ${customReforms ? 'fill-[#8A3FFC] text-[#8A3FFC]' : 'text-gray-400'}`} />
                  <span>Requiere Reformas Personalizadas</span>
                  {customReforms && (
                    <span className="bg-[#8A3FFC] text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                      ★ Estrella morada
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6C8079] mt-0.5">
                  Marca este apartamento para mostrarlo con la estrella morada e incluirlo en las métricas de reformas.
                </p>
              </div>
            </label>
          </div>

          {/* Initial pending activities */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div>
                <h4 className="font-mono-custom text-xs uppercase tracking-wider text-[#1E3A34] font-bold m-0">
                  Pendientes iniciales para entrega
                </h4>
                <p className="text-[11px] text-[#6C8079] m-0">
                  * Puedes agregar más pendientes desde la ficha más adelante.
                </p>
              </div>
              <button
                onClick={handleAddPendingRow}
                className="bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] text-[#1E3A34] text-[10.5px] font-mono-custom uppercase tracking-wider px-2.5 py-1 rounded cursor-pointer"
              >
                + Agregar fila
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {pendingRows.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={row.zone}
                    onChange={e => handleUpdateRow(i, 'zone', e.target.value)}
                    className="w-1/3 bg-[#F3F7F3] border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
                  >
                    <option value="">Selecciona zona…</option>
                    {ZONE_OPTIONS.map(z => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.activity}
                    disabled={!row.zone}
                    onChange={e => handleUpdateRow(i, 'activity', e.target.value)}
                    className="flex-1 bg-[#F3F7F3] border border-[#CBD9CC] rounded px-2.5 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9] disabled:opacity-50"
                  >
                    <option value="">{row.zone ? 'Selecciona actividad…' : 'Elige zona primero'}</option>
                    {row.zone &&
                      ACTIVITY_CATALOG[row.zone]?.map(act => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                  </select>

                  {pendingRows.length > 1 && (
                    <button
                      onClick={() => handleRemovePendingRow(i)}
                      className="text-[#A9BAB1] hover:text-red-600 p-1 text-sm font-bold leading-none cursor-pointer"
                      title="Quitar fila"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="sticky bottom-0 z-20 bg-[#EFF4EF] px-6 py-3.5 border-t border-[#E1E9E1] flex justify-end gap-3 shadow-md shrink-0">
          <button
            onClick={onClose}
            className="border border-[#CBD9CC] bg-white hover:bg-[#F3F7F3] text-[#1E3A34] px-4 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-[#22406E] hover:bg-[#3C6FB0] text-white px-6 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition shadow-xs cursor-pointer"
          >
            Crear apartamento
          </button>
        </div>
      </div>
    </div>
  );
};
