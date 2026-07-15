import type { TicketEvent, User } from '../lib/types';
import { Avatar } from './ui';
import { timeAgo } from '../lib/ui';
import { MessageSquare, ArrowRight, Flag, UserCheck, Plus, Info } from 'lucide-react';

const tipoIcon: Record<string, typeof MessageSquare> = {
  creacion: Plus,
  cambio_estado: ArrowRight,
  comentario: MessageSquare,
  escalamiento: Flag,
  solicitud_info: Info,
  reasignacion: UserCheck,
};

const tipoColor: Record<string, string> = {
  creacion: 'bg-emerald-50 text-emerald-600',
  cambio_estado: 'bg-sky-50 text-sky-600',
  comentario: 'bg-slate-100 text-slate-600',
  escalamiento: 'bg-rose-50 text-rose-600',
  solicitud_info: 'bg-amber-50 text-amber-600',
  reasignacion: 'bg-indigo-50 text-indigo-600',
};

export function Timeline({ events, users }: { events: TicketEvent[]; users: User[] }) {
  const userMap = new Map(users.map((u) => [u.id, u]));
  return (
    <div className="space-y-1">
      {events.map((ev, i) => {
        const Icon = tipoIcon[ev.tipo] ?? MessageSquare;
        const user = ev.usuario_id ? userMap.get(ev.usuario_id) : null;
        return (
          <div key={ev.id} className="relative flex gap-3 pb-5">
            {i < events.length - 1 && (
              <div className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />
            )}
            <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tipoColor[ev.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
              <Icon size={15} />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                {user && <Avatar initials={user.avatar_initials} size="sm" />}
                <span className="text-sm font-medium text-slate-900">{user?.nombre ?? 'Sistema'}</span>
                <span className="text-xs text-slate-400">{timeAgo(ev.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{ev.comentario}</p>
              {ev.estado_anterior && ev.estado_nuevo && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{ev.estado_anterior}</span>
                  <ArrowRight size={11} />
                  <span className="rounded bg-slate-100 px-1.5 py-0.5">{ev.estado_nuevo}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
