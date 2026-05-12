import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type PresignResponse = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
};

@Injectable({ providedIn: 'root' })
export class UploadsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  presignImageUpload(filename: string, contentType: string) {
    return this.http.post<PresignResponse>(`${this.apiBaseUrl}/admin/uploads/presign`, { filename, contentType });
  }
}
