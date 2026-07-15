// src/App.jsx
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Library from './pages/Library';
import Search from './pages/Search';
import PlaylistDetail from './pages/PlaylistDetail';
import YTPlaylistDetail from './pages/YTPlaylistDetail';
import Explore from './pages/Explore';
import Recents from './pages/Recents';
import AccountOverview from './pages/AccountOverview';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Opening from './pages/Opening';
import Admin from './pages/Admin';
import TrackRedirect from './pages/TrackRedirect';
import PublicPlaylistView from './pages/PublicPlaylistView';

function ProtectedRoute({ element }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
}

function SharedPlaylistRoute() {
  const { user } = useAuth();
  const { id } = useParams();
  
  if (user) {
    return <Navigate to={`/playlist/${id}`} replace />;
  }
  return <PublicPlaylistView />;
}

function App() {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth status from localStorage
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Routes>
        {/* Auth Routes - No Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/opening" element={<Opening />} />
        <Route path="/" element={<Opening />} />
        <Route path="/landing" element={<Navigate to="/opening" replace />} />

        {/* Protected Routes - With AppLayout */}
        <Route element={user ? <AppLayout /> : <Navigate to="/opening" replace />}>
          <Route path="/library" element={<Library />} />
          <Route path="/search" element={<Search />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/recents" element={<Recents />} />
          <Route path="/account" element={<AccountOverview />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/track/:id" element={<TrackRedirect />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/yt-playlist/:id" element={<YTPlaylistDetail />} />
        </Route>

        <Route path="/shared-playlist/:id" element={<SharedPlaylistRoute />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/" : "/opening"} replace />} />
      </Routes>
    </div>
  );
}

export default App;