import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type UserType = 'user' | 'admin';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  userType: UserType;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  readonly accessToken = signal<string | null>(localStorage.getItem('accessToken'));
  readonly refreshToken = signal<string | null>(localStorage.getItem('refreshToken'));

  isLoggedIn(): boolean {
    return Boolean(this.accessToken());
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, password });
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.accessToken.set(accessToken);
    this.refreshToken.set(refreshToken);
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken.set(null);
    this.refreshToken.set(null);
  }
}
