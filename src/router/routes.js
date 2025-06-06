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
            path: 'manuscripts/forest',
            lazy: () => import('../features/manuscripts/ForestPage'),
          },
          {
            path: 'manuscripts/mountains',
            lazy: () => import('../features/manuscripts/MountainsPage'),
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
