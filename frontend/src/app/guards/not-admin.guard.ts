import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Impedisce accesso agli admin (li reindirizza alla dashboard admin)
export const notAdminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUser();
  if (user?.role === 'admin') {
    router.navigate(['/admin']);
    return false;
  }
  return true;
};
