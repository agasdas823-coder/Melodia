import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Explore from './pages/Explore';
import Search from './pages/Search';
import TrackRedirect from './pages/TrackRedirect';
import Library from './pages/Library';
import Recents from './pages/Recents';
import PlaylistDetail from './pages/PlaylistDetail';
import YTPlaylistDetail from './pages/YTPlaylistDetail';
import AccountOverview from './pages/AccountOverview';
import Admin from './pages/Admin';


// Layout Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MiniPlayer from './components/player/MiniPlayer';
import AppLayout from './components/layout/AppLayout';

// Page Shell Layout (Marketing / Public)
function MarketingLayout() {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col pt-16">
      <Navbar />
      
      {/* Main Content Area */}
      <div className="flex-grow">
        <Outlet />
      </div>

      <Footer />
      <MiniPlayer />
    </div>
  );
}

// Protected Route Wrapper
function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

// Public Route Guard (Redirects to explore if logged in)
function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/explore" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <Routes>
            {/* Guests Only Routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Route>

            {/* App Dashboard Layout Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Explore />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library" element={<Library />} />
                <Route path="/recents" element={<Recents />} />
                <Route path="/playlist/:id" element={<PlaylistDetail />} />
                <Route path="/yt-playlist/:id" element={<YTPlaylistDetail />} />
                <Route path="/track/:id" element={<TrackRedirect />} />
                <Route path="/account" element={<AccountOverview />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>

            {/* Catch all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}

