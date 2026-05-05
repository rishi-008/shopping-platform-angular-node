import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { CartPage } from './pages/cart.page';
import { DeliveryPage } from './pages/delivery.page';
import { CheckoutPage } from './pages/checkout.page';
import { ItemsPage } from './pages/items.page';
import { LoginPage } from './pages/login.page';
import { NoTrucksPage } from './pages/no-trucks.page';
import { OrdersPage } from './pages/orders.page';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'items' },
	{ path: 'login', component: LoginPage },
	{ path: 'items', component: ItemsPage, canActivate: [authGuard] },
	{ path: 'cart', component: CartPage, canActivate: [authGuard] },
	{ path: 'delivery', component: DeliveryPage, canActivate: [authGuard] },
	{ path: 'no-trucks', component: NoTrucksPage, canActivate: [authGuard] },
	{ path: 'orders', component: OrdersPage, canActivate: [authGuard] },
	{ path: 'checkout', component: CheckoutPage, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'items' }
];
