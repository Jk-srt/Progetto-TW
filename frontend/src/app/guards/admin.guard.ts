import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';

export const adminGuard: CanActivateFn = (): boolean | UrlTree => {
  const router = inject(Router);
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return router.parseUrl('/');
    const user = JSON.parse(userStr);
    return user?.role === 'admin' ? true : router.parseUrl('/');
  } catch {
    return router.parseUrl('/');
  }
};
