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
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.accessToken.set(null);
    this.refreshToken.set(null);
  }
}
