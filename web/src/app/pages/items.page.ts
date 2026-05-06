import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../core/cart.service';
import { ItemsService, type Item } from '../core/items.service';

@Component({
  standalone: true,
  selector: 'app-items-page',
  imports: [RouterLink],
  template: `
    <h2>Items</h2>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="grid">
      @for (item of items(); track item.Item_Id) {
        <div class="card">
          @if (item.Image_URL) {
            <img class="thumb" [src]="'/' + item.Image_URL" [alt]="item.Item_name" />
          }

          <div class="title">{{ item.Item_name }}</div>
          <div class="meta">Department: {{ item.Department_Code }}</div>
          <div class="meta">Price: {{ item.Price }}</div>

          <div class="row">
            <button (click)="add(item)">Add to cart</button>
            <a routerLink="/cart">View cart</a>
          </div>
        </div>
      }
    </div>
  `
})
export class ItemsPage {
  private readonly itemsService = inject(ItemsService);
  private readonly cartService = inject(CartService);

  readonly items = signal<Item[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.itemsService.list().subscribe({
      next: (res) => this.items.set(res.items),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load items')
    });
  }

  add(item: Item) {
    this.cartService.addItem(item.Item_Id, 1).subscribe({
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to add to cart')
    });
  }
}
