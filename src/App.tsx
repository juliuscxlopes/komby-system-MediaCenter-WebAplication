import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { Home } from './pages/home';
import { Plataforma } from './pages/app/Plataforma';
import { LoginModal } from './components/Auth/LoginModal';
import { AppLayout } from './layouts/App/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoutes';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home onOpenLogin={() => setIsLoginOpen(true)} />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Plataforma />} />
          </Route>
        </Route>
      </Routes>

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}

export default App;