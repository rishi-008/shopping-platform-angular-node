import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type CreatePaymentIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
};

@Injectable({ providedIn: 'root' })
export class StripePaymentsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  createPaymentIntent() {
    return this.http.post<CreatePaymentIntentResponse>(`${this.apiBaseUrl}/stripe/payment-intent`, {});
  }
}
