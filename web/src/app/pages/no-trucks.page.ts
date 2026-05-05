import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-no-trucks-page',
  imports: [RouterLink, DatePipe],
  template: `
    <h2>Truck Availability Issue</h2>

    <p class="error">{{ message() }}</p>

    @if (nextAvailable()) {
      <p>
        Suggested next available delivery slot:
        <strong>{{ nextAvailable() | date: 'medium' }}</strong>
      </p>
    }

    <div class="row">
      <a routerLink="/delivery">Pick a different delivery time</a>
      <a routerLink="/cart">Back to cart</a>
    </div>
  `
})
export class NoTrucksPage {
  readonly message = signal('No available trucks for your selected time.');
  readonly nextAvailable = signal<string | null>(null);

  constructor() {
    const state = (history.state ?? {}) as { message?: string; nextAvailable?: string | null };
    if (state.message) this.message.set(state.message);
    if (state.nextAvailable) this.nextAvailable.set(state.nextAvailable);
  }
}
