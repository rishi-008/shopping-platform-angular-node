import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { OrdersService, type Order } from '../core/orders.service';

@Component({
  standalone: true,
  selector: 'app-orders-page',
  imports: [RouterLink, DatePipe],
  template: `
    <h2>Orders</h2>

    <div class="row">
      <a routerLink="/items">Back to items</a>
    </div>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @if (orders().length === 0) {
      <p>No orders yet.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Delivery</th>
            <th>Total</th>
            <th>Order status</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          @for (o of orders(); track o.orderId) {
            <tr>
              <td>#{{ o.orderId }}</td>
              <td>{{ o.orderDate | date: 'short' }}</td>
              <td>
                @if (o.delivery) {
                  <div>Branch: {{ o.delivery.branchName }}</div>
                  <div>When: {{ o.delivery.deliveryDate }} {{ o.delivery.deliveryTime }}</div>
                } @else {
                  <div>—</div>
                }
              </td>
              <td>{{ o.total }}</td>
              <td>{{ o.status }}</td>
              <td>
                @if (o.payment) {
                  <div>Status: {{ o.payment.status }}</div>
                  <div>Method: {{ o.payment.method }}</div>
                  <div>Txn: {{ o.payment.transactionId }}</div>
                } @else {
                  <div>No payment</div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `
})
export class OrdersPage {
  private readonly ordersService = inject(OrdersService);

  readonly orders = signal<Order[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.error.set(null);
    this.ordersService.list().subscribe({
      next: (res) => this.orders.set(res.orders),
      error: (err) => this.error.set(err?.error?.error || err?.message || 'Failed to load orders')
    });
  }
}
