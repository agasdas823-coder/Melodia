import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 glass-panel border-b border-outline-variant/20 px-margin-mobile md:px-margin-desktop py-sm flex justify-between items-center transition-all duration-300">
      <Link to={user ? "/explore" : "/"} className="flex items-center">
        <img src="/logo-landing.png" alt="Melodia Logo" className="w-44 h-auto object-contain" />
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-md">
        {user ? (
          <>
            <Link to="/explore" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Explore
            </Link>
            <Link to="/search" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Search
            </Link>
            <Link to="/library" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Library
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
                Admin Panel
              </Link>
            )}
          </>
        ) : (
          <>
            <a href="#features" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#about" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
              About
            </a>
          </>
        )}
      </nav>

      {/* Desktop Auth Section */}
      <div className="hidden md:flex items-center gap-sm">
        {user ? (
          <>
            <span className="text-on-surface-variant font-label-md mr-2 whitespace-nowrap">Hi, {user.username}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center border border-outline-variant text-on-background font-label-md text-label-md rounded-lg px-5 py-2 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="font-label-md text-label-md text-on-background hover:text-primary transition-colors px-4 py-2">
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center bg-inverse-primary text-surface-container-lowest font-label-md text-label-md rounded-lg px-6 py-2.5 hover:opacity-90 transition-opacity shadow-lg shadow-inverse-primary/20"
            >
              Get Started
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden text-on-background hover:text-primary focus:outline-none cursor-pointer"
      >
        <span className="material-symbols-outlined text-[28px]">
          {mobileMenuOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="absolute top-[60px] left-0 w-full bg-background border-b border-outline-variant/20 py-md px-margin-mobile flex flex-col gap-sm md:hidden glass-panel z-40">
          {user ? (
            <>
              <Link
                to="/explore"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                Explore
              </Link>
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                Search
              </Link>
              <Link
                to="/library"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                Library
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
                >
                  Admin Panel
                </Link>
              )}
              <div className="border-t border-outline-variant/20 pt-sm mt-xs flex justify-between items-center">
                <span className="text-on-surface-variant font-label-sm whitespace-nowrap">Signed in as {user.username}</span>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-error font-label-md py-1 px-3 border border-error/30 rounded"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                Pricing
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors py-2"
              >
                About
              </a>
              <div className="border-t border-outline-variant/20 pt-sm mt-xs flex flex-col gap-sm">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-label-md text-label-md text-on-background hover:text-primary text-center py-2"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center bg-inverse-primary text-surface-container-lowest font-label-md text-label-md rounded-lg py-2.5 hover:opacity-90 transition-opacity text-center shadow-lg shadow-inverse-primary/20"
                >
                  Get Started
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
