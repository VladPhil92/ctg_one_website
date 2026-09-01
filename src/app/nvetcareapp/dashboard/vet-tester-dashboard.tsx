'use client';

import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  RotateCcw,
  Stethoscope,
  WalletCards,
} from 'lucide-react';

type TesterAppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';

type TesterAppointment = {
  id: string;
  client: string;
  pet: string;
  species: string;
  service: string;
  date: string;
  time: string;
  amount: number;
  status: TesterAppointmentStatus;
  paymentStatus: 'PENDING' | 'CONFIRMED' | 'LIQUIDATED';
  diagnosis?: string;
  treatment?: string;
};

type TesterPrice = {
  id: string;
  service: string;
  price: number;
  active: boolean;
};

type TesterMessage = {
  id: string;
  author: 'CLIENT' | 'VET_TESTER';
  text: string;
};

type TesterState = {
  available: boolean;
  appointments: TesterAppointment[];
  prices: TesterPrice[];
  blockedDates: Array<{ date: string; reason: string }>;
  messages: TesterMessage[];
};

const INITIAL_STATE: TesterState = {
  available: true,
  appointments: [
    {
      id: 'sandbox-apt-1',
      client: 'Laura Martínez',
      pet: 'Bruno',
      species: 'Canino · Labrador',
      service: 'Consulta domiciliaria',
      date: '2026-09-01',
      time: '10:00',
      amount: 85000,
      status: 'CONFIRMED',
      paymentStatus: 'CONFIRMED',
    },
    {
      id: 'sandbox-apt-2',
      client: 'Andrés Gómez',
      pet: 'Mía',
      species: 'Felino · Criollo',
      service: 'Vacunación',
      date: '2026-09-01',
      time: '13:30',
      amount: 65000,
      status: 'IN_PROGRESS',
      paymentStatus: 'CONFIRMED',
    },
    {
      id: 'sandbox-apt-3',
      client: 'Camila Ruiz',
      pet: 'Rocky',
      species: 'Canino · Bulldog',
      service: 'Urgencia domiciliaria',
      date: '2026-09-02',
      time: '09:00',
      amount: 150000,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    },
  ],
  prices: [
    { id: 'price-1', service: 'Consulta domiciliaria', price: 85000, active: true },
    { id: 'price-2', service: 'Vacunación', price: 65000, active: true },
    { id: 'price-3', service: 'Urgencia domiciliaria', price: 150000, active: true },
  ],
  blockedDates: [{ date: '2026-09-05', reason: 'Bloqueo de prueba' }],
  messages: [
    { id: 'msg-1', author: 'CLIENT', text: 'Hola, Bruno está un poco decaído desde anoche.' },
    { id: 'msg-2', author: 'VET_TESTER', text: 'Gracias. Revisaremos antecedentes y signos durante la consulta.' },
  ],
};

const STATUS_LABELS: Record<TesterAppointmentStatus, string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'Atención en curso',
  COMPLETED: 'Completada',
};

function formatCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function nextStatus(appointment: TesterAppointment): TesterAppointmentStatus | null {
  if (appointment.status === 'CONFIRMED' && appointment.paymentStatus === 'CONFIRMED') return 'IN_PROGRESS';
  if (appointment.status === 'IN_PROGRESS' && appointment.diagnosis?.trim()) return 'COMPLETED';
  return null;
}

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: typeof Stethoscope }) {
  return (
    <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="rounded-full border border-[#D4A24C]/25 bg-[#D4A24C]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A641E]">Sandbox</span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#0D1B2A]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#5B6670]">{sub}</p>
    </article>
  );
}

