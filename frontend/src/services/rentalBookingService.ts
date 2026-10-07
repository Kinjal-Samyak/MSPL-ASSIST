import type { CustomerVehicleResponse } from '@/services/customerService';
import { rentalRequestHeaders } from '@/services/rentalUserService';

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function bookingsRequestUrl(userId: string): string {
  const configured = import.meta.env.VITE_RENTAL_GET_BOOKINGS_BY_USER_URL;
  if (typeof configured !== 'string' || !configured.trim()) {
    throw new Error('Rental booking search is not configured.');
  }

  const target = new URL(`${configured.trim().replace(/\/$/, '')}/${encodeURIComponent(userId)}`);
  const isLocalBookingHost = target.hostname === 'localhost' || target.hostname === '127.0.0.1';
  if (
    typeof window !== 'undefined' &&
    window.location.port === '5173' &&
    isLocalBookingHost &&
    target.port === '5158'
  ) {
    return `${window.location.origin}/rental-booking${target.pathname}${target.search}`;
  }
  return target.toString();
}

function readModelList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload != null && typeof payload === 'object') {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data;
    }
  }
  return [];
}

async function vehicleModelNames(): Promise<Map<string, string>> {
  const configured = import.meta.env.VITE_RENTAL_VEHICLE_MODELS_URL;
  if (typeof configured !== 'string' || !configured.trim()) {
    return new Map();
  }

  try {
    const response = await fetch(configured.trim(), { headers: rentalRequestHeaders() });
    if (!response.ok) {
      return new Map();
    }
    const names = new Map<string, string>();
    for (const item of readModelList(await response.json())) {
      if (item == null || typeof item !== 'object') {
        continue;
      }
      const record = item as Record<string, unknown>;
      const code = readString(record, ['codevalue']);
      const name = readString(record, ['codedisplayname']);
      if (code && name) {
        names.set(code, name);
      }
    }
    return names;
  } catch {
    return new Map();
  }
}

function toVehicle(
  item: Record<string, unknown>,
  modelNames: Map<string, string>
): CustomerVehicleResponse | null {
  const bookingId = readString(item, ['bookingmasterid']);
  const vehicleName = readString(item, ['vehiclename']);
  const vehicleNumber = readString(item, ['vehiclenum']);
  const plan = item.bookingPlanModel;
  const planRecord =
    plan != null && typeof plan === 'object' ? (plan as Record<string, unknown>) : null;
  const planName =
    readString(item, ['planname']) || (planRecord ? readString(planRecord, ['planname']) : '');
  const planStart = planRecord ? readString(planRecord, ['planstartdate']) : '';
  const modelId = readString(item, ['vehiclemodelid']);
  const modelName = modelNames.get(modelId) || '';
  if (!bookingId && !vehicleName && !vehicleNumber && !modelName) {
    return null;
  }

  return {
    vehicleNumber: vehicleNumber || `booking-${bookingId || vehicleName || modelId}`,
    vehicleModel: modelName,
    batteryNumber: vehicleNumber,
    hub: readString(item, ['hubname']),
    deploymentDate: planStart || readString(item, ['createdon']),
    rentalStatus: readString(item, ['tripstatus']),
    planName,
    contactName: readString(item, ['name']),
    contactPhone: readString(item, ['phonenumber']),
    vehicleName,
    bookingId,
  };
}

export async function getBookingsByUserId(userId: string): Promise<CustomerVehicleResponse[]> {
  const trimmedId = userId.trim();
  if (!trimmedId) {
    return [];
  }

  let response: Response;
  try {
    response = await fetch(bookingsRequestUrl(trimmedId), {
      method: 'POST',
      headers: { ...rentalRequestHeaders(), 'Content-Type': 'application/json' },
    });
  } catch {
    throw new Error('Booking service is not reachable. Start it on port 5158 and try again.');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.trim() || 'Could not load bookings.');
  }

  const payload = (await response.json()) as {
    isSuccess?: boolean;
    message?: unknown;
    data?: unknown;
  };
  if (payload.isSuccess === false) {
    const message = payload.message;
    throw new Error(
      typeof message === 'string' && message.trim() ? message : 'Could not load bookings.'
    );
  }

  const items = Array.isArray(payload.data) ? payload.data : [];
  const modelNames = await vehicleModelNames();
  return items
    .map((item) =>
      item != null && typeof item === 'object'
        ? toVehicle(item as Record<string, unknown>, modelNames)
        : null
    )
    .filter((item): item is CustomerVehicleResponse => item != null);
}
