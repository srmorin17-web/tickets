import { useMemo, useState } from 'react';
import type { Area, AuditLog, Category, SecurityEvent, SlaConfig, User } from '../lib/types';
import { Avatar, Button, Card, EmptyState, StatCard, Toggle } from '../components/ui';
import { Modal } from '../components/Overlay';
import { ROL_LABEL, formatDate, timeAgo } from '../lib/ui';
import { setUserEstado, updateSla, upsertArea, upsertCategory, upsertUser } from '../lib/data';
import {
  Users, ShieldCheck, Shield, Sliders, Plus, Search, CheckCircle2, XCircle,
  AlertTriangle, Activity, Lock, Unlock, Save, Building2,
} from 'lucide-react';

// ============ DASHBOARD ============
export function AdminDashboard({
  users, audit, security,
}: {
  users: User[];
  audit: AuditLog[];
  security: SecurityEvent[];
}) {
  const activos = users.filter((u) => u.estado === 'activo').length;
  const tecnicos = users.filter((u) => u.rol === 'tecnico' && u.estado === 'activo').length;
  const bloqueos = security.filter((s) => s.resultado === 'bloqueada').length;
  const eventosAudit = audit.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-slate-500">Configuración y monitoreo del sistema.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Usuarios activos" value={activos} icon={<Users size={18} />} accent="blue" />
        <StatCard label="Técnicos" value={tecnicos} icon={<CheckCircle2 size={18} />} accent="emerald" />
        <StatCard label="Eventos audit" value={eventosAudit} icon={<Activity size={18} />} accent="slate" />
        <StatCard label="Accesos bloqueados" value={bloqueos} icon={<Shield size={18} />} accent="rose" />
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Actividad reciente</h2>
        <div className="space-y-3">
          {audit.slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-center gap-3 text-sm">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Activity size={13} />
              </div>
              <div className="flex-1">
                <p className="text-slate-900">{a.detalles}</p>
                <p className="text-xs text-slate-400">{a.usuario_nombre ?? 'Sistema'} · {timeAgo(a.created_at)}</p>
              </div>
              <span className="font-mono text-xs text-slate-400">{a.event_id}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ USUARIOS ============
export function AdminUsuarios({
  users, onChanged,
}: {
  users: User[];
  onChanged: () => void;
}) {
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<Partial<User> | null>(null);

  const filtered = users.filter((u) =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.cargo.toLowerCase().includes(search.toLowerCase()),
  );

  async function toggleEstado(u: User) {
    await setUserEstado(u.id, u.estado === 'activo' ? 'inactivo' : 'activo');
    onChanged();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de usuarios y roles.</p>
        </div>
        <Button onClick={() => setEditUser({ nombre: '', email: '', cargo: '', rol: 'solicitante', estado: 'activo', avatar_initials: '' })}>
          <Plus size={16} /> Nuevo usuario
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
              <Avatar initials={u.avatar_initials} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{u.nombre}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.estado}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-400">{u.email} · {u.cargo}</p>
              </div>
              <span className="hidden rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 sm:block">
                {ROL_LABEL[u.rol]}
              </span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditUser(u)}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleEstado(u)}>
                  {u.estado === 'activo' ? <Lock size={13} /> : <Unlock size={13} />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <UserModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); onChanged(); }} />
    </div>
  );
}