export function VetTesterDashboard() {
  const [state, setState] = useState<TesterState>(INITIAL_STATE);
  const [selectedId, setSelectedId] = useState('sandbox-apt-2');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [newService, setNewService] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [blockedDate, setBlockedDate] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [chatText, setChatText] = useState('');
  const [notice, setNotice] = useState('');

  const selectedAppointment = state.appointments.find((appointment) => appointment.id === selectedId);
  const todayCount = state.appointments.filter((appointment) => appointment.date === '2026-09-01').length;
  const completed = state.appointments.filter((appointment) => appointment.status === 'COMPLETED');
  const financials = useMemo(() => {
    const gross = 2860000 + completed.reduce((sum, appointment) => sum + appointment.amount, 0);
    const commission = Math.round(gross * 0.03);
    return { gross, net: gross - commission, commission };
  }, [completed]);

  function announce(message: string) {
    setNotice(message);
  }

  function updateAppointment(id: string, patch: Partial<TesterAppointment>) {
    setState((current) => ({
      ...current,
      appointments: current.appointments.map((appointment) => appointment.id === id ? { ...appointment, ...patch } : appointment),
    }));
  }

  function advanceAppointment(appointment: TesterAppointment) {
    const next = nextStatus(appointment);
    if (!next) {
      announce('El sandbox respeta el flujo real: se requiere pago confirmado para iniciar y diagnóstico guardado para completar.');
      return;
    }
    updateAppointment(appointment.id, { status: next });
    announce(`Cita simulada movida a “${STATUS_LABELS[next]}”. Ningún dato productivo fue modificado.`);
  }

  function saveClinicalNotes() {
    if (!selectedAppointment || selectedAppointment.status !== 'IN_PROGRESS') {
      announce('Selecciona una cita con atención en curso para probar el registro clínico.');
      return;
    }
    if (diagnosis.trim().length < 3) {
      announce('El diagnóstico debe contener al menos 3 caracteres.');
      return;
    }
    updateAppointment(selectedAppointment.id, { diagnosis: diagnosis.trim(), treatment: treatment.trim() });
    setDiagnosis('');
    setTreatment('');
    announce('Historia clínica simulada guardada dentro del sandbox.');
  }

  function addPrice() {
    const price = Number(newPrice);
    if (!newService.trim() || !Number.isFinite(price) || price < 5000) {
      announce('Ingresa un servicio y un precio de prueba válido desde $5.000 COP.');
      return;
    }
    setState((current) => ({
      ...current,
      prices: [...current.prices, { id: `price-${Date.now()}`, service: newService.trim(), price, active: true }],
    }));
    setNewService('');
    setNewPrice('');
    announce('Servicio añadido al tarifario de prueba.');
  }

  function blockDate() {
    if (!blockedDate) {
      announce('Selecciona una fecha para simular una excepción de agenda.');
      return;
    }
    setState((current) => ({
      ...current,
      blockedDates: [
        ...current.blockedDates.filter((item) => item.date !== blockedDate),
        { date: blockedDate, reason: blockedReason.trim() || 'No disponible' },
      ],
    }));
    setBlockedDate('');
    setBlockedReason('');
    announce('Excepción de agenda creada en el sandbox.');
  }

  function sendMessage() {
    if (!chatText.trim()) return;
    setState((current) => ({
      ...current,
      messages: [...current.messages, { id: `msg-${Date.now()}`, author: 'VET_TESTER', text: chatText.trim() }],
    }));
    setChatText('');
    announce('Mensaje simulado: no se envió a ningún usuario real.');
  }

  function resetSandbox() {
    setState(INITIAL_STATE);
    setSelectedId('sandbox-apt-2');
    setDiagnosis('');
    setTreatment('');
    setNotice('Sandbox restaurado a su estado inicial.');
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-3xl bg-[#0D1B2A] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8BE0B5]">Nvet Care · Vet Tester</p>
                <span className="rounded-full border border-[#D4A24C]/35 bg-[#D4A24C]/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#F0CD85]">No productivo</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard veterinario completo para pruebas de SUPERADMIN</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                Prueba el flujo profesional de extremo a extremo sin convertir tu cuenta en veterinario, sin aparecer en el marketplace y sin escribir citas, historias clínicas, tarifas, chats o disponibilidad reales.
              </p>
            </div>
            <button type="button" onClick={resetSandbox} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/15">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar sandbox
            </button>
          </div>
        </section>

        {notice && (
          <div role="status" className="mt-4 rounded-xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] px-4 py-3 text-sm text-[#0D1B2A]">{notice}</div>
        )}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Citas hoy" value={String(todayCount)} sub={`${state.appointments.length} citas en el escenario`} icon={CalendarDays} />
          <Kpi label="Ingreso neto" value={formatCop(financials.net)} sub={`Comisión Elite simulada: ${formatCop(financials.commission)}`} icon={CircleDollarSign} />
          <Kpi label="Saldo disponible" value={formatCop(1780000)} sub="1.280 CTG simulados" icon={WalletCards} />
          <Kpi label="Verificación" value="Aprobada" sub="4,9 ★ · 42 reseñas simuladas" icon={BadgeCheck} />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Agenda profesional</p>
                <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Ciclo de atención</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setState((current) => ({ ...current, available: !current.available }));
                  announce('Disponibilidad simulada actualizada.');
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${state.available ? 'border-[#34B27A]/30 bg-[#34B27A]/10 text-[#237754]' : 'border-[#0D1B2A]/10 bg-[#F2F4F7] text-[#5B6670]'}`}
              >
                {state.available ? 'Disponible ahora' : 'No disponible'}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {state.appointments.map((appointment) => {
                const next = nextStatus(appointment);
                return (
                  <article key={appointment.id} className="rounded-xl border border-[#0D1B2A]/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#0D1B2A]">{appointment.time} · {appointment.pet}</p>
                        <p className="mt-1 text-xs text-[#5B6670]">{appointment.client} · {appointment.service} · {appointment.species}</p>
                      </div>
                      <span className="rounded-full border border-[#0D1B2A]/10 bg-[#F8F9FA] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#0D1B2A]">{STATUS_LABELS[appointment.status]}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#0D1B2A]/5 pt-3 text-xs text-[#5B6670]">
                      <span>{appointment.date} · {formatCop(appointment.amount)} · pago {appointment.paymentStatus.toLowerCase()}</span>
                      {appointment.status !== 'PENDING' && appointment.status !== 'COMPLETED' && (
                        <button type="button" onClick={() => advanceAppointment(appointment)} className="rounded-lg bg-[#0D1B2A] px-3 py-2 font-bold text-white">
                          {next === 'IN_PROGRESS' ? 'Iniciar atención' : next === 'COMPLETED' ? 'Completar' : 'Validar requisitos'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Registro clínico</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Historia de la atención</h2>
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-4 w-full rounded-xl border border-[#0D1B2A]/15 bg-white px-3 py-2.5 text-sm">
              {state.appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.pet} · {STATUS_LABELS[appointment.status]}</option>)}
            </select>
            {selectedAppointment && <p className="mt-2 text-xs text-[#5B6670]">{selectedAppointment.species} · {selectedAppointment.client}</p>}
            <textarea value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Diagnóstico" className="mt-3 min-h-24 w-full rounded-xl border border-[#0D1B2A]/15 p-3 text-sm" />
            <textarea value={treatment} onChange={(event) => setTreatment(event.target.value)} placeholder="Tratamiento e indicaciones" className="mt-3 min-h-24 w-full rounded-xl border border-[#0D1B2A]/15 p-3 text-sm" />
            <button type="button" onClick={saveClinicalNotes} className="mt-3 w-full rounded-xl bg-[#34B27A] px-4 py-2.5 text-sm font-bold text-white">Guardar registro de prueba</button>
            {selectedAppointment?.diagnosis && <p className="mt-3 rounded-xl bg-[#F2F4F7] p-3 text-xs text-[#0D1B2A]"><strong>Guardado:</strong> {selectedAppointment.diagnosis}</p>}
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 lg:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#34B27A]">Servicios y precios</p>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Tarifario profesional</h2>
            <div className="mt-4 space-y-2">
              {state.prices.map((price) => (
                <div key={price.id} className="flex flex-wrap items-center gap-3 border-b border-[#0D1B2A]/5 pb-2 last:border-0">
                  <div className="min-w-48 flex-1">
                    <p className="text-sm font-semibold text-[#0D1B2A]">{price.service}</p>
                    <p className="text-[11px] text-[#5B6670]">{price.active ? 'Visible para reservas' : 'Oculto'}</p>
                  </div>
                  <span className="font-mono text-sm text-[#0D1B2A]">{formatCop(price.price)}</span>
                  <button
                    type="button"
                    onClick={() => setState((current) => ({ ...current, prices: current.prices.map((item) => item.id === price.id ? { ...item, active: !item.active } : item) }))}
                    className="rounded-lg border border-[#0D1B2A]/10 px-3 py-1.5 text-xs font-bold text-[#5B6670]"
                  >
                    {price.active ? 'Ocultar' : 'Activar'}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <input value={newService} onChange={(event) => setNewService(event.target.value)} placeholder="Nuevo servicio" className="rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <input value={newPrice} onChange={(event) => setNewPrice(event.target.value)} type="number" min="5000" placeholder="Precio COP" className="rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <button type="button" onClick={addPrice} className="rounded-xl bg-[#0D1B2A] px-4 py-2 text-sm font-bold text-white">Agregar</button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><Clock3 className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Agenda</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Excepciones</h2>
            <div className="mt-4 space-y-2">
              {state.blockedDates.map((item) => <p key={item.date} className="rounded-lg bg-[#F8F9FA] px-3 py-2 text-xs text-[#5B6670]">{item.date} · {item.reason}</p>)}
            </div>
            <input type="date" value={blockedDate} onChange={(event) => setBlockedDate(event.target.value)} className="mt-3 w-full rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
            <input value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} placeholder="Motivo" className="mt-2 w-full rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
            <button type="button" onClick={blockDate} className="mt-2 w-full rounded-xl border border-[#0D1B2A]/15 px-4 py-2 text-sm font-bold text-[#0D1B2A]">Bloquear fecha</button>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><MessageCircle className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Chat</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Comunicación con cliente</h2>
            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-[#F8F9FA] p-3">
              {state.messages.map((message) => (
                <div key={message.id} className={`flex ${message.author === 'VET_TESTER' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[82%] rounded-xl px-3 py-2 text-xs ${message.author === 'VET_TESTER' ? 'bg-[#34B27A]/10 text-[#0D1B2A]' : 'bg-white text-[#0D1B2A]'}`}>{message.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={chatText} onChange={(event) => setChatText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Mensaje de prueba" className="min-w-0 flex-1 rounded-xl border border-[#0D1B2A]/15 px-3 py-2 text-sm" />
              <button type="button" onClick={sendMessage} className="rounded-xl bg-[#34B27A] px-4 py-2 text-sm font-bold text-white">Enviar</button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <div className="flex items-center gap-2 text-[#237754]"><Stethoscope className="h-4 w-4" aria-hidden="true" /><p className="text-[11px] font-bold uppercase tracking-[0.12em]">Perfil profesional</p></div>
            <h2 className="mt-1 text-lg font-bold text-[#0D1B2A]">Verificación y plan</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Licencia</dt><dd className="font-semibold text-[#0D1B2A]">TEST-NVET-0001</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Estado</dt><dd className="font-semibold text-[#237754]">Verificado</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Plan</dt><dd className="font-semibold text-[#0D1B2A]">Elite · 3%</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Especialidades</dt><dd className="text-right font-semibold text-[#0D1B2A]">Medicina general, Urgencias</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#5B6670]">Radio de servicio</dt><dd className="font-semibold text-[#0D1B2A]">12 km</dd></div>
            </dl>
            <div className="mt-5 rounded-xl border border-[#D4A24C]/20 bg-[#D4A24C]/[0.06] p-3 text-xs leading-5 text-[#6F511B]">
              Este perfil no existe en la base productiva, no puede recibir reservas y nunca se publica en el marketplace.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
