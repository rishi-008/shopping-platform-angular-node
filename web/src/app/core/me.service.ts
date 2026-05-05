import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type MeResponse = {
  user: {
    id: number;
    email: string;
    name: string;
    address: string;
  };
};

@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getMe() {
    return this.http.get<MeResponse>(`${this.apiBaseUrl}/me`);
  }
}
