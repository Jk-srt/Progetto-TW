import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, RouterStateSnapshot } from '@angular/router';

// Standalone functional guard that allows only airline users
export const airlineGuard: CanActivateFn = (_route, state: RouterStateSnapshot): boolean | UrlTree => {
  const router = inject(Router);
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    const user = JSON.parse(userStr);
    return user?.role === 'airline' 
      ? true 
      : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  } catch {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
};
