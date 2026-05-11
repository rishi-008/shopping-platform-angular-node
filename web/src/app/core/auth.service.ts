import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import type { Observable } from 'rxjs';

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

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private refreshRequest$: Observable<RefreshResponse> | null = null;

  readonly accessToken = signal<string | null>(localStorage.getItem('accessToken'));
  readonly refreshToken = signal<string | null>(localStorage.getItem('refreshToken'));
  readonly userType = signal<UserType | null>(this.readStoredUserType());

  private readStoredUserType(): UserType | null {
    const raw = localStorage.getItem('userType');
    return raw === 'admin' || raw === 'user' ? raw : null;
  }

  private decodeUserTypeFromAccessToken(token: string): UserType | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const data = JSON.parse(json) as { user_type?: unknown };
      return data.user_type === 'admin' || data.user_type === 'user' ? data.user_type : null;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return Boolean(this.accessToken() && this.refreshToken());
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, password });
  }

  refreshTokens(): Observable<RefreshResponse> {
    const rt = this.refreshToken();
    if (!rt) {
      // No refresh token means we can't recover a session.
      throw new Error('No refresh token');
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<RefreshResponse>(`${this.apiBaseUrl}/auth/refresh`, { refreshToken: rt })
        .pipe(
          tap((res) => this.setTokens(res.accessToken, res.refreshToken)),
          finalize(() => {
            this.refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    return this.refreshRequest$;
  }

  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    this.accessToken.set(accessToken);
    this.refreshToken.set(refreshToken);

    const ut = this.decodeUserTypeFromAccessToken(accessToken);
    if (ut) {
      localStorage.setItem('userType', ut);
      this.userType.set(ut);
    } else {
      localStorage.removeItem('userType');
      this.userType.set(null);
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userType');
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.userType.set(null);
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && this.userType() === 'admin';
  }
}
