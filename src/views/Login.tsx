import { useState } from 'react';
import type { Rol, User } from '../lib/types';
import { ROL_LABEL } from '../lib/ui';
import { Button } from '../components/ui';
import { Ticket, Mail, Lock, ArrowRight, ShieldCheck, Clock, Users } from 'lucide-react';

const demoUsers: { rol: Rol; email: string; nombre: string; cargo: string }[] = [
  { rol: 'solicitante', email: 'ana.torres@empresa.cl', nombre: 'Ana Torres', cargo: 'Jefa de Operaciones' },
  { rol: 'tecnico', email: 'diego.rojas@empresa.cl', nombre: 'Diego Rojas', cargo: 'Técnico Nivel 1' },
  { rol: 'supervisor', email: 'francisco.lopez@empresa.cl', nombre: 'Francisco López', cargo: 'Supervisor de Mesa' },
  { rol: 'admin', email: 'gabriela.soto@empresa.cl', nombre: 'Gabriela Soto', cargo: 'Administradora del Sistema' },
];

export function Login({ users, onLogin }: { users: User[]; onLogin: (user: User) => void }) {
  const [email, setEmail] = useState('ana.torres@empresa.cl');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = users.find((u) => u.email === email && u.estado === 'activo');
      if (!user) {
        setError('Credenciales inválidas o usuario inactivo. Usa una cuenta demo de la lista.');
        setLoading(false);
        return;
      }
      onLogin(user);
    }, 500);
  }

  function quickLogin(rol: Rol) {
    const u = users.find((x) => x.rol === rol && x.estado === 'activo');
    if (u) { setEmail(u.email); setPassword('demo1234'); }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden w-1/2 flex-col justify-center bg-gradient-to-br from-cyan-700 via-cyan-600 to-cyan-500 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur shadow-lg">
            <Ticket size={22} className="text-white" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">CALMA</p>
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-100">Mesa de Ayuda</p>
          </div>
        </div>
        <div className="mt-16 max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Sistema de tickets
          </h1>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-col justify-center bg-slate-50 px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
                <Ticket size={20} />
              </div>
              <p className="text-lg font-bold tracking-tight text-slate-900">CALMA</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">Accede al sistema de mesa de ayuda.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="tu@empresa.cl"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
              Accesos rápidos (demo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((d) => (
                <button
                  key={d.rol}
                  onClick={() => quickLogin(d.rol)}
                  className="rounded-lg border border-slate-200 bg-white p-2.5 text-left transition-all hover:border-sky-300 hover:shadow-sm"
                >
                  <p className="text-xs font-semibold text-slate-900">{ROL_LABEL[d.rol]}</p>
                  <p className="truncate text-[11px] text-slate-400">{d.nombre}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
