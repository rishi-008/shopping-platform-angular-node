import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';

import { CartService, type CartItem } from '../core/cart.service';
import { DeliveryService } from '../core/delivery.service';
import { StripePaymentsService } from '../core/stripe-payments.service';
import { API_BASE_URL } from '../core/api-base-url';

type PublicConfig = {
  stripePublishableKey?: string;
  stripeEnabled?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [RouterLink],
  template: `
    <h2>Checkout</h2>

    <div class="row">
      <a routerLink="/cart">Back to cart</a>
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @if (orderId()) {
      <p>Order placed! Order ID: {{ orderId() }}</p>
      <p>Trip ID: {{ tripId() }}</p>
      <p>Total paid: {{ placedTotal() }}</p>
      <a routerLink="/items">Continue shopping</a>
    } @else if (items().length === 0) {
      <p>Your cart is empty.</p>
      <a routerLink="/items">Go to items</a>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.itemId) {
            <tr>
              <td>{{ item.name }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ item.lineTotal }}</td>
            </tr>
          }
        </tbody>
      </table>

      <p class="total">Total: {{ total() }}</p>

      @if (stripeEnabled()) {
        <button (click)="goToStripeCheckout()" [disabled]="isPlacing()">
          {{ isPlacing() ? 'Redirecting…' : 'Pay with Stripe Checkout (test)' }}
        </button>
      } @else {
        <button (click)="placeOrder()" [disabled]="isPlacing()">
          {{ isPlacing() ? 'Placing order…' : 'Place order' }}
        </button>
      }
    }
  `
})
export class CheckoutPage {
  private readonly cartService = inject(CartService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly stripePayments = inject(StripePaymentsService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  readonly items = signal<CartItem[]>([]);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);
  readonly isPlacing = signal(false);
  readonly orderId = signal<number | null>(null);
  readonly placedTotal = signal<number | null>(null);
  readonly tripId = signal<number | null>(null);

  readonly stripeEnabled = signal(false);

  constructor() {
    this.refresh();
    this.loadStripeConfig();

    // If Stripe redirected back with a session_id, finalize by placing the order with that payment.
    const params = new URLSearchParams(window.location.search);
    const stripeResult = (params.get('stripe') || '').toLowerCase();
    const sessionId = params.get('session_id');
    if (stripeResult === 'success' && sessionId) {
      void this.finalizeStripeCheckout(sessionId);
    }
  }

  private loadStripeConfig() {
    this.http.get<PublicConfig>(`${this.apiBaseUrl}/public-config`).subscribe({
      next: (cfg) => {
        this.stripeEnabled.set(Boolean(cfg.stripeEnabled));
      },
      error: () => {
        this.stripeEnabled.set(false);
      }
    });
  }

  refresh() {
    this.error.set(null);

    this.cartService.getCart().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.total.set(res.total);
      },
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load cart')
    });
  }

  placeOrder() {
    this.error.set(null);

    const delivery = this.deliveryService.getPlan();
    if (!delivery) {
      this.router.navigateByUrl('/delivery');
      return;
    }

    this.isPlacing.set(true);

    this.cartService
      .checkout(delivery)
      .pipe(finalize(() => this.isPlacing.set(false)))
      .subscribe({
      next: (res) => {
        this.orderId.set(res.orderId);
        this.placedTotal.set(res.total);
        this.tripId.set(res.tripId);
        this.deliveryService.clearPlan();
        this.items.set([]);
        this.total.set(0);
      },
      error: (err) => {
        if (err?.status === 401) {
          this.router.navigateByUrl('/login');
          return;
        }

        if (err?.status === 409) {
          this.router.navigateByUrl('/no-trucks', {
            state: {
              message: err?.error?.error || 'No available trucks for your selected time.',
              nextAvailable: err?.error?.nextAvailable ?? null
            }
          });
          return;
        }
        this.error.set(err?.error?.error || err?.message || 'Checkout failed');
      }
    });
  }

  async goToStripeCheckout() {
    this.error.set(null);

    const delivery = this.deliveryService.getPlan();
    if (!delivery) {
      this.router.navigateByUrl('/delivery');
      return;
    }

    this.isPlacing.set(true);
    try {
      const session = await firstValueFrom(this.stripePayments.createCheckoutSession());
      window.location.href = session.url;
    } catch (err: any) {
      if (err?.status === 401) {
        this.router.navigateByUrl('/login');
        return;
      }

      this.error.set(err?.error?.error || err?.message || 'Checkout failed');
    } finally {
      this.isPlacing.set(false);
    }
  }

  private async finalizeStripeCheckout(sessionId: string) {
    const delivery = this.deliveryService.getPlan();
    if (!delivery) {
      this.router.navigateByUrl('/delivery');
      return;
    }

    this.isPlacing.set(true);
    try {
      const finalized = await firstValueFrom(this.stripePayments.finalizeCheckoutSession(sessionId, delivery));
      const res = await firstValueFrom(this.cartService.checkout(delivery, finalized.paymentIntentId));

      this.orderId.set(res.orderId);
      this.placedTotal.set(res.total);
      this.tripId.set(res.tripId);
      this.deliveryService.clearPlan();
      this.items.set([]);
      this.total.set(0);

      // Clean the URL so refresh doesn't re-finalize.
      const url = new URL(window.location.href);
      url.searchParams.delete('stripe');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.toString());
    } catch (err: any) {
      if (err?.status === 401) {
        this.router.navigateByUrl('/login');
        return;
      }

      if (err?.status === 409) {
        const refunded = Boolean(err?.error?.paymentRefunded);
        const baseMessage = err?.error?.error || 'No available trucks for your selected time.';
        const message = refunded ? `${baseMessage} (Payment refunded)` : baseMessage;
        this.router.navigateByUrl('/no-trucks', {
          state: {
            message,
            nextAvailable: err?.error?.nextAvailable ?? null
          }
        });
        return;
      }

      this.error.set(err?.error?.error || err?.message || 'Checkout failed');
    } finally {
      this.isPlacing.set(false);
    }
  }
}
