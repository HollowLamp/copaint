export const routes = [
  {
    path: '/login',
    lazy: () => import('../features/auth/LoginPage'),
  },
  {
    path: '/',
    lazy: () => import('../features/dashboard/DashboardPage'),
    children: [
      {
        path: 'manuscripts',
        children: [
          {
            path: 'forest',
            lazy: () => import('../features/manuscripts/ForestPage'),
          },
          {
            path: 'mountains',
            lazy: () => import('../features/manuscripts/MountainsPage'),
          },
        ],
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
  {
    path: '/canvas/:id',
    lazy: () => import('../features/canvas/CanvasPage'),
  },
];
