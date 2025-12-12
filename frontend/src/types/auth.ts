import { MenuItemDTO } from './menu';

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  role?: string;
  points?:number | string 
  company?: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  permission_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  menu: MenuItemDTO[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  permissions?: string[];
  menu?: MenuItemDTO[];
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}