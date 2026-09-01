'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, MessageCircle, ReceiptText, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Offering = {
  id: string;
  slug: string;
  title: string;
  offering_type: string;
  summary: string;
  price_amount: number | null;
  currency: string;
};

type CatalogResponse = {
  ok?: boolean;
  offerings?: Offering[];
};

type CheckoutOrder = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  offeringSlug: string;
  offeringTitle: string;
};

type CheckoutResponse = {
  ok?: boolean;
  error?: string;
  replayed?: boolean;
  order?: CheckoutOrder;
};

function formatPrice(amount: number | null, currency: string) {
  if (amount === null) return 'Precio por confirmar';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function makeRequestKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `education-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function EducationCheckoutClient({ slug }: { slug: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const requestKeyRef = useRef<string | null>(null);
  const [offering, setOffering] = useState<Offering | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [checkoutState, setCheckoutState] = useState<'idle' | 'submitting' | 'created' | 'error' | 'entitled'>('idle');
  const [order, setOrder] = useState<CheckoutOrder | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOffering() {
      try {
        const response = await fetch('/api/education/catalog', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as CatalogResponse;
        if (cancelled) return;
        if (!response.ok || !payload.ok) {
          setCatalogState('unavailable');
          return;
        }
        const match = (payload.offerings ?? []).find((item) => item.slug === slug) ?? null;
        setOffering(match);
        setCatalogState(match ? 'ready' : 'unavailable');
      } catch {
        if (!cancelled) setCatalogState('unavailable');
      }
    }

    void loadOffering();
    return () => { cancelled = true; };
  }, [slug]);

  const loginHref = `/iniciar-sesion?next=${encodeURIComponent(`/jpvalderrama/campus/checkout/${slug}`)}`;

  const whatsappHref = useMemo(() => {
    if (!order) return 'https://wa.me/573186428218';
    const amount = formatPrice(order.totalAmount, order.currency);
    const text = `Hola, quiero completar el pago de mi orden educativa CTG One ${order.id} por ${amount}: ${order.offeringTitle}.`;
    return `https://wa.me/573186428218?text=${encodeURIComponent(text)}`;
  }, [order]);

  async function createOrder() {
    if (!isAuthenticated || !offering || checkoutState === 'submitting') return;

    requestKeyRef.current ??= makeRequestKey();
    setCheckoutState('submitting');

    try {
      const response = await fetch('/api/education/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: offering.slug, requestKey: requestKeyRef.current }),
      });
      const payload = (await response.json().catch(() => ({}))) as CheckoutResponse;

      if (response.status === 409 && payload.error === 'EDUCATION_ALREADY_ENTITLED') {
        setCheckoutState('entitled');
        return;
      }

      if (!response.ok || !payload.ok || !payload.order) {
        setCheckoutState('error');
        return;
      }

      setOrder(payload.order);
      setCheckoutState('created');
    } catch {
      setCheckoutState('error');
    }
  }

  return (
    <section className="mx-auto max-w-[1080px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <a href="/jpvalderrama/campus#catalogo" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver al Campus
      </a>

      <div className="mt-8 grid overflow-hidden border border-[#6f0d12]/16 bg-[#fbf7f1] lg:grid-cols-[1.06fr_.94fr]">
        <div className="p-7 sm:p-10 lg:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Checkout educativo · CTG One</p>
          {catalogState === 'loading' ? (
            <h1 className="mt-4 font-serif text-4xl text-[#17110e] sm:text-5xl">Consultando la oferta…</h1>
          ) : offering ? (
            <>
              <h1 className="mt-4 font-serif text-4xl leading-tight tracking-[-.025em] text-[#17110e] sm:text-5xl">{offering.title}</h1>
              <p className="mt-5 max-w-2xl font-serif text-[17px] leading-8 text-[#665950]">{offering.summary}</p>
              <div className="mt-8 border-y border-[#6f0d12]/12 py-6">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#665950]">Total de la orden</p>
                <p className="mt-2 font-serif text-4xl text-[#6f0d12]">{formatPrice(offering.price_amount, offering.currency)}</p>
              </div>
              <a href="/jpvalderrama/talks#conferencia" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
                Ver detalles del evento <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </>
          ) : (
            <>
              <h1 className="mt-4 font-serif text-4xl text-[#17110e] sm:text-5xl">Oferta no disponible.</h1>
              <p className="mt-5 font-serif text-[17px] leading-8 text-[#665950]">Este producto no está publicado actualmente o el catálogo está sincronizándose.</p>
            </>
          )}
        </div>

        <aside className="border-t border-[#6f0d12]/12 bg-[#efe3d7] p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#6f0d12]/20 text-[#6f0d12]">
            <ReceiptText className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#6f0d12]">Orden autenticada</p>
          <h2 className="mt-3 font-serif text-3xl text-[#17110e]">Pago asistido, acceso verificado.</h2>
          <p className="mt-4 font-serif text-[16px] leading-7 text-[#665950]">CTG One crea primero una orden ligada a tu cuenta. Ningún clic, registro o soporte de pago concede contenido por sí solo: el acceso aparece en tu biblioteca únicamente después de verificar la transacción.</p>

          <div className="mt-6 space-y-4 border-t border-[#6f0d12]/12 pt-6 text-sm leading-6 text-[#564a42]">
            <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" /><span>El importe se toma del catálogo del servidor; el navegador no puede modificar el precio.</span></div>
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6f0d12]" aria-hidden="true" /><span>La orden usa una clave idempotente para evitar duplicados por reintentos.</span></div>
          </div>

          {!isLoading && !isAuthenticated ? (
            <a href={loginHref} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">
              Iniciar sesión para continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}

          {isAuthenticated && offering && checkoutState !== 'created' && checkoutState !== 'entitled' ? (
            <button type="button" onClick={createOrder} disabled={checkoutState === 'submitting'} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2] disabled:cursor-wait disabled:opacity-70">
              {checkoutState === 'submitting' ? 'Creando orden…' : 'Crear orden de pago'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}

          {checkoutState === 'created' && order ? (
            <div className="mt-8 border border-[#6f0d12]/18 bg-[#fffaf2] p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#6f0d12]" aria-hidden="true" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#6f0d12]">Orden creada · pago pendiente</p>
                  <p className="mt-2 break-all font-mono text-xs text-[#564a42]">{order.id}</p>
                </div>
              </div>
              <p className="mt-5 font-serif text-[15px] leading-7 text-[#665950]">Continúa por WhatsApp para coordinar y confirmar el medio de pago. Conserva el identificador de la orden; será la referencia operativa para validar el acceso.</p>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#6f0d12] px-6 text-xs font-bold uppercase tracking-[.13em] text-[#fffaf2]">
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> Continuar por WhatsApp
              </a>
              <a href="/dashboard/educacion" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">
                Ver mis órdenes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          ) : null}

          {checkoutState === 'entitled' ? (
            <div className="mt-8 border border-[#6f0d12]/18 bg-[#fffaf2] p-6">
              <p className="font-serif text-lg text-[#17110e]">Esta oferta ya está activa en tu cuenta.</p>
              <a href="/dashboard/educacion" className="mt-4 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6f0d12]">Abrir mi biblioteca <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
            </div>
          ) : null}

          {checkoutState === 'error' ? (
            <p role="alert" className="mt-5 text-sm leading-6 text-[#6f0d12]">No fue posible crear la orden. Intenta nuevamente; ningún cobro ni acceso fue generado.</p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
