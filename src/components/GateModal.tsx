import React, { useState } from 'react';

interface GateModalProps {
  initialEmail: string | null;
  onClose: () => void;
  onSaveEmail: (email: string) => void;
  onToast: (msg: string) => void;
}

export const GateModal: React.FC<GateModalProps> = ({ initialEmail, onClose, onSaveEmail, onToast }) => {
  const [email, setEmail] = useState(initialEmail || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('Por favor escribe un correo válido');
      return;
    }
    onSaveEmail(clean);
    onClose();
    if (clean.endsWith('@coninsa.co')) {
      onToast('Sesión iniciada: permisos de edición activados');
    } else {
      onToast('Sesión iniciada: modo solo lectura');
    }
  };

  const handleSkip = () => {
    onSaveEmail('');
    onClose();
    onToast('Modo solo lectura');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-[#CBD9CC] rounded-xl w-full max-w-md relative shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E1E9E1]">
          <div className="font-mono-custom text-xs uppercase tracking-widest text-[#1CA2C9] font-bold">
            Acceso al sistema
          </div>
          <h2 className="font-display text-2xl uppercase tracking-tight text-[#1E3A34] m-0 font-bold">
            ¿Quién eres?
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#6C8079] m-0 leading-relaxed">
            Ingresa tu correo para continuar. Los correos con dominio <b>@coninsa.co</b> obtienen permisos de edición para actualizar tareas y acabados; cualquier otro correo entra en modo solo lectura.
          </p>

          <div>
            <label className="block font-mono-custom text-[10px] uppercase tracking-wider text-[#6C8079] mb-1 font-semibold">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nombre@coninsa.co"
              className="w-full bg-[#F3F7F3] border border-[#CBD9CC] rounded-md px-3.5 py-2.5 text-xs font-mono-custom text-[#1E3A34] focus:outline-none focus:border-[#1CA2C9]"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              className="w-full bg-[#1CA2C9] hover:bg-[#168AA9] text-white py-2.5 rounded-lg font-mono-custom text-xs uppercase tracking-wider font-bold transition shadow-xs cursor-pointer"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full bg-transparent hover:bg-[#F3F7F3] text-[#6C8079] hover:text-[#1E3A34] py-2 rounded-lg font-mono-custom text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Continuar como solo lectura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
