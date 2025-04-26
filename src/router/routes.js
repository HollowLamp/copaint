export const routes = [
  {
    path: '/login',
    lazy: () => import('../features/auth/LoginPage'),
  },
  {
    path: '/',
    lazy: () => import('../features/dashboard/DashboardPage'),
  },
  {
    path: '/canvas/:id',
    lazy: () => import('../features/canvas/CanvasPage'),
  },
];
