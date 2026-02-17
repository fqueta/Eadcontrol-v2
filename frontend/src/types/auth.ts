import { MenuItemDTO } from './menu';

export interface User {
  id: string;
  name: string;
  email: string;
  email_verified_at?: string;
  avatar?: string;
  avatar_url?: string;
  phone?: string;
  celular?: string;
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
  force_password_change?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  permissions: string[];
  menu: MenuItemDTO[];
  isLoading: boolean;
  isAuthenticated: boolean;
  forcePasswordChange?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
  /**
   * captcha_token
   * pt-BR: Token do reCAPTCHA v3 gerado no cliente.
   * en-US: reCAPTCHA v3 token generated on the client.
   */
  captcha_token?: string;
  /**
   * captcha_action
   * pt-BR: Ação associada ao token (ex.: 'login').
   * en-US: Action associated with the token (e.g., 'login').
   */
  captcha_action?: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  /**
   * captcha_token
   * pt-BR: Token do reCAPTCHA v3 gerado no cliente.
   * en-US: reCAPTCHA v3 token generated on the client.
   */
  captcha_token?: string;
  /**
   * captcha_action
   * pt-BR: Ação associada ao token (ex.: 'register').
   * en-US: Action associated with the token (e.g., 'register').
   */
  captcha_action?: string;
}

export interface ForgotPasswordData {
  email: string;
  /**
   * captcha_token
   * pt-BR: Token do reCAPTCHA v3 gerado no cliente.
   * en-US: reCAPTCHA v3 token generated on the client.
   */
  captcha_token?: string;
  /**
   * captcha_action
   * pt-BR: Ação associada ao token (ex.: 'forgot_password').
   * en-US: Action associated with the token (e.g., 'forgot_password').
   */
  captcha_action?: string;
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
  force_password_change?: boolean;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}