import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h2>Login</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div>
            <label>Email</label>
            <input type="email" formControlName="email" autocomplete="email" />
          </div>

          <div>
            <label>Password</label>
            <input type="password" formControlName="password" autocomplete="current-password" />
          </div>

          <button type="submit" [disabled]="form.invalid || loading()">Login</button>

          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </form>
      </div>
    </div>
  `
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  onSubmit() {
    if (this.form.invalid) return;

    this.error.set(null);
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.auth.setTokens(res.accessToken, res.refreshToken);
        this.router.navigateByUrl('/items');
      },
      error: (err) => {
        const message = err?.error?.error || err?.message || 'Login failed';
        this.error.set(message);
        this.loading.set(false);
      }
    });
  }
}
