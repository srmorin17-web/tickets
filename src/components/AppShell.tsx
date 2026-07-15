import type { ReactNode } from 'react';
import { useState } from 'react';
import type { Rol, User } from '../lib/types';
import { ROL_LABEL } from '../lib/ui';
import { Avatar } from './ui';
import {
  LayoutDashboard, Inbox, History, Users, Shield, Settings, FileBarChart,
  Ticket, LogOut, Menu, ChevronDown, Bell, PlusCircle, ShieldCheck, Sliders,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const navByRol: Record<Rol, NavItem[]> = {
  solicitante: [
    { id: 'dashboard', label: 'Mis tickets', icon: <LayoutDashboard size={18} /> },
    { id: 'nuevo', label: 'Nuevo ticket', icon: <PlusCircle size={18} /> },
  ],
  tecnico: [
    { id: 'bandeja', label: 'Bandeja', icon: <Inbox size={18} /> },
    { id: 'historial', label: 'Historial', icon: <History size={18} /> },
  ],
  supervisor: [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'reasignar', label: 'Reasignar', icon: <Users size={18} /> },
    { id: 'reportes', label: 'Reportes', icon: <FileBarChart size={18} /> },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={18} /> },
    { id: 'categorias', label: 'Categorías y SLA', icon: <Sliders size={18} /> },
    { id: 'areas', label: 'Áreas', icon: <Settings size={18} /> },
    { id: 'auditoria', label: 'Auditoría', icon: <ShieldCheck size={18} /> },
    { id: 'seguridad', label: 'Seguridad', icon: <Shield size={18} /> },
  ],
};

export function AppShell({
  rol, user, activeNav, onNav, onLogout, onSwitchRol, children,
}: {
  rol: Rol;
  user: User;
  activeNav: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  onSwitchRol: (r: Rol) => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const items = navByRol[rol];

  const sidebar = (
    <div className="flex h-full flex-col bg-cyan-50">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-sm">
          <Ticket size={20} />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-slate-900">CALMA</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-700">Mesa de Ayuda</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => { onNav(item.id); setMobileOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeNav === item.id
                ? 'bg-cyan-600 text-white'
                : 'text-slate-700 hover:bg-cyan-100 hover:text-slate-900'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-cyan-100 p-3">
        <div className="rounded-lg bg-cyan-100 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700">Modo demo</p>
          <p className="mt-1 text-xs text-slate-700">Cambia de rol para explorar las vistas.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-slate-200 bg-white lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-400 bg-cyan-600 px-4 lg:px-6 text-white">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu size={22} className="text-white" />
            </button>
            <div>
              <p className="text-sm font-semibold text-white">{ROL_LABEL[rol]}</p>
              <p className="text-xs text-cyan-100">Sistema de gestión de tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-cyan-100 hover:bg-cyan-500 hover:text-white">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
            <div className="relative">
              <button
                onClick={() => setSwitchOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg p-1.5 pr-2 hover:bg-cyan-500"
              >
                <Avatar initials={user.avatar_initials} size="md" />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-white">{user.nombre}</p>
                  <p className="text-xs text-cyan-100">{user.cargo}</p>
                </div>
                <ChevronDown size={16} className="text-cyan-100" />
              </button>
              {switchOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSwitchOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cambiar rol (demo)</p>
                    {(['solicitante', 'tecnico', 'supervisor', 'admin'] as Rol[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => { onSwitchRol(r); setSwitchOpen(false); }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 ${
                          r === rol ? 'font-medium text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {ROL_LABEL[r]}
                        {r === rol && <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />}
                      </button>
                    ))}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => { onLogout(); setSwitchOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut size={15} /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
