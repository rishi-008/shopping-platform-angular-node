import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type CreatePaymentIntentResponse = {
  url: string;
  sessionId: string;
};

export type FinalizeCheckoutSessionResponse = {
  paymentIntentId: string;
};

@Injectable({ providedIn: 'root' })
export class StripePaymentsService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  createCheckoutSession() {
    return this.http.post<CreatePaymentIntentResponse>(`${this.apiBaseUrl}/stripe/checkout-session`, {});
  }

  finalizeCheckoutSession(sessionId: string, delivery: unknown) {
    return this.http.post<FinalizeCheckoutSessionResponse>(`${this.apiBaseUrl}/stripe/checkout-session/finalize`, {
      sessionId,
      delivery
    });
  }
}
