import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ItemsService, type Item } from '../core/items.service';

@Component({
  standalone: true,
  selector: 'app-admin-items-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Admin: Items</h2>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <div class="card" style="padding: 12px; margin-bottom: 16px;">
      <div class="title" style="margin-bottom: 10px;">Add item</div>

      <form [formGroup]="form" (ngSubmit)="create()" class="row" style="gap: 10px; flex-wrap: wrap;">
        <input placeholder="Name" formControlName="Item_name" />
        <input placeholder="Department" formControlName="Department_Code" />
        <input placeholder="Price" type="number" step="0.01" formControlName="Price" />
        <input placeholder="Made in (optional)" formControlName="Made_in" />
        <input placeholder="Image URL (optional)" formControlName="Image_URL" />
        <button type="submit" [disabled]="form.invalid || loading()">Create</button>
      </form>
    </div>

    <div class="grid">
      @for (item of items(); track item.Item_Id) {
        <div class="card">
          <div class="title">#{{ item.Item_Id }}</div>

          <label>
            Name
            <input [value]="item.Item_name" (input)="setDraft(item.Item_Id, 'Item_name', $any($event.target).value)" />
          </label>

          <label>
            Department
            <input
              [value]="item.Department_Code"
              (input)="setDraft(item.Item_Id, 'Department_Code', $any($event.target).value)"
            />
          </label>

          <label>
            Price
            <input
              type="number"
              step="0.01"
              [value]="item.Price"
              (input)="setDraft(item.Item_Id, 'Price', $any($event.target).value)"
            />
          </label>

          <label>
            Made in
            <input [value]="item.Made_in || ''" (input)="setDraft(item.Item_Id, 'Made_in', $any($event.target).value)" />
          </label>

          <label>
            Image URL
            <input
              [value]="item.Image_URL || ''"
              (input)="setDraft(item.Item_Id, 'Image_URL', $any($event.target).value)"
            />
          </label>

          <div class="row" style="justify-content: flex-end;">
            <button (click)="save(item.Item_Id)" [disabled]="loading()">Save</button>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminItemsPage {
  private readonly itemsService = inject(ItemsService);

  readonly items = signal<Item[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  // Draft per item id
  private drafts = new Map<number, Partial<Item>>();

  readonly form = new FormGroup({
    Item_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    Department_Code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    Price: new FormControl<number | null>(null, { validators: [Validators.required] }),
    Made_in: new FormControl<string>(''),
    Image_URL: new FormControl<string>('')
  });

  constructor() {
    this.reload();
  }

  reload() {
    this.error.set(null);
    this.itemsService.list().subscribe({
      next: (res) => this.items.set(res.items),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load items')
    });
  }

  create() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();

    this.itemsService
      .create({
        Item_name: raw.Item_name,
        Department_Code: raw.Department_Code,
        Price: Number(raw.Price),
        Made_in: raw.Made_in?.trim() ? raw.Made_in.trim() : null,
        Image_URL: raw.Image_URL?.trim() ? raw.Image_URL.trim() : null
      })
      .subscribe({
        next: () => {
          this.form.reset({ Item_name: '', Department_Code: '', Price: null, Made_in: '', Image_URL: '' });
          this.loading.set(false);
          this.reload();
        },
        error: (err) => {
          this.error.set(err?.error?.error || err?.message || 'Failed to create item');
          this.loading.set(false);
        }
      });
  }

  setDraft(itemId: number, key: keyof Item, value: string) {
    const draft = this.drafts.get(itemId) ?? {};

    if (key === 'Price') {
      (draft as any)[key] = value;
    } else if (key === 'Made_in' || key === 'Image_URL') {
      (draft as any)[key] = value.trim() ? value : null;
    } else {
      (draft as any)[key] = value;
    }

    this.drafts.set(itemId, draft);
  }

  save(itemId: number) {
    const draft = this.drafts.get(itemId);
    if (!draft || Object.keys(draft).length === 0) return;

    this.loading.set(true);
    this.error.set(null);

    const payload: any = { ...draft };
    if (payload.Price != null) payload.Price = Number(payload.Price);

    this.itemsService.update(itemId, payload).subscribe({
      next: () => {
        this.drafts.delete(itemId);
        this.loading.set(false);
        this.reload();
      },
      error: (err) => {
        this.error.set(err?.error?.error || err?.message || 'Failed to update item');
        this.loading.set(false);
      }
    });
  }
}
