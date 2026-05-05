import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Only attach auth header for API calls.
  if (!req.url.startsWith('/api')) return next(req);

  // Don't attempt refresh logic for auth endpoints.
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  // Prevent infinite retry loops.
  if (req.headers.has('x-auth-retry')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.accessToken();

  const authedReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authedReq).pipe(
    catchError((err) => {
      if (err?.status !== 401) return throwError(() => err);

      return auth.refreshTokens().pipe(
        switchMap(() => {
          const nextToken = auth.accessToken();
          if (!nextToken) return throwError(() => err);

          return next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${nextToken}`,
                'x-auth-retry': '1'
              }
            })
          );
        }),
        catchError((refreshErr) => {
          // Refresh token expired/revoked: force re-login.
          auth.logout();
          router.navigateByUrl('/login');
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
