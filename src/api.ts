// Typed API Client for ParkFlow

export interface SystemStatus {
  status: string;
  engine: string;
  host: string;
  database: string;
  user: string;
  total_slots: number;
  total_customers: number;
  total_vehicles: number;
  strict_rules_enforced: string[];
}

export interface DashboardData {
  total_slots: number;
  occupied: number;
  reserved: number;
  available: number;
  occupancy_rate: number;
  active_sessions: Array<{
    id: number;
    vehicle_id: number;
    slot_id: number;
    entry_time: string;
    exit_time: string | null;
    duration_hours: number;
    hourly_rate: number;
    total_amount: number;
    amount_paid: number;
    payment_status: 'unpaid' | 'partially_paid' | 'paid';
    has_active_pass: boolean;
    license_plate: string;
    vehicle_type: string;
    brand_model: string;
    slot_number: string;
    floor: string;
    customer_name: string;
  }>;
  floor_breakdown: Record<string, { total: number; occupied: number }>;
  recent_payments: any[];
}

export interface Slot {
  id: number;
  slot_number: string;
  floor: string;
  slot_type: 'two_wheeler' | 'four_wheeler' | 'heavy_vehicle' | 'ev';
  hourly_rate: number;
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  created_at: string;
  vehicle_count?: number;
  vehicles?: Vehicle[];
}

export interface Vehicle {
  id: number;
  customer_id: number;
  license_plate: string;
  vehicle_type: 'two_wheeler' | 'four_wheeler' | 'heavy_vehicle' | 'ev';
  brand_model: string;
  created_at: string;
  customer_name?: string;
}

export interface Pass {
  id: number;
  customer_id: number;
  vehicle_id: number;
  pass_type: 'daily' | 'weekly' | 'monthly' | 'vip';
  price: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  license_plate?: string;
  vehicle_type?: string;
}

export interface PaymentRecord {
  id: number;
  session_id: number;
  amount: number;
  payment_method: 'cash' | 'card' | 'upi';
  payment_time: string;
  receipt_number: string;
  license_plate?: string;
  slot_number?: string;
  entry_time?: string;
  exit_time?: string;
  duration_hours?: number;
  total_amount?: number;
}

export interface ReportsData {
  occupancy: {
    total: number;
    occupied: number;
    rate: string | number;
    by_type: Record<string, { total: number; occupied: number }>;
  };
  duration: {
    average_hours: string;
    total_completed_sessions: number;
    buckets: Record<string, number>;
  };
  revenue: {
    total: number;
    hourly_parking: number;
    passes: number;
    by_method: Record<string, number>;
  };
}

export interface TestCaseResult {
  id: number;
  scenario: string;
  requirement: string;
  type: 'positive' | 'negative';
  expected: string;
  actual: string;
  passed: boolean;
  sqlStatement: string;
}

export interface TestSuiteResponse {
  timestamp: string;
  total_tests: number;
  passed_tests: number;
  all_passed: boolean;
  tests: TestCaseResult[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Server request failed');
  }
  return data;
}

export const api = {
  getStatus: () => request<SystemStatus>('/api/status'),
  getDashboard: () => request<DashboardData>('/api/dashboard'),
  getSlots: (params?: { type?: string; floor?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<Slot[]>(`/api/slots${query ? `?${query}` : ''}`);
  },
  reserveSlot: (body: { customer_id: number; vehicle_id: number; slot_id: number; start_time: string; end_time: string }) =>
    request<{ message: string; reservation: any }>('/api/slots/reserve', { method: 'POST', body: JSON.stringify(body) }),
  recordEntry: (body: { license_plate: string; slot_id: number }) =>
    request<{ message: string; session: any; hasActivePass: boolean }>('/api/sessions/entry', { method: 'POST', body: JSON.stringify(body) }),
  recordExit: (body: { session_id: number }) =>
    request<{ message: string; session: any; vehicle: any; slot: any }>('/api/sessions/exit', { method: 'POST', body: JSON.stringify(body) }),
  getPasses: () => request<Pass[]>('/api/passes'),
  createPass: (body: { customer_id: number; vehicle_id: number; pass_type: string; price: number; start_date: string; end_date: string }) =>
    request<{ message: string; pass: Pass }>('/api/passes', { method: 'POST', body: JSON.stringify(body) }),
  getPayments: () => request<PaymentRecord[]>('/api/payments'),
  recordPayment: (body: { session_id: number; amount: number; payment_method: string }) =>
    request<{ message: string; payment: PaymentRecord; session: any; remainingBalance: number }>('/api/payments', { method: 'POST', body: JSON.stringify(body) }),
  getCustomers: () => request<Customer[]>('/api/customers'),
  createCustomer: (body: { name: string; phone: string; email: string }) =>
    request<{ message: string; customer: Customer }>('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id: number, body: { name: string; phone: string; email: string }) =>
    request<{ message: string; customer: Customer }>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id: number) =>
    request<{ message: string }>(`/api/customers/${id}`, { method: 'DELETE' }),
  getVehicles: () => request<Vehicle[]>('/api/vehicles'),
  createVehicle: (body: { customer_id: number; license_plate: string; vehicle_type: string; brand_model: string }) =>
    request<{ message: string; vehicle: Vehicle }>('/api/vehicles', { method: 'POST', body: JSON.stringify(body) }),
  deleteVehicle: (id: number) =>
    request<{ message: string }>(`/api/vehicles/${id}`, { method: 'DELETE' }),
  getReports: () => request<ReportsData>('/api/reports'),
  runTestSuite: () => request<TestSuiteResponse>('/api/test-suite/run', { method: 'POST' }),
};
