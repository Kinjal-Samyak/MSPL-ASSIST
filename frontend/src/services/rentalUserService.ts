export interface RentalUserResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
}

interface GetAllUsersRequest {
  name: string | null;
  phonenumber?: string;
  roleid: null;
  hubid: null;
  userstatus: null;
  kycstatus: null;
  registrationdate: null;
  reporttype: 'user';
  pageNumber: number;
  pageSize: number;
}

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

function readItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload == null || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    const nestedItems = nested.items ?? nested.Items;
    if (Array.isArray(nestedItems)) {
      return nestedItems;
    }
  }

  const items = record.items ?? record.Items;
  return Array.isArray(items) ? items : [];
}

function toRentalUser(item: unknown, index: number): RentalUserResult | null {
  if (item == null || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const name = readString(record, ['name', 'customerName', 'userName']);
  const phone = readString(record, ['phonenumber', 'phoneNumber', 'mobileNumber', 'mobile']);
  const email = readString(record, ['emailid', 'email']);
  const role = readString(record, ['rolename', 'role']);
  if (!name && !phone) {
    return null;
  }
  const id = readString(record, ['userid', 'userId', 'id']) || `${name}-${phone}-${index}`;
  return { id, name, phone, email, role };
}

export function rentalRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = authToken();
  if (token) {
    headers.Authorization = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  }
  return headers;
}

function authToken(): string {
  const configured = import.meta.env.VITE_RENTAL_USERS_API_TOKEN;
  if (typeof configured === 'string' && configured.trim()) {
    return configured.trim();
  }
  try {
    return localStorage.getItem('motovolt_auth_token')?.trim() ?? '';
  } catch {
    return '';
  }
}

function looksLikePhone(value: string): boolean {
  const compact = value.replace(/[\s()-]/g, '');
  return compact.length >= 4 && /^[+\d*]+$/.test(compact);
}

function userByIdUrl(listUrl: string, userId: string): string {
  const url = new URL(listUrl);
  url.pathname = url.pathname.replace(/\/GetAllUsers\/?$/i, '/GetUserByUserId');
  url.search = '';
  url.searchParams.set('userid', userId);
  return url.toString();
}

async function revealPhone(
  listUrl: string,
  user: RentalUserResult,
  headers: Record<string, string>
): Promise<RentalUserResult> {
  if (!user.phone.includes('*') || !/^\d+$/.test(user.id)) {
    return user;
  }

  try {
    const response = await fetch(userByIdUrl(listUrl, user.id), { headers });
    if (!response.ok) {
      return user;
    }
    const payload = (await response.json()) as { data?: unknown };
    const data = payload?.data != null && typeof payload.data === 'object' ? payload.data : payload;
    const phone = readString(data as Record<string, unknown>, [
      'phonenumber',
      'phoneNumber',
      'mobileNumber',
      'mobile',
    ]);
    if (phone && !phone.includes('*')) {
      return { ...user, phone };
    }
  } catch {
    return user;
  }

  return user;
}

function usersFromPayload(payload: unknown): RentalUserResult[] {
  if (
    payload != null &&
    typeof payload === 'object' &&
    (payload as { isSuccess?: boolean }).isSuccess === false
  ) {
    const message = (payload as { message?: unknown }).message;
    throw new Error(
      typeof message === 'string' && message.trim() ? message : 'User search failed.'
    );
  }

  const listed = readItems(payload)
    .map((item, index) => toRentalUser(item, index))
    .filter((item): item is RentalUserResult => item != null);
  if (listed.length > 0) {
    return listed;
  }

  const record =
    payload != null && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const data = record?.data;
  const single = toRentalUser(
    data != null && typeof data === 'object' && !Array.isArray(data) ? data : payload,
    0
  );
  return single ? [single] : [];
}

async function requestUsers(url: string, init: RequestInit): Promise<RentalUserResult[]> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.trim() || 'User search failed.');
  }
  return usersFromPayload(await response.json());
}

export async function searchRentalUsers(query: string): Promise<RentalUserResult[]> {
  const url = import.meta.env.VITE_RENTAL_GET_ALL_USERS_URL;
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Rental user search is not configured.');
  }

  const trimmed = query.trim();
  const headers = { ...rentalRequestHeaders(), 'Content-Type': 'application/json' };

  const listUrl = url.trim();
  const byPhone = looksLikePhone(trimmed);
  const body: GetAllUsersRequest = {
    name: byPhone ? null : trimmed || null,
    roleid: null,
    hubid: null,
    userstatus: null,
    kycstatus: null,
    registrationdate: null,
    reporttype: 'user',
    pageNumber: 1,
    pageSize: 20,
  };
  if (byPhone) {
    body.phonenumber = trimmed.replace(/[^\d*]/g, '');
  }
  const users = await requestUsers(listUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  return Promise.all(users.map((user) => revealPhone(listUrl, user, headers)));
}
