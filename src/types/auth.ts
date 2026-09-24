export interface AuthUser {
  id?: string;
  name: string;
  email?: string;
  username: string;
  role: string;
  state?: string;
}

export interface AuthSession {
  success: boolean;
  token: string;
  user: AuthUser;
  message?: string;
  expiresAt?: number;
}
