import { getNvetApiUrl } from './session';
import { fetchNvetCurrentUser, type NvetCurrentUser } from './user';

export type NvetPetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'FISH' | 'OTHER';

export interface NvetPet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  weight?: number | null;
  birthDate?: string | null;
  notes?: string | null;
}

export interface CreateNvetPetInput {
  name: string;
  species: NvetPetSpecies;
  breed?: string;
  weight?: number;
  birthDate?: string;
  notes?: string;
}

export interface NvetVetPrice {
  id: string;
  serviceName: string;
  priceCop: number;
  priceCtg?: number | null;
  isActive?: boolean;
}

export interface NvetVetSearchItem {
  id: string;
  city?: string | null;
  bio?: string | null;
  rating?: number | null;
  yearsExperience?: number | null;
  specialties?: string[];
  isAvailableNow?: boolean;
  distance?: number | null;
  totalReviews?: number;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
  prices?: NvetVetPrice[];
}

export interface NvetVetSearchResponse {
  results: NvetVetSearchItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface NvetAvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
}

export interface CreateNvetAppointmentInput {
  vetId: string;
  petId: string;
  priceId: string;
  date: string;
  time: string;
  address: string;
  notes?: string;
}

export interface NvetCreatedAppointment {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  address: string;
  amount: number;
  paymentMethod: 'TRANSFER';
  status: string;
}

type NvetResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

function backendMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback;
  const message = (value as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const joined = message.filter((item): item is string => typeof item === 'string').join('. ');
    if (joined) return joined;
  }
  return fallback;
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function requireNvetClient(accessToken: string): Promise<NvetResult<NvetCurrentUser>> {
  const currentUser = await fetchNvetCurrentUser(accessToken);
  if (!currentUser.ok) {
    return {
      ok: false,
      status: currentUser.status,
      message: currentUser.status === 401 ? 'No autenticado' : 'No se pudo validar la sesión de Nvet Care',
    };
  }
  if (currentUser.user.role !== 'CLIENT') {
    return { ok: false, status: 403, message: 'Esta operación está disponible únicamente para clientes' };
  }
  return { ok: true, data: currentUser.user };
}

export async function fetchNvetPets(accessToken: string): Promise<NvetResult<NvetPet[]>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/pets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron obtener las mascotas') };
    }
    if (!Array.isArray(data)) {
      return { ok: false, status: 502, message: 'El servicio de mascotas devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetPet[] };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de mascotas' };
  }
}

export async function createNvetPet(
  accessToken: string,
  input: CreateNvetPetInput,
): Promise<NvetResult<NvetPet>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/pets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo crear la mascota') };
    }
    return { ok: true, data: data as NvetPet };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de mascotas' };
  }
}

export async function searchNvetVets(searchParams: URLSearchParams): Promise<NvetResult<NvetVetSearchResponse>> {
  const allowed = new URLSearchParams();
  for (const key of ['search', 'city', 'specialty', 'minRating', 'availableNow', 'availableDate', 'limit', 'offset', 'sortBy']) {
    const value = searchParams.get(key);
    if (value !== null && value.trim() !== '') allowed.set(key, value);
  }
  if (!allowed.has('limit')) allowed.set('limit', '20');

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/vets?${allowed.toString()}`, { cache: 'no-store' });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron obtener los veterinarios') };
    }
    if (!data || typeof data !== 'object' || !Array.isArray((data as NvetVetSearchResponse).results)) {
      return { ok: false, status: 502, message: 'El servicio de veterinarios devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetVetSearchResponse };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de veterinarios' };
  }
}

export async function fetchNvetVetPrices(vetId: string): Promise<NvetResult<NvetVetPrice[]>> {
  try {
    const response = await fetch(`${getNvetApiUrl()}/api/vets/${encodeURIComponent(vetId)}/prices`, {
      cache: 'no-store',
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudieron obtener los servicios del veterinario') };
    }
    if (!Array.isArray(data)) {
      return { ok: false, status: 502, message: 'El servicio de precios devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetVetPrice[] };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de precios' };
  }
}

export async function fetchNvetVetSchedule(
  vetId: string,
  date: string,
): Promise<NvetResult<NvetAvailabilitySlot[]>> {
  try {
    const response = await fetch(
      `${getNvetApiUrl()}/api/vets/${encodeURIComponent(vetId)}/schedule?date=${encodeURIComponent(date)}`,
      { cache: 'no-store' },
    );
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo obtener la disponibilidad') };
    }
    if (!Array.isArray(data)) {
      return { ok: false, status: 502, message: 'El servicio de agenda devolvió una respuesta inválida' };
    }
    return { ok: true, data: data as NvetAvailabilitySlot[] };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de agenda' };
  }
}

export async function createNvetClientAppointment(
  accessToken: string,
  input: CreateNvetAppointmentInput,
): Promise<NvetResult<NvetCreatedAppointment>> {
  const pricesResult = await fetchNvetVetPrices(input.vetId);
  if (!pricesResult.ok) return pricesResult;

  const officialPrice = pricesResult.data.find(
    (price) => price.id === input.priceId && price.isActive !== false && Number.isFinite(price.priceCop),
  );
  if (!officialPrice) {
    return { ok: false, status: 400, message: 'El servicio seleccionado ya no está disponible' };
  }

  // Financial integrity boundary: the browser never supplies the chargeable
  // amount or service label. Both are re-read from the vet's current public
  // price catalog immediately before the booking is forwarded to NestJS.
  const payload = {
    vetId: input.vetId,
    petId: input.petId,
    serviceType: officialPrice.serviceName,
    date: input.date,
    time: input.time,
    address: input.address,
    amount: officialPrice.priceCop,
    paymentMethod: 'TRANSFER' as const,
    notes: input.notes || undefined,
  };

  try {
    const response = await fetch(`${getNvetApiUrl()}/api/appointments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
      return { ok: false, status: response.status, message: backendMessage(data, 'No se pudo crear la cita') };
    }
    return { ok: true, data: data as NvetCreatedAppointment };
  } catch {
    return { ok: false, status: 502, message: 'No se pudo contactar el servicio de citas' };
  }
}
