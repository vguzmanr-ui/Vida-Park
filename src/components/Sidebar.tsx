import React, { useState } from 'react';
import { AppConfig, Scope, UnitStatus } from '../types';
import { STAGES } from '../constants/catalog';
import { uid } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface SidebarProps {
  config: AppConfig;
  statuses: Record<string, UnitStatus>;
  scope: Scope;
  sidebarTower: string;
  userEmail: string | null;
  isEditor: boolean;
  onSelectScope: (scope: Scope) => void;
  onSelectSidebarTower: (towerId: string) => void;
  onOpenGate: () => void;
  onOpenAddApt: (towerId: string, floorId?: string) => void;
  onOpenUnitPanel: (unitKey: string, type: 'apt' | 'area') => void;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onToast: (msg: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  statuses,
  scope,
  sidebarTower,
  userEmail,
  isEditor,
  onSelectScope,
  onSelectSidebarTower,
  onOpenGate,
  onOpenAddApt,
  onOpenUnitPanel,
  onUpdateConfig,
  onToast,
}) => {
  const [floorFormOpen, setFloorFormOpen] = useState(false);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [floorLabel, setFloorLabel] = useState('');
  const [floorCount, setFloorCount] = useState('4');
  const [floorStart, setFloorStart] = useState('101');
  const [floorToDelete, setFloorToDelete] = useState<{ id: string; label: string } | null>(null);

  // Breakdown calculations
  const allAptKeys: string[] = [];
  config.towers.forEach(t => {
    t.floors.forEach(f => {
      for (let i = 0; i < f.count; i++) {
        const k = `${t.id}#${f.id}#${i}`;
        if (!statuses[k]?.deleted) allAptKeys.push(k);
      }
    });
  });

  let completas = 0;
  let progreso = 0;
  let sinIniciar = 0;
  let sinActividades = 0;

  allAptKeys.forEach(k => {
    const u = statuses[k];
    if (!u || !u.activities || u.activities.length === 0) {
      sinActividades++;
    } else {
      const doneCount = u.activities.filter(a => a.done).length;
      if (doneCount === u.activities.length) completas++;
      else if (doneCount === 0) sinIniciar++;
      else progreso++;
    }
  });

  const totalApts = allAptKeys.length;
  const pendientes = totalApts - completas;

  const currentTower = config.towers.find(t => t.id === sidebarTower);

  const getFloorProgress = (towerId: string, floorId: string) => {
    const floor = config.towers.find(t => t.id === towerId)?.floors.find(f => f.id === floorId);
    if (!floor) return { total: 0, done: 0, pct: 0, apts: 0 };
    let total = 0;
    let done = 0;
    let count = 0;
    for (let i = 0; i < floor.count; i++) {
      const k = `${towerId}#${floorId}#${i}`;
      if (!statuses[k]?.deleted) {
        count++;
        const u = statuses[k];
        if (u && u.activities && u.activities.length > 0) {
          total += u.activities.length;
          done += u.activities.filter(a => a.done).length;
        }
      }
    }
    return {
      total,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      apts: count,
    };
  };

  const getAreaProgress = (areaId: string) => {
    const u = statuses['area-' + areaId];
    if (!u || !u.activities || u.activities.length === 0) return { total: 0, done: 0, pct: 0 };
    const done = u.activities.filter(a => a.done).length;
    return { total: u.activities.length, done, pct: Math.round((done / u.activities.length) * 100) };
  };

  const handleStartNewFloor = () => {
    const defIndex = (currentTower?.floors.length || 0) + 1;
    setFloorLabel(`Piso ${defIndex}`);
    setFloorCount('4');
    setFloorStart(`${(defIndex - 1) * 100 + 101}`);
    setEditingFloorId(null);
    setFloorFormOpen(true);
  };

  const handleStartEditFloor = (floorId: string) => {
    const f = currentTower?.floors.find(x => x.id === floorId);
    if (!f) return;
    setFloorLabel(f.label);
    setFloorCount(String(f.count));
    setFloorStart(String(f.start));
    setEditingFloorId(floorId);
    setFloorFormOpen(true);
  };

  const handleSaveFloor = () => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    if (!currentTower) return;
    const countNum = Math.max(0, parseInt(floorCount, 10) || 0);
    const startNum = Math.max(1, parseInt(floorStart, 10) || 1);
    const labelTrim = floorLabel.trim() || 'Piso';

    const newTowers = config.towers.map(t => {
      if (t.id !== currentTower.id) return t;
      if (editingFloorId) {
        return {
          ...t,
          floors: t.floors.map(f => (f.id === editingFloorId ? { ...f, label: labelTrim, count: countNum, start: startNum } : f)),
        };
      } else {
        const newFloor = { id: uid(), label: labelTrim, count: countNum, start: startNum };
        return { ...t, floors: [...t.floors, newFloor] };
      }
    });

    onUpdateConfig({ ...config, towers: newTowers });
    setFloorFormOpen(false);
    setEditingFloorId(null);
    onToast('Piso guardado correctamente');
  };

  const handleDeleteFloor = (floorId: string) => {
    if (!isEditor) {
      onToast('Solo lectura · inicia con tu correo @coninsa.co para editar');
      return;
    }
    const fl = currentTower?.floors.find(f => f.id === floorId);
    setFloorToDelete({ id: floorId, label: fl ? fl.label : 'Piso' });
  };

  const confirmDeleteFloor = () => {
    if (!floorToDelete || !currentTower) return;
    const floorId = floorToDelete.id;

    const newTowers = config.towers.map(t => {
      if (t.id !== currentTower.id) return t;
      return { ...t, floors: t.floors.filter(f => f.id !== floorId) };
    });

    onUpdateConfig({ ...config, towers: newTowers });
    onSelectScope({ type: 'tower', towerId: currentTower.id });
    setFloorFormOpen(false);
    setEditingFloorId(null);
    setFloorToDelete(null);
    onToast('Piso eliminado');
  };

  return (
    <aside className="w-full lg:w-[296px] shrink-0 min-h-screen bg-gradient-to-b from-[#22406E] via-[#3C6FB0] to-[#2E5A94] text-white p-5 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto flex flex-col gap-5 shadow-lg">
      {/* Brand box */}
      <div className="bg-white rounded-lg p-3.5 flex flex-col items-center justify-center gap-3 shadow-sm">
        {/* Vida Park Logo */}
        <div className="flex items-center justify-center gap-2.5 w-full">
          <img
            src="/assets/logo-vp.svg"
            alt="Vida Park"
            className="h-11 w-auto object-contain rounded-xs shadow-xs"
            loading="eager"
          />
          <div className="flex flex-col text-left">
            <span className="font-display font-bold text-xl tracking-tight text-[#22406E] leading-none">
              VIDA <span className="text-[#8DC63F]">PARK</span>
            </span>
            <span className="text-[9.5px] font-mono-custom tracking-wider text-[#6C8079] uppercase mt-0.5 font-medium">
              Rionegro · Antioquia
            </span>
          </div>
        </div>

        <div className="w-4/5 h-px bg-[#E2E8F0]" />

        {/* Coninsa Logo */}
        <img
          src="/assets/logo-coninsa.svg"
          alt="Coninsa"
          className="h-6 w-auto max-w-full object-contain"
          loading="eager"
        />
      </div>

      {/* Project Title */}
      <div>
        <p className="font-mono-custom text-[10px] tracking-[0.16em] uppercase text-white/70 m-0">Cuadro de control</p>
        <h1 className="font-display text-2xl uppercase font-semibold tracking-tight m-0 leading-tight">
          {config.projectName || 'Vida Park'}
        </h1>
      </div>

      {/* User Badge */}
      <div className="flex items-center justify-between gap-2 bg-white/10 border border-white/20 rounded-md p-2.5 font-mono-custom text-xs">
        <div className="min-w-0 overflow-hidden">
          <span className="truncate block max-w-[140px] text-white font-medium">
            {userEmail || 'Sin identificar'}
          </span>
          <span className={`text-[9.5px] uppercase tracking-wide block mt-0.5 ${isEditor ? 'text-[#9FC93A] font-bold' : 'text-white/60'}`}>
            {isEditor ? 'Editor Coninsa' : 'Solo lectura'}
          </span>
        </div>
        <button
          onClick={onOpenGate}
          className="shrink-0 bg-transparent border border-white/30 hover:bg-white/15 text-white rounded px-2 py-1 text-[10px] uppercase transition"
        >
          {userEmail ? 'Cambiar' : 'Ingresar'}
        </button>
      </div>

      {/* Stat Tiles */}
      <div className="flex gap-2">
        <button
          onClick={() => onSelectScope({ type: 'all' })}
          className={`flex-1 rounded-md p-2 text-center transition border ${
            scope.type === 'all'
              ? 'bg-white text-[#22406E] border-white font-semibold'
              : 'bg-white/10 border-white/20 hover:bg-white/15 text-white'
          }`}
        >
          <span className="font-mono-custom font-bold text-lg block leading-none">{totalApts}</span>
          <span className="font-mono-custom text-[8.5px] uppercase tracking-wider opacity-80 block mt-1">Aptos</span>
        </button>
        <button
          onClick={() => onSelectScope({ type: 'status', status: 'pending' })}
          className={`flex-1 rounded-md p-2 text-center transition border ${
            scope.type === 'status' && scope.status === 'pending'
              ? 'bg-white text-[#22406E] border-white font-semibold'
              : 'bg-white/10 border-white/20 hover:bg-white/15 text-white'
          }`}
        >
          <span className="font-mono-custom font-bold text-lg block leading-none">{pendientes}</span>
          <span className="font-mono-custom text-[8.5px] uppercase tracking-wider opacity-80 block mt-1">Pend.</span>
        </button>
        <button
          onClick={() => onSelectScope({ type: 'status', status: 'done' })}
          className={`flex-1 rounded-md p-2 text-center transition border ${
            scope.type === 'status' && scope.status === 'done'
              ? 'bg-white text-[#22406E] border-white font-semibold'
              : 'bg-white/10 border-white/20 hover:bg-white/15 text-white'
          }`}
        >
          <span className="font-mono-custom font-bold text-lg block leading-none">{completas}</span>
          <span className="font-mono-custom text-[8.5px] uppercase tracking-wider opacity-80 block mt-1">Listos</span>
        </button>
      </div>

      {/* CTA Add Apartment */}
      {isEditor && (
        <button
          onClick={() => {
            const targetFloor = currentTower?.floors[0]?.id;
            onOpenAddApt(sidebarTower, targetFloor);
          }}
          className="w-full bg-[#9FC93A] hover:brightness-105 active:scale-[0.99] text-[#1B3311] py-3 px-4 rounded-lg font-display uppercase tracking-wide font-bold text-sm transition shadow-sm"
        >
          + Agregar apartamento
        </button>
      )}

      {/* Breakdown Box */}
      <div className="bg-white/10 border border-white/15 rounded-md p-3">
        <p className="font-mono-custom text-[9.5px] uppercase tracking-widest text-white/70 m-0 mb-2 font-semibold">
          Unidades por estado
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono-custom">
          <div className="flex justify-between gap-1">
            <span className="text-white/80">Completas</span>
            <span className="font-bold text-[#9FC93A]">{completas}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-white/80">En progreso</span>
            <span className="font-bold text-[#BFEAF9]">{progreso}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-white/80">Sin iniciar</span>
            <span className="font-bold text-white">{sinIniciar}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-white/80">Sin tareas</span>
            <span className="font-bold text-white/50">{sinActividades}</span>
          </div>
        </div>
      </div>

      {/* Tower Picker */}
      <div>
        <p className="font-mono-custom text-[10px] tracking-widest uppercase text-white/60 mb-2 font-semibold">
          Torres
        </p>
        <div className="flex flex-col gap-2">
          {STAGES.map(stage => (
            <div key={stage.id} className="flex flex-col gap-1">
              <span className="font-mono-custom text-[9px] uppercase tracking-wider text-white/50">{stage.label}</span>
              <div className="flex gap-1.5">
                {stage.towers.map(tid => {
                  const isActive = tid === sidebarTower;
                  return (
                    <button
                      key={tid}
                      onClick={() => {
                        onSelectSidebarTower(tid);
                        onSelectScope({ type: 'tower', towerId: tid });
                        setFloorFormOpen(false);
                      }}
                      className={`flex-1 h-8 rounded text-xs font-mono-custom font-bold border transition ${
                        isActive
                          ? 'bg-white text-[#22406E] border-white shadow-sm'
                          : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                      }`}
                    >
                      {tid}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floors Section */}
      <div>
        <p className="font-mono-custom text-[10px] tracking-widest uppercase text-white/60 mb-2 font-semibold">
          Pisos — Torre {sidebarTower}
        </p>
        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
          <button
            onClick={() => {
              onSelectScope({ type: 'tower', towerId: sidebarTower });
              setFloorFormOpen(false);
            }}
            className={`flex justify-between items-center px-3 py-2 rounded text-xs font-mono-custom border transition ${
              scope.type === 'tower' && scope.towerId === sidebarTower
                ? 'bg-white text-[#22406E] font-bold border-white'
                : 'bg-white/5 border-white/15 text-white hover:bg-white/15'
            }`}
          >
            <span>Todos los pisos</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
          </button>

          {currentTower && currentTower.floors.length > 0 ? (
            currentTower.floors.map(f => {
              const fp = getFloorProgress(currentTower.id, f.id);
              const isActive = scope.type === 'floor' && scope.towerId === currentTower.id && scope.floorId === f.id;
              const dotColor = fp.apts === 0 ? 'rgba(255,255,255,0.4)' : fp.pct === 100 ? '#9FC93A' : '#BFEAF9';
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    onSelectScope({ type: 'floor', towerId: currentTower.id, floorId: f.id });
                    setFloorFormOpen(false);
                  }}
                  className={`flex justify-between items-center px-3 py-2 rounded text-xs font-mono-custom border transition ${
                    isActive
                      ? 'bg-white text-[#22406E] font-bold border-white'
                      : 'bg-white/5 border-white/15 text-white hover:bg-white/15'
                  }`}
                >
                  <span className="truncate">{f.label} ({fp.apts} aptos)</span>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                </button>
              );
            })
          ) : (
            <div className="text-white/60 text-xs py-1">Sin pisos creados.</div>
          )}
        </div>

        {/* Floor Edit / Add Mini Controls */}
        {isEditor && !floorFormOpen && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={handleStartNewFloor}
              className="flex-1 text-[10px] font-mono-custom uppercase py-1.5 px-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
            >
              + Nuevo piso
            </button>
            {scope.type === 'floor' && scope.towerId === sidebarTower && (
              <button
                onClick={() => handleStartEditFloor(scope.floorId)}
                className="flex-1 text-[10px] font-mono-custom uppercase py-1.5 px-2 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
              >
                Editar piso
              </button>
            )}
          </div>
        )}

        {isEditor && floorFormOpen && (
          <div className="bg-white/10 border border-white/20 rounded-md p-2.5 mt-2 flex flex-col gap-2">
            <input
              type="text"
              value={floorLabel}
              onChange={e => setFloorLabel(e.target.value)}
              placeholder="Nombre del piso"
              className="w-full bg-white/15 border border-white/30 text-white rounded px-2.5 py-1.5 font-mono-custom text-xs placeholder:text-white/50 focus:outline-none focus:border-white"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="60"
                value={floorCount}
                onChange={e => setFloorCount(e.target.value)}
                placeholder="Aptos"
                className="w-1/2 bg-white/15 border border-white/30 text-white rounded px-2.5 py-1.5 font-mono-custom text-xs placeholder:text-white/50 focus:outline-none focus:border-white"
              />
              <input
                type="number"
                min="1"
                value={floorStart}
                onChange={e => setFloorStart(e.target.value)}
                placeholder="N° inicial"
                className="w-1/2 bg-white/15 border border-white/30 text-white rounded px-2.5 py-1.5 font-mono-custom text-xs placeholder:text-white/50 focus:outline-none focus:border-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveFloor}
                className="flex-1 bg-[#9FC93A] text-[#1B3311] font-bold text-[11px] font-mono-custom uppercase py-1.5 rounded transition hover:brightness-105"
              >
                Guardar
              </button>
              <button
                onClick={() => setFloorFormOpen(false)}
                className="flex-1 bg-white/10 text-white text-[11px] font-mono-custom uppercase py-1.5 rounded transition hover:bg-white/20 border border-white/30"
              >
                Cancelar
              </button>
            </div>
            {editingFloorId && (
              <button
                onClick={() => handleDeleteFloor(editingFloorId)}
                className="w-full text-red-300 hover:text-red-100 text-[10px] font-mono-custom uppercase py-1 rounded transition"
              >
                Eliminar piso
              </button>
            )}
          </div>
        )}
      </div>

      {/* Common Areas List */}
      <div>
        <p className="font-mono-custom text-[10px] tracking-widest uppercase text-white/60 mb-2 font-semibold">
          Áreas comunes
        </p>
        <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
          <button
            onClick={() => onSelectScope({ type: 'areas' })}
            className={`w-full text-center py-2 px-3 rounded text-xs font-mono-custom border transition font-semibold tracking-wide ${
              scope.type === 'areas'
                ? 'bg-white text-[#22406E] border-white'
                : 'bg-white/5 border-white/15 text-white hover:bg-white/15'
            }`}
          >
            Ver todas
          </button>
          {config.areas.map(a => {
            const ap = getAreaProgress(a.id);
            const dotColor = ap.total === 0 ? 'rgba(255,255,255,0.4)' : ap.pct === 100 ? '#9FC93A' : '#BFEAF9';
            return (
              <button
                key={a.id}
                onClick={() => onOpenUnitPanel('area-' + a.id, 'area')}
                className="flex justify-between items-center py-1.5 px-3 rounded text-[11px] font-mono-custom bg-white/5 border border-white/15 text-white hover:bg-white/15 transition text-left"
              >
                <span className="truncate">{a.name}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Delete Floor Modal */}
      {floorToDelete && (
        <ConfirmModal
          isOpen={true}
          title={`¿Eliminar ${floorToDelete.label}?`}
          message={`Esta acción eliminará el ${floorToDelete.label} de la Torre ${sidebarTower} y los apartamentos dejarán de listarse en esta vista.`}
          confirmLabel="Sí, eliminar piso"
          cancelLabel="Cancelar"
          isDestructive={true}
          onConfirm={confirmDeleteFloor}
          onCancel={() => setFloorToDelete(null)}
        />
      )}
    </aside>
  );
};
