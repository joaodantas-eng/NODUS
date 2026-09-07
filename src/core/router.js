/**
 * Roteador simples do aplicativo desktop
 */

export class Router {
  constructor({ onRouteChange }) {
    this.currentRoute = 'dashboard';
    this.onRouteChange = onRouteChange;

    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash, false);
    });

    // Rota inicial baseada no hash ou padrão 'dashboard'
    const initial = window.location.hash.replace('#', '') || 'dashboard';
    this.currentRoute = initial;
  }

  navigate(route, updateHash = true) {
    const validRoutes = [
      'dashboard',
      'krux',
      'kore',
      'tasks',
      'agenda',
      'finances',
      'challenges',
      'habits',
      'workouts',
      'content',
      'notes',
      'reading',
      'diary',
      'profile'
    ];
    const targetRoute = validRoutes.includes(route) ? route : 'dashboard';

    this.currentRoute = targetRoute;
    if (updateHash) {
      window.location.hash = targetRoute;
    }

    if (this.onRouteChange) {
      this.onRouteChange(targetRoute);
    }
  }

  getRoute() {
    return this.currentRoute;
  }
}
