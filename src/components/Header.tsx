import React from 'react';

interface HeaderProps {
  title: string;
  resultCount: number;
  searchQuery: string;
  isEditor: boolean;
  onSearchChange: (q: string) => void;
  onOpenPrintQR: () => void;
  onOpenMetrics: () => void;
  onOpenSetup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  resultCount,
  searchQuery,
  isEditor,
  onSearchChange,
  onOpenPrintQR,
  onOpenMetrics,
  onOpenSetup,
}) => {
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-2xl md:text-3xl uppercase tracking-tight text-[#1E3A34] m-0 font-semibold">
            {title}
          </h2>
          <div className="font-mono-custom text-xs text-[#6C8079] mt-1 tracking-wide uppercase">
            Resultados: <b className="text-[#3C6FB0] text-sm">{resultCount}</b> unidades encontradas
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar por n°, torre, piso o área…"
              className="w-full pl-3.5 pr-8 py-2 border border-[#CBD9CC] rounded-full font-mono-custom text-xs bg-white text-[#1E3A34] placeholder:text-[#A9BAB1] focus:outline-none focus:border-[#1CA2C9] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A9BAB1] hover:text-[#1E3A34] text-sm leading-none p-1"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Icon buttons */}
          <button
            onClick={onOpenPrintQR}
            title="Imprimir códigos QR de esta vista"
            className="w-9 h-9 rounded-full border border-[#CBD9CC] bg-white text-[#6C8079] hover:text-[#1CA2C9] hover:border-[#1CA2C9] flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
          >
            🖨️
          </button>
          <button
            onClick={onOpenMetrics}
            title="Métricas y avance de obra"
            className="w-9 h-9 rounded-full border border-[#CBD9CC] bg-white text-[#6C8079] hover:text-[#1CA2C9] hover:border-[#1CA2C9] flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
          >
            📊
          </button>
          {isEditor && (
            <button
              onClick={onOpenSetup}
              title="Configuración de obra"
              className="w-9 h-9 rounded-full border border-[#CBD9CC] bg-white text-[#6C8079] hover:text-[#1CA2C9] hover:border-[#1CA2C9] flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs font-bold"
            >
              ⚙
            </button>
          )}
        </div>
      </div>
      <hr className="h-px bg-[#E1E9E1] border-none my-5" />
    </div>
  );
};
