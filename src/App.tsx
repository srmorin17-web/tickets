import { useCallback, useEffect, useState } from 'react';
import type { Area, AuditLog, Category, Rol, SecurityEvent, SlaConfig, TicketWithRelations, User } from './lib/types';
import {
  fetchAreas, fetchAudit, fetchCategories, fetchSecurity, fetchSla, fetchTickets, fetchUsers, logSecurityEvent,
} from './lib/data';
import { AppShell } from './components/AppShell';
import { Login } from './views/Login';
import { SolicitanteDashboard, SolicitanteNuevo } from './views/Solicitante';
import { TecnicoBandeja, TecnicoHistorial } from './views/Tecnico';
import { SupervisorDashboard, SupervisorReasignar, SupervisorReportes } from './views/Supervisor';
import { AdminAuditoria, AdminAreas, AdminCategorias, AdminDashboard, AdminSeguridad, AdminUsuarios } from './views/Admin';
import { TicketDrawer } from './components/TicketDrawer';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sla, setSla] = useState<SlaConfig[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [security, setSecurity] = useState<SecurityEvent[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [openTicket, setOpenTicket] = useState<TicketWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const [u, t, c, s, a, au, se] = await Promise.all([
      fetchUsers(), fetchTickets(), fetchCategories(), fetchSla(), fetchAreas(), fetchAudit(), fetchSecurity(),
    ]);
    setUsers(u); setTickets(t); setCategories(c); setSla(s); setAreas(a); setAudit(au); setSecurity(se);
  }, []);

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false));
  }, [loadAll]);

  function handleLogin(user: User) {
    setCurrentUser(user);
    setActiveNav('dashboard');
    logSecurityEvent({
      usuario_nombre: user.email,
      usuario_rol: user.rol,
      ruta: `/${user.rol}/dashboard`,
      resultado: 'registrado',
    }).catch(() => {});
  }

  function handleLogout() {
    if (currentUser) {
      logSecurityEvent({
        usuario_nombre: currentUser.email,
        usuario_rol: currentUser.rol,
        ruta: '/logout',
        resultado: 'registrado',
      }).catch(() => {});
    }
    setCurrentUser(null);
  }

  function handleSwitchRol(rol: Rol) {
    const u = users.find((x) => x.rol === rol && x.estado === 'activo');
    if (u) {
      setCurrentUser(u);
      setActiveNav('dashboard');
    }
  }

  function refresh() {
    loadAll().catch(console.error);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
          <p className="mt-3 text-sm text-slate-500">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login users={users} onLogin={handleLogin} />;
  }

  const rol = currentUser.rol;

  return (
    <>
      <AppShell
        rol={rol}
        user={currentUser}
        activeNav={activeNav}
        onNav={setActiveNav}
        onLogout={handleLogout}
        onSwitchRol={handleSwitchRol}
      >
        {rol === 'solicitante' && activeNav === 'dashboard' && (
          <SolicitanteDashboard
            tickets={tickets}
            user={currentUser} onOpenTicket={setOpenTicket}
          />
        )}
        {rol === 'solicitante' && activeNav === 'nuevo' && (
          <SolicitanteNuevo user={currentUser} categories={categories} sla={sla} onCreated={refresh} />
        )}

        {rol === 'tecnico' && activeNav === 'bandeja' && (
          <TecnicoBandeja
            tickets={tickets}
            user={currentUser} onOpenTicket={setOpenTicket}
          />
        )}
        {rol === 'tecnico' && activeNav === 'historial' && (
          <TecnicoHistorial
            tickets={tickets}
            user={currentUser} onOpenTicket={setOpenTicket}
          />
        )}

        {rol === 'supervisor' && activeNav === 'dashboard' && (
          <SupervisorDashboard
            tickets={tickets} users={users} areas={areas}
            user={currentUser} onOpenTicket={setOpenTicket} onRefresh={refresh}
          />
        )}
        {rol === 'supervisor' && activeNav === 'reasignar' && (
          <SupervisorReasignar
            tickets={tickets} users={users} areas={areas}
            user={currentUser} onOpenTicket={setOpenTicket} onRefresh={refresh}
          />
        )}
        {rol === 'supervisor' && activeNav === 'reportes' && (
          <SupervisorReportes tickets={tickets} users={users} categories={categories} />
        )}

        {rol === 'admin' && activeNav === 'dashboard' && (
          <AdminDashboard users={users} audit={audit} security={security} />
        )}
        {rol === 'admin' && activeNav === 'usuarios' && (
          <AdminUsuarios users={users} onChanged={refresh} />
        )}
        {rol === 'admin' && activeNav === 'categorias' && (
          <AdminCategorias categories={categories} sla={sla} onChanged={refresh} />
        )}
        {rol === 'admin' && activeNav === 'areas' && (
          <AdminAreas areas={areas} users={users} onChanged={refresh} />
        )}
        {rol === 'admin' && activeNav === 'auditoria' && (
          <AdminAuditoria audit={audit} />
        )}
        {rol === 'admin' && activeNav === 'seguridad' && (
          <AdminSeguridad security={security} />
        )}
      </AppShell>

      <TicketDrawer
        ticket={openTicket}
        users={users}
        open={!!openTicket}
        onClose={() => setOpenTicket(null)}
        actorId={currentUser.id}
        actorNombre={currentUser.nombre}
        actorRol={currentUser.rol}
        onChanged={refresh}
      />
    </>
  );
}
