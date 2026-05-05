import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type OrderPayment = {
  paymentId: number;
  amount: number;
  method: string | null;
  transactionId: string | null;
  status: string | null;
  paymentDate: string | null;
};

export type Order = {
  orderId: number;
  orderDate: string;
  tripId: number | null;
  delivery: {
    branchName: string | null;
    deliveryDate: string | null;
    deliveryTime: string | null;
    distanceKm: number | null;
    estimatedTimeHours: number | null;
  } | null;
  total: number;
  status: string;
  payment: OrderPayment | null;
};

export type OrdersResponse = {
  orders: Order[];
};

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list() {
    return this.http.get<OrdersResponse>(`${this.apiBaseUrl}/orders`);
  }
}
