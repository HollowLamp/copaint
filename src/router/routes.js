import { ProtectedRoute } from '../components/auth/ProtectedRoute';

export const routes = [
  {
    path: '/login',
    lazy: () => import('../features/auth/LoginPage'),
  },
  {
    path: '/',
    async lazy() {
      const { ProtectedRoute } = await import('../components/auth/ProtectedRoute');
      return { Component: ProtectedRoute };
    },
    children: [
      {
        path: '/',
        lazy: () => import('../features/dashboard/DashboardPage'),
        children: [
          {
            index: true,
            lazy: async () => {
              const { Navigate } = await import('react-router');
              return { Component: () => Navigate({ to: '/manuscripts', replace: true }) };
            },
          },
          {
            path: 'manuscripts',
            lazy: () => import('../features/manuscripts/ManuscriptsPage'),
          },
          {
            path: 'favorites',
            lazy: () => import('../features/favorites/FavoritesPage'),
          },
          {
            path: 'recycle',
            lazy: () => import('../features/recycle/RecyclePage'),
          },
          {
            path: 'backup',
            lazy: () => import('../features/backup/BackupPage'),
          },
          {
            path: 'profile',
            lazy: () => import('../features/profile/ProfilePage'),
          },
          {
            path: 'settings',
            lazy: () => import('../features/settings/SettingsPage'),
          },
        ],
      },
    ],
  },
  {
    path: '/canvas/:id',
    async lazy() {
      const { ProtectedRoute } = await import('../components/auth/ProtectedRoute');
      return { Component: ProtectedRoute };
    },
    children: [
      {
        path: '',
        lazy: () => import('../features/canvas/CanvasPage'),
      },
    ],
  },
  {
    path: '/demo',
    lazy: () => import('../features/demo/index'),
  },
];