function UserModal({
  user, onClose, onSaved,
}: {
  user: Partial<User> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<User>>(user ?? {});
  const [loading, setLoading] = useState(false);

  useMemo(() => setForm(user ?? {}), [user?.id]);

  if (!user) return null;
  const isNew = !user.id;

  async function save() {
    setLoading(true);
    try {
      const initials = (form.nombre ?? '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      await upsertUser({ ...form, avatar_initials: form.avatar_initials || initials });
      onSaved();
    } finally { setLoading(false); }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={isNew ? 'Nuevo usuario' : 'Editar usuario'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={loading || !form.nombre || !form.email}>
            <Save size={15} /> {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre completo">
          <input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="input" placeholder="Ej: Juan Pérez" />
        </Field>
        <Field label="Email">
          <input value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input" placeholder="juan@empresa.cl" />
        </Field>
        <Field label="Cargo">
          <input value={form.cargo ?? ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
            className="input" placeholder="Ej: Analista" />
        </Field>
        <Field label="Rol">
          <select value={form.rol ?? 'solicitante'} onChange={(e) => setForm({ ...form, rol: e.target.value as any })}
            className="input">
            <option value="solicitante">Solicitante</option>
            <option value="tecnico">Técnico</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Administrador</option>
          </select>
        </Field>
        <Field label="Estado">
          <select value={form.estado ?? 'activo'} onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
            className="input">
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

// ============ CATEGORIAS Y SLA ============
export function AdminCategorias({
  categories, sla, onChanged,
}: {
  categories: Category[];
  sla: SlaConfig[];
  onChanged: () => void;
}) {
  const [editCat, setEditCat] = useState<Partial<Category> | null>(null);
  const [slaEdits, setSlaEdits] = useState<Record<string, Partial<SlaConfig>>>({});

  async function saveSla(id: string) {
    const patch = slaEdits[id];
    if (!patch) return;
    await updateSla(id, patch);
    setSlaEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
    onChanged();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Categorías y SLA</h1>
        <p className="mt-1 text-sm text-slate-500">Configura categorías de tickets y tiempos de respuesta.</p>
      </div>

      {/* SLA config */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sliders size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Acuerdos de nivel de servicio (SLA)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-4">Prioridad</th>
                <th className="pb-2 pr-4">Horas respuesta</th>
                <th className="pb-2 pr-4">Horas resolución</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {sla.map((s) => {
                const edit = slaEdits[s.id] ?? {};
                const resp = edit.horas_respuesta ?? s.horas_respuesta;
                const res = edit.horas_resolucion ?? s.horas_resolucion;
                return (
                  <tr key={s.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-2 font-medium capitalize text-slate-900">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.prioridad}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <input type="number" value={resp}
                        onChange={(e) => setSlaEdits((p) => ({ ...p, [s.id]: { ...p[s.id], horas_respuesta: +e.target.value } }))}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900" />
                    </td>
                    <td className="py-3 pr-4">
                      <input type="number" value={res}
                        onChange={(e) => setSlaEdits((p) => ({ ...p, [s.id]: { ...p[s.id], horas_resolucion: +e.target.value } }))}
                        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-900" />
                    </td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost" onClick={() => saveSla(s.id)} disabled={!slaEdits[s.id]}>
                        <Save size={13} /> Guardar
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Categories */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Categorías de tickets</h2>
          <Button size="sm" onClick={() => setEditCat({ nombre: '', descripcion: '', activo: true })}>
            <Plus size={14} /> Nueva
          </Button>
        </div>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{c.nombre}</p>
                  {!c.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactiva</span>}
                </div>
                <p className="text-xs text-slate-400">{c.descripcion}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditCat(c)}>Editar</Button>
            </div>
          ))}
        </div>
      </Card>

      <CategoryModal cat={editCat} onClose={() => setEditCat(null)} onSaved={() => { setEditCat(null); onChanged(); }} />
    </div>
  );
}

function CategoryModal({ cat, onClose, onSaved }: { cat: Partial<Category> | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Category>>(cat ?? {});
  const [loading, setLoading] = useState(false);
  useMemo(() => setForm(cat ?? {}), [cat?.id]);
  if (!cat) return null;

  async function save() {
    setLoading(true);
    try { await upsertCategory(form); onSaved(); } finally { setLoading(false); }
  }

  return (
    <Modal open={!!cat} onClose={onClose} title={cat.id ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={loading || !form.nombre}><Save size={15} /> Guardar</Button>
        </div>
      }>
      <div className="space-y-4">
        <Field label="Nombre"><input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input" /></Field>
        <Field label="Descripción"><textarea value={form.descripcion ?? ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} className="input resize-none" /></Field>
        <Field label="Activa">
          <Toggle checked={form.activo ?? true} onChange={(v) => setForm({ ...form, activo: v })} />
        </Field>
      </div>
    </Modal>
  );
}

// ============ AREAS ============
export function AdminAreas({
  areas, users, onChanged,
}: {
  areas: Area[];
  users: User[];
  onChanged: () => void;
}) {
  const [editArea, setEditArea] = useState<Partial<Area> | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Áreas</h1>
          <p className="mt-1 text-sm text-slate-500">Equipos de escalamiento técnico.</p>
        </div>
        <Button onClick={() => setEditArea({ nombre: '', activo: true })}><Plus size={16} /> Nueva área</Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((a) => {
          const resp = users.find((u) => u.id === a.responsable_id);
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Building2 size={20} />
                </div>
                {!a.activo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inactiva</span>}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{a.nombre}</p>
              <p className="mt-0.5 text-xs text-slate-400">Responsable: {resp?.nombre ?? 'Sin asignar'}</p>
              <Button size="sm" variant="ghost" className="mt-3" onClick={() => setEditArea(a)}>Editar</Button>
            </Card>
          );
        })}
      </div>
      <AreaModal area={editArea} users={users} onClose={() => setEditArea(null)} onSaved={() => { setEditArea(null); onChanged(); }} />
    </div>
  );
}

function AreaModal({ area, users, onClose, onSaved }: { area: Partial<Area> | null; users: User[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Area>>(area ?? {});
  const [loading, setLoading] = useState(false);
  useMemo(() => setForm(area ?? {}), [area?.id]);
  if (!area) return null;

  async function save() {
    setLoading(true);
    try { await upsertArea(form); onSaved(); } finally { setLoading(false); }
  }

  return (
    <Modal open={!!area} onClose={onClose} title={area.id ? 'Editar área' : 'Nueva área'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={loading || !form.nombre}><Save size={15} /> Guardar</Button></div>}>
      <div className="space-y-4">
        <Field label="Nombre"><input value={form.nombre ?? ''} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input" /></Field>
        <Field label="Responsable">
          <select value={form.responsable_id ?? ''} onChange={(e) => setForm({ ...form, responsable_id: e.target.value || null })} className="input">
            <option value="">Sin responsable</option>
            {users.filter((u) => u.estado === 'activo').map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Field>
        <Field label="Activa"><Toggle checked={form.activo ?? true} onChange={(v) => setForm({ ...form, activo: v })} /></Field>
      </div>
    </Modal>
  );
}

// ============ AUDITORIA ============
export function AdminAuditoria({ audit }: { audit: AuditLog[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Auditoría</h1>
        <p className="mt-1 text-sm text-slate-500">Registro inmutable de cambios del sistema.</p>
      </div>
      <Card className="overflow-hidden">
        {audit.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={22} />} title="Sin eventos" />
        ) : (
          <div className="divide-y divide-slate-100">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Activity size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{a.detalles}</p>
                  <p className="text-xs text-slate-400">{a.usuario_nombre ?? 'Sistema'} · {formatDate(a.created_at)}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-slate-400">{a.event_id}</span>
                  {a.ticket_id && <p className="font-mono text-xs text-slate-400">{a.ticket_id}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============ SEGURIDAD ============
export function AdminSeguridad({ security }: { security: SecurityEvent[] }) {
  const bloqueados = security.filter((s) => s.resultado === 'bloqueada');
  const ok = security.filter((s) => s.resultado === 'registrado');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Seguridad</h1>
        <p className="mt-1 text-sm text-slate-500">Monitoreo de accesos al sistema.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Accesos registrados" value={ok.length} icon={<CheckCircle2 size={18} />} accent="emerald" />
        <StatCard label="Accesos bloqueados" value={bloqueados.length} icon={<AlertTriangle size={18} />} accent="rose" />
        <StatCard label="Total eventos" value={security.length} icon={<Shield size={18} />} accent="slate" />
      </div>
      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {security.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                s.resultado === 'bloqueada' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {s.resultado === 'bloqueada' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{s.usuario_nombre ?? 'Desconocido'}</p>
                <p className="text-xs text-slate-400">{s.ruta} · IP {s.ip} · {formatDate(s.created_at)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                s.resultado === 'bloqueada' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {s.resultado}
              </span>
              <span className="font-mono text-xs text-slate-400">{s.sec_id}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ Shared ============
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
