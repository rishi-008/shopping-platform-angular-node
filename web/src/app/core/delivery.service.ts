import { Injectable } from '@angular/core';

export type DeliveryPlan = {
  branchId: number;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime: string; // HH:mm
  distanceMeters: number;
  durationSeconds: number;
};

const STORAGE_KEY = 'deliveryPlan';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  getPlan(): DeliveryPlan | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DeliveryPlan;
    } catch {
      return null;
    }
  }

  setPlan(plan: DeliveryPlan) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }

  clearPlan() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
