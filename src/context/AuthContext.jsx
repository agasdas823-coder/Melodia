import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token/user on initialization
    const storedUser = localStorage.getItem('melodia_user');
    const storedToken = localStorage.getItem('melodia_token');
    
    if (storedUser && storedToken) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem('melodia_user');
        localStorage.removeItem('melodia_token');
      }
    }
    
    // Finish loading after checking localStorage
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('melodia_user', JSON.stringify(userData));
    localStorage.setItem('melodia_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('melodia_user');
    localStorage.removeItem('melodia_token');
  };

  const updateUser = (partial) => {
    setUser((prev) => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('melodia_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
