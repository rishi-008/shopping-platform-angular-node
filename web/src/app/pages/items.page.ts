import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { ItemsService, type Item } from '../core/items.service';

@Component({
  standalone: true,
  selector: 'app-items-page',
  imports: [],
  template: `
    <h2>Items</h2>

    <div class="row" style="gap: 8px; align-items: center; margin: 12px 0; flex-wrap: wrap;">
      <input
        placeholder="Search by product name or department"
        [value]="query()"
        (input)="setQuery($any($event.target).value)"
        style="min-width: 240px;"
      />
      @if (query().trim()) {
        <button type="button" (click)="clearQuery()">Clear</button>
      }
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="grid">
      @for (item of filteredItems(); track item.Item_Id) {
        <div class="card">
          @if (item.Image_URL) {
            <img class="thumb" [src]="imageSrc(item)" [alt]="item.Item_name" />
          }

          <div class="title">{{ item.Item_name }}</div>
          <div class="meta">Department: {{ item.Department_Code }}</div>
          <div class="meta">Price: {{ item.Price }}</div>

          <div class="row">
            <button (click)="add(item)">Add to cart</button>
          </div>
        </div>
      }

      @if (filteredItems().length === 0) {
        <div class="card">
          <div class="title">No results</div>
          <div class="meta">Try a different search term.</div>
        </div>
      }
    </div>
  `
})
export class ItemsPage {
  private readonly itemsService = inject(ItemsService);
  private readonly cartService = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly items = signal<Item[]>([]);
  readonly error = signal<string | null>(null);
  readonly query = signal('');

  readonly filteredItems = computed(() => {
    const allItems = this.items();
    const q = this.query().trim().toLowerCase();
    if (!q) return allItems;

    return allItems.filter((item) => {
      const name = item.Item_name?.toLowerCase() ?? '';
      const dept = item.Department_Code?.toLowerCase() ?? '';
      return name.includes(q) || dept.includes(q);
    });
  });

  setQuery(value: string) {
    this.query.set(String(value ?? ''));
  }

  clearQuery() {
    this.query.set('');
  }

  imageSrc(item: Item): string | null {
    const url = item.Image_URL;
    if (!url) return null;
    return url.startsWith('http://') || url.startsWith('https://') ? url : '/' + url;
  }

  constructor() {
    this.itemsService.list().subscribe({
      next: (res) => this.items.set(res.items),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load items')
    });
  }

  add(item: Item) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.cartService.addItem(item.Item_Id, 1).subscribe({
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to add to cart')
    });
  }
}
