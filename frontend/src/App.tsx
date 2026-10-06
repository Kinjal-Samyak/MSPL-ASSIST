import { RouterProvider } from 'react-router-dom';
import { AuthSessionBootstrap } from '@/components/AuthSessionBootstrap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { router } from '@/routes';
import { ThemeProvider } from '@/themes';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthSessionBootstrap />
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
