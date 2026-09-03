import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppConfig, Scope, UnitStatus, UnitCardItem } from './types';
import {
  loadStoredData,
  saveStoredConfig,
  saveStoredStatuses,
  loadStoredUserEmail,
  saveStoredUserEmail,
  computeIsEditor,
  defaultConfig,
} from './services/storage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UnitCard } from './components/UnitCard';
import { UnitFichaModal } from './components/UnitFichaModal';
import { AddAptModal } from './components/AddAptModal';
import { EditAptModal } from './components/EditAptModal';
import { MetricsModal } from './components/MetricsModal';
import { SetupModal } from './components/SetupModal';
import { GateModal } from './components/GateModal';
import { ConfirmModal } from './components/ConfirmModal';
import { printQRSheet } from './utils/printQR';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => loadStoredData().config);
  const [statuses, setStatuses] = useState<Record<string, UnitStatus>>(() => loadStoredData().statuses);
  const [userEmail, setUserEmail] = useState<string | null>(() => loadStoredUserEmail());
  const [isEditor, setIsEditor] = useState<boolean>(() => computeIsEditor(loadStoredUserEmail()));

  const [scope, setScope] = useState<Scope>({ type: 'all' });
  const [sidebarTower, setSidebarTower] = useState<string>('A');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [activeUnitKey, setActiveUnitKey] = useState<string | null>(null);
  const [activeUnitKind, setActiveUnitKind] = useState<'apt' | 'area'>('apt');
  const [editAptUnitKey, setEditAptUnitKey] = useState<string | null>(null);
  const [addAptOpen, setAddAptOpen] = useState(false);
  const [addAptTowerId, setAddAptTowerId] = useState('A');
  const [addAptFloorId, setAddAptFloorId] = useState<string | undefined>(undefined);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  // In-app confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Initial user gate prompt if not identified
  useEffect(() => {
    if (!userEmail) {
      setGateOpen(true);
    }
  }, [userEmail]);

  // Save config changes
  const handleUpdateConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
  };

  // Save statuses changes
  const handleUpdateStatuses = (newStatuses: Record<string, UnitStatus>) => {
    setStatuses(newStatuses);
    saveStoredStatuses(newStatuses);
  };

  const handleUpdateSingleStatus = (unitKey: string, status: UnitStatus) => {
    const updated = { ...statuses, [unitKey]: status };
    setStatuses(updated);
    saveStoredStatuses(updated);
  };

  const handleSaveAptDetails = (
    oldUnitKey: string,
    updatedStatus: UnitStatus,
    targetTowerId?: string,
    targetFloorId?: string
  ) => {
    const parts = oldUnitKey.split('#');
    const oldTowerId = parts[0];
    const oldFloorId = parts[1];

    if (
      !targetTowerId ||
      !targetFloorId ||
      (targetTowerId === oldTowerId && targetFloorId === oldFloorId)
    ) {
      handleUpdateSingleStatus(oldUnitKey, updatedStatus);
    } else {
      // Move unit to selected target tower & floor
      const targetTower = config.towers.find(t => t.id === targetTowerId);
      const targetFloor = targetTower?.floors.find(f => f.id === targetFloorId);

      if (targetTower && targetFloor) {
        const nextIdx = targetFloor.count;
        const newFloorCount = targetFloor.count + 1;
        const newUnitKey = `${targetTowerId}#${targetFloorId}#${nextIdx}`;

        const newTowers = config.towers.map(t => {
          if (t.id !== targetTowerId) return t;
          return {
            ...t,
            floors: t.floors.map(f => (f.id === targetFloorId ? { ...f, count: newFloorCount } : f)),
          };
        });
        const newConfig = { ...config, towers: newTowers };

        const oldStatus = statuses[oldUnitKey] || {
          activities: [],
          note: '',
          updated: Date.now(),
          lastEditedBy: null,
        };
        const newStatuses = {
          ...statuses,
          [oldUnitKey]: { ...oldStatus, deleted: true, updated: Date.now() },
          [newUnitKey]: updatedStatus,
        };

        handleUpdateConfig(newConfig);
        handleUpdateStatuses(newStatuses);
        setSidebarTower(targetTowerId);
        setScope({ type: 'floor', towerId: targetTowerId, floorId: targetFloorId });
      } else {
        handleUpdateSingleStatus(oldUnitKey, updatedStatus);
      }
    }
  };

  const handleDeleteUnit = (unitKey: string, unitNumber?: string | number) => {
    if (!isEditor) {
      setGateOpen(true);
      showToast('Inicia sesión con tu correo @coninsa.co para eliminar apartamentos');
      return;
    }
    const parts = unitKey.split('#');
    const tId = parts[0];
    const fId = parts[1];
    const idx = parseInt(parts[2], 10);
    const tower = config.towers.find(t => t.id === tId);
    const floor = tower?.floors.find(f => f.id === fId);
    const status = statuses[unitKey];
    const calculatedNum = status?.numberOverride || (floor ? floor.start + idx : idx + 1);
    const displayNum = unitNumber || calculatedNum;

    setConfirmState({
      isOpen: true,
      title: `¿Eliminar Apartamento ${displayNum}?`,
      message: `Esta acción dará de baja el Apartamento ${displayNum} (Torre ${tId} · ${floor?.label || 'Piso'}) y lo retirará del tablero de control.`,
      confirmLabel: 'Sí, eliminar apartamento',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        const current = statuses[unitKey] || { activities: [], note: '', updated: Date.now(), lastEditedBy: null };
        const updated: UnitStatus = {
          ...current,
          deleted: true,
          updated: Date.now(),
          lastEditedBy: userEmail || null,
        };
        handleUpdateSingleStatus(unitKey, updated);
        if (activeUnitKey === unitKey) setActiveUnitKey(null);
        if (editAptUnitKey === unitKey) setEditAptUnitKey(null);
        setConfirmState(null);
        showToast(`Apto ${displayNum} eliminado correctamente`);
      },
    });
  };

  const handleSaveEmail = (email: string) => {
    setUserEmail(email || null);
    setIsEditor(computeIsEditor(email));
    saveStoredUserEmail(email);
  };

  const handleResetAll = () => {
    const def = defaultConfig();
    setConfig(def);
    setStatuses({});
    setScope({ type: 'all' });
    setSidebarTower('A');
    saveStoredConfig(def);
    saveStoredStatuses({});
    showToast('Datos reiniciados');
  };

  // Escape key handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmState(null);
        setActiveUnitKey(null);
        setEditAptUnitKey(null);
        setAddAptOpen(false);
        setMetricsOpen(false);
        setSetupOpen(false);
        setGateOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Compute items in view
  const visibleItems = useMemo<UnitCardItem[]>(() => {
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      const results: UnitCardItem[] = [];
      config.towers.forEach(t => {
        t.floors.forEach(f => {
          for (let i = 0; i < f.count; i++) {
            const k = `${t.id}#${f.id}#${i}`;
            if (statuses[k]?.deleted) continue;
            const u = statuses[k];
            const num = String(u?.numberOverride || f.start + i).toLowerCase();
            const haystack = `${num} torre ${t.id.toLowerCase()} ${f.label.toLowerCase()}`;
            if (haystack.includes(q)) {
              results.push({ key: k, kind: 'apt' });
            }
          }
        });
      });

      config.areas.forEach(a => {
        if (a.name.toLowerCase().includes(q)) {
          results.push({ key: `area-${a.id}`, kind: 'area', area: a });
        }
      });
      return results;
    }

    if (scope.type === 'areas') {
      return config.areas.map(a => ({ key: `area-${a.id}`, kind: 'area', area: a }));
    }

    if (scope.type === 'status') {
      const results: UnitCardItem[] = [];
      config.towers.forEach(t => {
        t.floors.forEach(f => {
          for (let i = 0; i < f.count; i++) {
            const k = `${t.id}#${f.id}#${i}`;
            if (statuses[k]?.deleted) continue;
            const u = statuses[k];
            const acts = u?.activities || [];
            const isDone = acts.length > 0 && acts.every(a => a.done);

            if (scope.status === 'done' && isDone) {
              results.push({ key: k, kind: 'apt' });
            }
            if (scope.status === 'pending' && !isDone) {
              results.push({ key: k, kind: 'apt' });
            }
          }
        });
      });
      return results;
    }

    if (scope.type === 'floor') {
      const t = config.towers.find(x => x.id === scope.towerId);
      const f = t?.floors.find(x => x.id === scope.floorId);
      if (!f || !t) return [];
      const results: UnitCardItem[] = [];
      for (let i = 0; i < f.count; i++) {
        const k = `${t.id}#${f.id}#${i}`;
        if (!statuses[k]?.deleted) {
          results.push({ key: k, kind: 'apt' });
        }
      }
      return results;
    }

    if (scope.type === 'tower') {
      const t = config.towers.find(x => x.id === scope.towerId);
      if (!t) return [];
      const results: UnitCardItem[] = [];
      t.floors.forEach(f => {
        for (let i = 0; i < f.count; i++) {
          const k = `${t.id}#${f.id}#${i}`;
          if (!statuses[k]?.deleted) {
            results.push({ key: k, kind: 'apt' });
          }
        }
      });
      return results;
    }

    // All
    const allApt: UnitCardItem[] = [];
    config.towers.forEach(t => {
      t.floors.forEach(f => {
        for (let i = 0; i < f.count; i++) {
          const k = `${t.id}#${f.id}#${i}`;
          if (!statuses[k]?.deleted) {
            allApt.push({ key: k, kind: 'apt' });
          }
        }
      });
    });
    return allApt;
  }, [config, statuses, scope, searchQuery]);

  const scopeTitle = useMemo(() => {
    if (searchQuery.trim()) {
      return `Resultados de búsqueda: "${searchQuery.trim()}"`;
    }
    if (scope.type === 'areas') return 'Áreas comunes';
    if (scope.type === 'status') return scope.status === 'done' ? 'Unidades completas' : 'Unidades pendientes';
    if (scope.type === 'floor') {
      const t = config.towers.find(x => x.id === scope.towerId);
      const f = t?.floors.find(x => x.id === scope.floorId);
      return `Torre ${scope.towerId} · ${f ? f.label : 'Piso'}`;
    }
    if (scope.type === 'tower') return `Torre ${scope.towerId}`;
    return 'Todos los apartamentos';
  }, [searchQuery, scope, config]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F3F7F3] text-[#1E3A34] items-start">
      {/* Sidebar */}
      <Sidebar
        config={config}
        statuses={statuses}
        scope={scope}
        sidebarTower={sidebarTower}
        userEmail={userEmail}
        isEditor={isEditor}
        onSelectScope={s => {
          setSearchQuery('');
          setScope(s);
        }}
        onSelectSidebarTower={tid => {
          setSidebarTower(tid);
        }}
        onOpenGate={() => setGateOpen(true)}
        onOpenAddApt={(tId, fId) => {
          setAddAptTowerId(tId);
          setAddAptFloorId(fId);
          setAddAptOpen(true);
        }}
        onOpenUnitPanel={(key, kind) => {
          setActiveUnitKey(key);
          setActiveUnitKind(kind);
        }}
        onUpdateConfig={handleUpdateConfig}
        onToast={showToast}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-7 lg:p-9 w-full max-w-7xl mx-auto">
        <Header
          title={scopeTitle}
          resultCount={visibleItems.length}
          searchQuery={searchQuery}
          isEditor={isEditor}
          onSearchChange={setSearchQuery}
          onOpenPrintQR={() => printQRSheet(visibleItems, config, statuses, scopeTitle, showToast)}
          onOpenMetrics={() => setMetricsOpen(true)}
          onOpenSetup={() => setSetupOpen(true)}
        />

        {/* Cards Grid */}
        {visibleItems.length === 0 ? (
          <div className="border border-dashed border-[#CBD9CC] rounded-xl p-12 text-center text-[#6C8079] text-sm bg-white/50">
            {searchQuery.trim()
              ? `Sin resultados para "${searchQuery.trim()}".`
              : scope.type === 'areas'
              ? 'No hay áreas comunes configuradas.'
              : 'No hay apartamentos en esta vista. Puedes usar "+ Agregar apartamento" en el panel lateral para registrar el primero.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleItems.map(item => (
              <UnitCard
                key={item.key}
                item={item}
                config={config}
                status={statuses[item.key]}
                isEditor={isEditor}
                onOpenUnit={(key, kind) => {
                  setActiveUnitKey(key);
                  setActiveUnitKind(kind);
                }}
                onEditUnit={item.kind === 'apt' ? (key) => setEditAptUnitKey(key) : undefined}
                onDeleteUnit={item.kind === 'apt' ? (key, num) => handleDeleteUnit(key, num) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Unit Ficha Modal */}
      {activeUnitKey && (
        <UnitFichaModal
          unitKey={activeUnitKey}
          kind={activeUnitKind}
          config={config}
          status={statuses[activeUnitKey]}
          isEditor={isEditor}
          userEmail={userEmail}
          onClose={() => setActiveUnitKey(null)}
          onUpdateStatus={handleUpdateSingleStatus}
          onEditUnit={(key) => setEditAptUnitKey(key)}
          onDeleteUnit={(key, num) => handleDeleteUnit(key, num)}
          onToast={showToast}
        />
      )}

      {/* Edit Apartment Modal */}
      {editAptUnitKey && (
        <EditAptModal
          unitKey={editAptUnitKey}
          config={config}
          status={statuses[editAptUnitKey]}
          userEmail={userEmail}
          isEditor={isEditor}
          onClose={() => setEditAptUnitKey(null)}
          onSave={handleSaveAptDetails}
          onDelete={(key) => handleDeleteUnit(key)}
          onOpenGate={() => setGateOpen(true)}
          onToast={showToast}
        />
      )}

      {/* Add Apartment Modal */}
      {addAptOpen && (
        <AddAptModal
          initialTowerId={addAptTowerId}
          initialFloorId={addAptFloorId}
          config={config}
          userEmail={userEmail}
          onClose={() => setAddAptOpen(false)}
          onSaveNewApt={(tId, fId, newStatus, newConfig) => {
            const fl = newConfig.towers.find(t => t.id === tId)?.floors.find(f => f.id === fId);
            const idx = (fl?.count || 1) - 1;
            const newKey = `${tId}#${fId}#${idx}`;
            const updatedStatuses = { ...statuses, [newKey]: newStatus };
            handleUpdateConfig(newConfig);
            handleUpdateStatuses(updatedStatuses);
            setAddAptOpen(false);
            setScope({ type: 'floor', towerId: tId, floorId: fId });
            setSidebarTower(tId);
          }}
          onToast={showToast}
        />
      )}

      {/* Metrics Modal */}
      {metricsOpen && (
        <MetricsModal config={config} statuses={statuses} onClose={() => setMetricsOpen(false)} />
      )}

      {/* Setup Modal */}
      {setupOpen && (
        <SetupModal
          config={config}
          statuses={statuses}
          onClose={() => setSetupOpen(false)}
          onUpdateConfig={handleUpdateConfig}
          onUpdateStatuses={handleUpdateStatuses}
          onResetAll={handleResetAll}
          onToast={showToast}
        />
      )}

      {/* Access Gate Modal */}
      {gateOpen && (
        <GateModal
          initialEmail={userEmail}
          onClose={() => setGateOpen(false)}
          onSaveEmail={handleSaveEmail}
          onToast={showToast}
        />
      )}

      {/* In-App Confirmation Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          isDestructive={confirmState.isDestructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1E3A34] text-white px-5 py-2.5 rounded-lg font-mono-custom text-xs shadow-xl z-50 border border-[#CBD9CC] transition-all">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
