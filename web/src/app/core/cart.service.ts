import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';

export type CartItem = {
  itemId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  lineTotal: number;
};

export type CartResponse = {
  items: CartItem[];
  total: number;
};

export type CheckoutResponse = {
  ok: true;
  orderId: number;
  total: number;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getCart() {
    return this.http.get<CartResponse>(`${this.apiBaseUrl}/cart`);
  }

  addItem(itemId: number, quantity: number) {
    return this.http.post<{ ok: true }>(`${this.apiBaseUrl}/cart`, { itemId, quantity });
  }

  updateQuantity(itemId: number, quantity: number) {
    return this.http.patch<{ ok: true }>(`${this.apiBaseUrl}/cart/${itemId}`, { quantity });
  }

  removeItem(itemId: number) {
    return this.http.delete<{ ok: true }>(`${this.apiBaseUrl}/cart/${itemId}`);
  }

  clearCart() {
    return this.http.delete<{ ok: true }>(`${this.apiBaseUrl}/cart`);
  }

  checkout() {
    return this.http.post<CheckoutResponse>(`${this.apiBaseUrl}/checkout`, {});
  }
}
