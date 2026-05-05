import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService, type CartItem } from '../core/cart.service';

@Component({
  standalone: true,
  selector: 'app-cart-page',
  imports: [RouterLink],
  template: `
    <h2>Cart</h2>

    <div class="row">
      <a routerLink="/items">Back to items</a>
      <button (click)="clear()" [disabled]="items().length === 0">Clear cart</button>

      @if (items().length > 0) {
        <a routerLink="/checkout">Checkout</a>
      }
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @if (items().length === 0) {
      <p>Your cart is empty.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.itemId) {
            <tr>
              <td>{{ item.name }}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  [value]="item.quantity"
                  (change)="updateQty(item, $any($event.target).value)"
                />
              </td>
              <td>{{ item.price }}</td>
              <td>{{ item.lineTotal }}</td>
              <td>
                <button (click)="remove(item)">Remove</button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <p class="total">Total: {{ total() }}</p>
    }
  `
})
export class CartPage {
  private readonly cartService = inject(CartService);

  readonly items = signal<CartItem[]>([]);
  readonly total = signal(0);
  readonly error = signal<string | null>(null);

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

  updateQty(item: CartItem, rawValue: string) {
    const quantity = Number(rawValue);
    if (!Number.isInteger(quantity) || quantity < 0) {
      this.error.set('Quantity must be a non-negative integer');
      return;
    }

    this.cartService.updateQuantity(item.itemId, quantity).subscribe({
      next: () => this.refresh(),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to update quantity')
    });
  }

  remove(item: CartItem) {
    this.cartService.removeItem(item.itemId).subscribe({
      next: () => this.refresh(),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to remove item')
    });
  }

  clear() {
    this.cartService.clearCart().subscribe({
      next: () => this.refresh(),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to clear cart')
    });
  }
}
