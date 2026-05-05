import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { CartPage } from './pages/cart.page';
import { ItemsPage } from './pages/items.page';
import { LoginPage } from './pages/login.page';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'items' },
	{ path: 'login', component: LoginPage },
	{ path: 'items', component: ItemsPage, canActivate: [authGuard] },
	{ path: 'cart', component: CartPage, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'items' }
];
