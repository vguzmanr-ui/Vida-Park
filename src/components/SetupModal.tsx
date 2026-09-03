import React, { useState } from 'react';
import { AppConfig, UnitStatus } from '../types';
import { ZONE_OPTIONS, ACTIVITY_CATALOG } from '../constants/catalog';
import { uid, defaultConfig } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface SetupModalProps {
  config: AppConfig;
  statuses: Record<string, UnitStatus>;
  onClose: () => void;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onUpdateStatuses: (newStatuses: Record<string, UnitStatus>) => void;
  onResetAll: () => void;
  onToast: (msg: string) => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({
  config,
  statuses,
  onClose,
  onUpdateConfig,
  onUpdateStatuses,
  onResetAll,
  onToast,
}) => {
  const [newMasterZone, setNewMasterZone] = useState('');
  const [newMasterActivity, setNewMasterActivity] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const handleAddMaster = () => {
    if (!newMasterActivity) return;
    const newMaster = { name: newMasterActivity, zone: newMasterZone || 'General' };
    const updated = [...config.masterActivities, newMaster];
    onUpdateConfig({ ...config, masterActivities: updated });
    setNewMasterActivity('');
    onToast('Actividad maestra agregada');
  };

  const handleRemoveMaster = (index: number) => {
    const updated = config.masterActivities.filter((_, i) => i !== index);
    onUpdateConfig({ ...config, masterActivities: updated });
  };

  const handleApplyTemplate = () => {
    let addedCount = 0;
    const updatedStatuses = { ...statuses };

    // Update all apartment keys
    config.towers.forEach(t => {
      t.floors.forEach(f => {
        for (let i = 0; i < f.count; i++) {
          const k = `${t.id}#${f.id}#${i}`;
          const current = updatedStatuses[k] || {
            activities: [],
            note: '',
            updated: null,
            lastEditedBy: null,
          };
          const existingNames = current.activities.map(a => a.name);

          config.masterActivities.forEach(item => {
            const name = typeof item === 'string' ? item : item.name;
            const zone = typeof item === 'string' ? 'General' : item.zone || 'General';
            if (!existingNames.includes(name)) {
              current.activities.push({ id: uid(), name, zone, done: false });
              addedCount++;
            }
          });
          updatedStatuses[k] = current;
        }
      });
    });

    onUpdateStatuses(updatedStatuses);
    onToast(`${addedCount} actividad(es) sincronizada(s) en las unidades`);
  };

  const handleAddArea = () => {
    const trimmed = newAreaName.trim();
    if (!trimmed) return;
    const newArea = { id: `area-${uid()}`, name: trimmed };
    onUpdateConfig({ ...config, areas: [...config.areas, newArea] });
    setNewAreaName('');
    onToast('Área común agregada');
  };

  const handleRemoveArea = (areaId: string) => {
    const updated = config.areas.filter(a => a.id !== areaId);
    onUpdateConfig({ ...config, areas: updated });
    onToast('Área común eliminada');
  };

  const handleExportBackup = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        project: config.projectName || 'Vida Park',
        config,
        statuses,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `vida-park-respaldo-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      onToast('Respaldo descargado exitosamente');
    } catch (e) {
      console.error(e);
      onToast('Error al generar respaldo');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || !parsed.config || !parsed.statuses) {
          onToast('El archivo no tiene el formato esperado');
          return;
        }
        setConfirmDialog({
          isOpen: true,
          title: '¿Restaurar respaldo?',
          message: 'Esta acción reemplazará toda la configuración y el avance de tareas actual con los datos del archivo importado.',
          confirmLabel: 'Sí, restaurar respaldo',
          onConfirm: () => {
            onUpdateConfig(parsed.config);
            onUpdateStatuses(parsed.statuses);
            onToast('Respaldo restaurado con éxito');
            setConfirmDialog(null);
            onClose();
          },
        });
      } catch (err) {
        onToast('Error al leer el archivo JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-[#CBD9CC] rounded-xl w-full max-w-2xl relative shadow-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#E1E9E1] flex justify-between items-start shrink-0">
          <div>
            <div className="font-mono-custom text-xs uppercase tracking-widest text-[#1CA2C9] font-bold">
              Configuración
            </div>
            <h2 className="font-display text-2xl uppercase tracking-tight text-[#1E3A34] m-0 font-bold">
              Ajustes de obra
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#6C8079] hover:text-[#1E3A34] text-2xl leading-none p-1 cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Master Activities */}
          <div className="space-y-3">
            <h3 className="font-mono-custom text-xs uppercase tracking-wider text-[#1CA2C9] font-bold m-0">
              Plantilla de actividades maestras
            </h3>
            <p className="text-xs text-[#6C8079] m-0">
              Al abrir un apartamento o área por primera vez, se le asignan automáticamente estas actividades.
            </p>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-[#F3F7F3] rounded-lg border border-[#E1E9E1]">
              {config.masterActivities.length === 0 ? (
                <span className="text-xs text-[#6C8079] font-mono-custom">Sin actividades maestras definidas.</span>
              ) : (
                config.masterActivities.map((act, i) => {
                  const label = typeof act === 'string' ? act : `${act.zone ? `[${act.zone}] ` : ''}${act.name}`;
                  return (
                    <div
                      key={i}
                      className="bg-white border border-[#CBD9CC] rounded-full py-1 pl-3 pr-2 text-xs font-mono-custom flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{label}</span>
                      <button
                        onClick={() => handleRemoveMaster(i)}
                        className="text-[#A9BAB1] hover:text-red-600 font-bold p-0.5 leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newMasterZone}
                onChange={e => {
                  setNewMasterZone(e.target.value);
                  setNewMasterActivity('');
                }}
                className="sm:w-36 bg-[#F3F7F3] border border-[#CBD9CC] rounded px-2 py-1.5 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              >
                <option value="">Zona…</option>
                {ZONE_OPTIONS.map(z => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>

              <select
                value={newMasterActivity}
                disabled={!newMasterZone}
                onChange={e => setNewMasterActivity(e.target.value)}
                className="flex-1 bg-[#F3F7F3] border border-[#CBD9CC] rounded px-2 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9] disabled:opacity-50"
              >
                <option value="">{newMasterZone ? 'Selecciona actividad…' : 'Elige zona primero'}</option>
                {newMasterZone &&
                  ACTIVITY_CATALOG[newMasterZone]?.map(act => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
              </select>

              <button
                onClick={handleAddMaster}
                className="bg-[#1CA2C9] hover:bg-[#168AA9] text-white px-3 py-1.5 rounded font-mono-custom text-xs uppercase tracking-wider font-bold transition shrink-0 cursor-pointer"
              >
                Agregar
              </button>
            </div>

            <button
              onClick={handleApplyTemplate}
              className="bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] text-[#1E3A34] font-mono-custom text-xs uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer"
            >
              🔄 Sincronizar plantilla con unidades existentes
            </button>
          </div>

          {/* Common Areas */}
          <div className="space-y-3 pt-4 border-t border-[#E1E9E1]">
            <h3 className="font-mono-custom text-xs uppercase tracking-wider text-[#1CA2C9] font-bold m-0">
              Áreas comunes
            </h3>
            <p className="text-xs text-[#6C8079] m-0">Puntos fijos, amenidades, piscinas y zonas compartidas.</p>

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-2 bg-[#F3F7F3] rounded-lg border border-[#E1E9E1]">
              {config.areas.map(a => (
                <div
                  key={a.id}
                  className="bg-white border border-[#CBD9CC] rounded-full py-1 pl-3 pr-2 text-xs font-mono-custom flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{a.name}</span>
                  <button
                    onClick={() => handleRemoveArea(a.id)}
                    className="text-[#A9BAB1] hover:text-red-600 font-bold p-0.5 leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                placeholder="Ej: Salón social, Terraza BBQ…"
                className="flex-1 bg-[#F3F7F3] border border-[#CBD9CC] rounded px-3 py-1.5 text-xs text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
              />
              <button
                onClick={handleAddArea}
                className="bg-[#1CA2C9] hover:bg-[#168AA9] text-white px-4 py-1.5 rounded font-mono-custom text-xs uppercase tracking-wider font-bold transition shrink-0 cursor-pointer"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Backup Section */}
          <div className="space-y-3 pt-4 border-t border-[#E1E9E1]">
            <h3 className="font-mono-custom text-xs uppercase tracking-wider text-[#1CA2C9] font-bold m-0">
              Copia de seguridad & Restauración
            </h3>
            <p className="text-xs text-[#6C8079] m-0">
              Descarga o restaura un archivo JSON con toda la información de torres, pisos, unidades y avance.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportBackup}
                className="bg-[#3C6FB0] hover:bg-[#22406E] text-white font-mono-custom text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition font-bold cursor-pointer"
              >
                ⬇ Descargar respaldo (JSON)
              </button>

              <label className="bg-[#EFF4EF] hover:bg-[#E1E9E1] border border-[#CBD9CC] text-[#1E3A34] font-mono-custom text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition font-semibold cursor-pointer inline-flex items-center">
                ⬆ Restaurar archivo
                <input type="file" accept="application/json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-[#E1E9E1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-xs text-[#A9BAB1] m-0 max-w-sm">
              Borra toda la configuración y el progreso registrado por el equipo. Esta acción es irreversible.
            </p>
            <button
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: '¿Reiniciar todos los datos?',
                  message: 'Esta acción borrará toda la configuración personalizada y el progreso de actividades registrado. No se puede deshacer.',
                  confirmLabel: 'Sí, borrar todo',
                  onConfirm: () => {
                    onResetAll();
                    setConfirmDialog(null);
                    onClose();
                  },
                });
              }}
              className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 font-mono-custom text-xs uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer"
            >
              Borrar todo
            </button>
          </div>
        </div>

        {/* Sticky Bottom Footer */}
        <div className="sticky bottom-0 z-20 bg-[#EFF4EF] px-6 py-3.5 border-t border-[#E1E9E1] flex justify-end shadow-md shrink-0">
          <button
            onClick={onClose}
            className="bg-[#1E3A34] hover:bg-[#2C4F47] text-white px-6 py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition cursor-pointer shadow-xs"
          >
            Listo
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel="Cancelar"
          isDestructive={true}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
