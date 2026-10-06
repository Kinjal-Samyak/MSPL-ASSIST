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

function toVehicle(item: Record<string, unknown>): CustomerVehicleResponse | null {
  const bookingId = readString(item, ['bookingmasterid', 'bookinguid']);
  const vehicleName = readString(item, ['vehiclename']);
  const vehicleNumber = readString(item, ['vehiclenum', 'registrationnumber']);
  const plan = item.bookingPlanModel;
  const planRecord =
    plan != null && typeof plan === 'object' ? (plan as Record<string, unknown>) : null;
  const planName =
    readString(item, ['planname']) || (planRecord ? readString(planRecord, ['planname']) : '');
  const planStart = planRecord ? readString(planRecord, ['planstartdate']) : '';
  if (!bookingId && !vehicleName && !vehicleNumber) {
    return null;
  }

  return {
    vehicleNumber: vehicleNumber || `booking-${bookingId || vehicleName}`,
    vehicleModel: vehicleName,
    batteryNumber: vehicleNumber,
    hub: readString(item, ['hubname']),
    deploymentDate: planStart || readString(item, ['createdon']),
    rentalStatus: readString(item, ['tripstatus']),
    planName,
    contactName: readString(item, ['name']),
    contactPhone: readString(item, ['phonenumber']),
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
  return items
    .map((item) =>
      item != null && typeof item === 'object' ? toVehicle(item as Record<string, unknown>) : null
    )
    .filter((item): item is CustomerVehicleResponse => item != null);
}
