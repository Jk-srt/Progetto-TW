import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

// Impedisce la navigazione se l'utente airline deve ancora cambiare password
export const mustChangePasswordGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): boolean | UrlTree => {
  const router = inject(Router);
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return true; // Non autenticato: altre guarde gestiranno
    const user = JSON.parse(userStr);

    // Se non è airline o non è richiesto il cambio password, ok
    if (user.role !== 'airline' || !user.must_change_password) return true;

    // Consenti solo /settings (dove avviene il cambio) e /login
    if (state.url.startsWith('/settings') || state.url.startsWith('/login')) {
      return true;
    }

    // Reindirizza forzando il parametro
    return router.createUrlTree(['/settings'], { queryParams: { forcePassword: '1' } });
  } catch {
    return true;
  }
};
