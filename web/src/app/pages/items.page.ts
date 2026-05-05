import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../core/cart.service';
import { ItemsService, type Item } from '../core/items.service';

@Component({
  standalone: true,
  selector: 'app-items-page',
  imports: [RouterLink],
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .card {
        border: 1px solid;
        padding: 12px;
        border-radius: 6px;
      }

      .thumb {
        width: 100%;
        height: 140px;
        object-fit: contain;
        display: block;
        margin-bottom: 8px;
      }

      .title {
        font-weight: 600;
      }

      .meta {
        font-size: 14px;
      }

      .row {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-top: 12px;
      }
    `
  ],
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
