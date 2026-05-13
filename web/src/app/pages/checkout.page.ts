import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';

import { loadStripe, type Stripe, type StripeCardElement, type StripeElements } from '@stripe/stripe-js';

import { CartService, type CartItem } from '../core/cart.service';
import { DeliveryService } from '../core/delivery.service';
import { StripePaymentsService } from '../core/stripe-payments.service';
import { API_BASE_URL } from '../core/api-base-url';

type PublicConfig = {
  stripePublishableKey?: string;
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
        <div class="card" style="padding: 12px; margin: 12px 0;">
          <div class="title" style="margin-bottom: 8px;">Pay with card (Stripe test)</div>
          <div #cardEl style="padding: 10px; border: 1px solid var(--border); border-radius: var(--radius);"></div>
          <div class="meta" style="margin-top: 8px;">
            Use Stripe test card <strong>4242 4242 4242 4242</strong> (any future expiry, any CVC).
          </div>
        </div>

        <button (click)="payAndPlaceOrder()" [disabled]="isPlacing() || !stripeReady()">
          {{ isPlacing() ? 'Processing…' : 'Pay & place order' }}
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
  readonly stripeReady = signal(false);
  readonly cardEl = viewChild<ElementRef<HTMLDivElement>>('cardEl');

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private card: StripeCardElement | null = null;
  private stripePublishableKey: string | null = null;

  constructor() {
    this.refresh();
    this.loadStripeConfig();
  }

  ngAfterViewInit() {
    queueMicrotask(() => void this.maybeInitStripe());
  }

  private loadStripeConfig() {
    this.http.get<PublicConfig>(`${this.apiBaseUrl}/public-config`).subscribe({
      next: (cfg) => {
        const key = (cfg.stripePublishableKey ?? '').trim();
        if (!key) {
          this.stripeEnabled.set(false);
          return;
        }

        this.stripePublishableKey = key;
        this.stripeEnabled.set(true);
        queueMicrotask(() => void this.maybeInitStripe());
      },
      error: () => {
        this.stripeEnabled.set(false);
      }
    });
  }

  private async maybeInitStripe() {
    if (this.stripeReady()) return;
    if (!this.stripePublishableKey) return;
    const hostEl = this.cardEl()?.nativeElement;
    if (!hostEl) return;

    this.stripe = await loadStripe(this.stripePublishableKey);
    if (!this.stripe) {
      this.stripeEnabled.set(false);
      return;
    }

    this.elements = this.stripe.elements();
    this.card = this.elements.create('card');
    this.card.mount(hostEl);
    this.stripeReady.set(true);
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

  async payAndPlaceOrder() {
    this.error.set(null);

    const delivery = this.deliveryService.getPlan();
    if (!delivery) {
      this.router.navigateByUrl('/delivery');
      return;
    }

    if (!this.stripe || !this.card) {
      this.error.set('Stripe is not ready');
      return;
    }

    this.isPlacing.set(true);
    try {
      const intent = await firstValueFrom(this.stripePayments.createPaymentIntent());

      const result = await this.stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: {
          card: this.card
        }
      });

      if (result.error) {
        throw new Error(result.error.message || 'Payment failed');
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not completed (status: ${paymentIntent?.status || 'unknown'})`);
      }

      const res = await firstValueFrom(this.cartService.checkout(delivery, paymentIntent.id));
      this.orderId.set(res.orderId);
      this.placedTotal.set(res.total);
      this.tripId.set(res.tripId);
      this.deliveryService.clearPlan();
      this.items.set([]);
      this.total.set(0);
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
