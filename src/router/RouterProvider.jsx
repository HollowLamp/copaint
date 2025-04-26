import { createBrowserRouter, RouterProvider as ReactRouterProvider } from 'react-router';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function RouterProvider() {
  return <ReactRouterProvider router={router} />;
}
