import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type Item = {
  Item_Id: number;
  Item_name: string;
  Price: string | number;
  Made_in: string | null;
  Department_Code: string;
  Image_URL: string | null;
};

export type ItemsResponse = {
  items: Item[];
};

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list(department?: string) {
    const params = department ? { department } : undefined;
    return this.http.get<ItemsResponse>(`${this.apiBaseUrl}/items`, { params });
  }
}
