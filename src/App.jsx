import { RouterProvider } from './router/RouterProvider';
import { ThemeProvider } from './hooks/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <RouterProvider />
    </ThemeProvider>
  );
}

export default App;
