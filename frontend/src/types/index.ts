// ── Auth ────────────────────────────────────────────────────────────────────

export type Role = "SUPER_ADMIN" | "COMPANY_ADMIN";

export interface JWTPayload {
  user_id: string;
  company_id: string | null;
  role: Role;
  name: string;
  exp: number;
}

export interface AuthUser {
  user_id: string;
  company_id: string | null;
  role: Role;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

// ── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  pix_key: string | null;
  active: boolean;
  created_at: string;
}

export interface CreateCompanyPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

// ── Service (tabela de preços) ────────────────────────────────────────────────

export interface Service {
  id: string;
  company_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
}

// ── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  created_at: string;
}

// ── Appointment ───────────────────────────────────────────────────────────────

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "done";

export interface Appointment {
  id: string;
  company_id: string;
  client: Client;
  service: Service;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
}

// ── Payment ───────────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "confirmed" | "failed";

export interface Payment {
  id: string;
  company_id: string;
  appointment_id: string;
  amount: number;
  pix_key: string;
  status: PaymentStatus;
  created_at: string;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface CompanyMetrics {
  revenue_today: number;
  revenue_month: number;
  appointments_today: number;
  appointments_month: number;
  pending_payments: number;
  new_clients_month: number;
  top_service: string | null;
}

export interface AdminMetrics {
  active_companies: number;
  platform_revenue: number;
  messages_processed: number;
  top_company: string | null;
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

export type WhatsAppStatus = "connected" | "disconnected" | "qr_pending";

export interface WhatsAppConnection {
  status: WhatsAppStatus;
  qr_code: string | null;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}