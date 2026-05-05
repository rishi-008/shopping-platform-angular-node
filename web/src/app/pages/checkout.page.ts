import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CartService, type CartItem } from '../core/cart.service';
import { DeliveryService } from '../core/delivery.service';

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

      <button (click)="placeOrder()" [disabled]="isPlacing()">
        {{ isPlacing() ? 'Placing order…' : 'Place order' }}
      </button>
    }
  `
})
export class CheckoutPage {
  private readonly cartService = inject(CartService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly router = inject(Router);

  readonly items = signal<CartItem[]>([]);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);
  readonly isPlacing = signal(false);
  readonly orderId = signal<number | null>(null);
  readonly placedTotal = signal<number | null>(null);
  readonly tripId = signal<number | null>(null);

  constructor() {
    this.refresh();
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
        this.error.set(err?.error?.error || err?.message || 'Checkout failed');
      }
    });
  }
}
