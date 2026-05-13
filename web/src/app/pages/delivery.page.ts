import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BranchesService, type Branch } from '../core/branches.service';
import { MeService } from '../core/me.service';
import { DeliveryService } from '../core/delivery.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../core/api-base-url';

declare const google: any;

type PublicConfig = {
  googleMapsApiKey: string;
};

@Component({
  standalone: true,
  selector: 'app-delivery-page',
  imports: [RouterLink],
  styles: [
    `
      .branch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .branch-card {
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: var(--radius);
        padding: 12px;
      }

      .branch-card.selected {
        font-weight: 600;
        border-color: var(--primary);
      }

      #map {
        height: 420px;
        width: 100%;
        margin-top: 12px;
      }

      .row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin: 12px 0;
      }

      .grid-2 {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 12px;
      }

      @media (min-width: 900px) {
        .grid-2 {
          grid-template-columns: 1fr 1fr;
          align-items: start;
        }
      }

      input[type='text'],
      input[type='date'],
      input[type='time'] {
        width: 100%;
        box-sizing: border-box;
      }
    `
  ],
  template: `
    <h2>Delivery Planning</h2>

    <div class="row">
      <a routerLink="/cart">Back to cart</a>
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    <h4>Select Distribution Branch</h4>
    <div class="branch-grid">
      @for (b of branches(); track b.branchId) {
        <div
          class="branch-card"
          [class.selected]="b.branchId === selectedBranchId()"
          (click)="selectBranch(b)"
        >
          <div>{{ b.name }}</div>
          <div>{{ b.address }}</div>
          <div>{{ b.city }}, {{ b.province }}</div>
        </div>
      }
    </div>

    <div class="grid-2">
      <div>
        <h4>Delivery Information</h4>
        <div>
          <label>Destination Address</label>
          <input type="text" [value]="destinationAddress()" readonly />
        </div>
        <div>
          <label>Preferred Delivery Date</label>
          <input type="date" [min]="minDate()" [value]="deliveryDate()" (change)="deliveryDate.set($any($event.target).value)" />
        </div>
        <div>
          <label>Preferred Delivery Time</label>
          <input type="time" min="09:00" max="18:00" [value]="deliveryTime()" (change)="deliveryTime.set($any($event.target).value)" />
        </div>

        <div class="row">
          <button (click)="confirm()" [disabled]="!canConfirm()">Confirm Delivery Details</button>
        </div>

        @if (routeInfo()) {
          <div>
            <strong>Optimal Route Details:</strong><br />
            Distance: {{ routeInfo()!.distanceText }}<br />
            Estimated Duration: {{ routeInfo()!.durationText }}
          </div>
        }
      </div>

      <div>
        <div id="map" #mapEl></div>
        @if (!mapsReady()) {
          <p>Map not available (missing Google Maps API key).</p>
        }
      </div>
    </div>
  `
})
export class DeliveryPage {
  private readonly branchesService = inject(BranchesService);
  private readonly meService = inject(MeService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly branches = signal<Branch[]>([]);
  readonly selectedBranchId = signal<number | null>(null);
  readonly destinationAddress = signal<string>('');
  readonly minDate = signal<string>('');
  readonly deliveryDate = signal<string>('');
  readonly deliveryTime = signal<string>('09:00');
  readonly mapsReady = signal(false);
  readonly routeInfo = signal<null | {
    distanceText: string;
    durationText: string;
    distanceMeters: number;
    durationSeconds: number;
  }>(null);

  private map?: any;
  private directionsService?: any;
  private directionsRenderer?: any;

  readonly mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');

  constructor() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const min = tomorrow.toISOString().slice(0, 10);
    this.minDate.set(min);
    this.deliveryDate.set(min);

    this.load();
  }

  private load() {
    this.error.set(null);

    this.branchesService.list().subscribe({
      next: (res) => this.branches.set(res.branches),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load branches')
    });

    this.meService.getMe().subscribe({
      next: (res) => this.destinationAddress.set(res.user.address),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load user profile')
    });

    this.http.get<PublicConfig>(`${this.apiBaseUrl}/public-config`).subscribe({
      next: async (cfg) => {
        if (!cfg.googleMapsApiKey) {
          this.mapsReady.set(false);
          return;
        }
        try {
          await this.loadGoogleMaps(cfg.googleMapsApiKey);
          this.initMap();
          this.mapsReady.set(true);
        } catch {
          this.mapsReady.set(false);
        }
      },
      error: () => this.mapsReady.set(false)
    });
  }

  private loadGoogleMaps(apiKey: string): Promise<void> {
    const existing = document.querySelector('script[data-google-maps="true"]');
    if (existing) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.dataset['googleMaps'] = 'true';
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }

  private initMap() {
    const el = this.mapEl()?.nativeElement;
    if (!el) return;

    this.map = new google.maps.Map(el, {
      zoom: 10,
      center: { lat: 43.6532, lng: -79.3832 }
    });

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer();
    this.directionsRenderer.setMap(this.map);
  }

  selectBranch(branch: Branch) {
    this.selectedBranchId.set(branch.branchId);
    this.calculateRoute(branch);
  }

  private calculateRoute(branch: Branch) {
    if (!this.mapsReady() || !this.directionsService || !this.directionsRenderer) return;
    if (branch.latitude == null || branch.longitude == null) {
      this.error.set('Selected branch is missing coordinates');
      return;
    }

    const address = this.destinationAddress();
    if (!address) return;

    new google.maps.Geocoder().geocode({ address }, (results: any, status: string) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        this.error.set('Could not locate destination address');
        return;
      }

      const request = {
        origin: { lat: branch.latitude, lng: branch.longitude },
        destination: results[0].geometry.location,
        travelMode: 'DRIVING'
      };

      this.directionsService.route(request, (result: any, routeStatus: string) => {
        if (routeStatus !== 'OK') {
          this.error.set('Could not calculate route');
          return;
        }

        this.directionsRenderer.setDirections(result);
        const leg = result.routes[0].legs[0];
        this.routeInfo.set({
          distanceText: leg.distance.text,
          durationText: leg.duration.text,
          distanceMeters: leg.distance.value,
          durationSeconds: leg.duration.value
        });
      });
    });
  }

  canConfirm() {
    return (
      this.selectedBranchId() != null &&
      !!this.deliveryDate() &&
      !!this.deliveryTime() &&
      this.routeInfo() != null
    );
  }

  confirm() {
    if (!this.canConfirm()) return;

    const info = this.routeInfo()!;
    this.deliveryService.setPlan({
      branchId: this.selectedBranchId()!,
      deliveryDate: this.deliveryDate(),
      deliveryTime: this.deliveryTime(),
      distanceMeters: info.distanceMeters,
      durationSeconds: info.durationSeconds
    });

    this.router.navigateByUrl('/checkout');
  }
}
