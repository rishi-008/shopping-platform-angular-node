import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type Branch = {
  branchId: number;
  name: string;
  address: string;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type BranchesResponse = {
  branches: Branch[];
};

@Injectable({ providedIn: 'root' })
export class BranchesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list() {
    return this.http.get<BranchesResponse>(`${this.apiBaseUrl}/branches`);
  }
}
