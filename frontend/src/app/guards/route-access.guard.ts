import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

// Consente accesso a Gestione Rotte per admin e compagnie aeree
export const routeAccessGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return router.parseUrl('/login');
    const user = JSON.parse(userStr);
    if (user.role === 'admin' || user.role === 'airline') return true;
    return router.parseUrl('/');
  } catch {
    return router.parseUrl('/');
  }
};
