import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, Check, X, User, Mail, Pencil, ChevronLeft } from 'lucide-react';

export default function AccountOverview() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();

  // Profile state
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(user?.username || '');
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailVal, setEmailVal] = useState(user?.email || '');
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  // Avatar from user context
  const avatar = user?.avatar || null;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const saveName = () => {
    if (nameVal.trim()) {
      updateUser({ username: nameVal.trim() });
      showToast('Username updated');
    }
    setEditingName(false);
  };

  const saveEmail = () => {
    if (emailVal.trim()) {
      updateUser({ email: emailVal.trim() });
      showToast('Email updated');
    }
    setEditingEmail(false);
  };

  const handleFile = useCallback((file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      updateUser({ avatar: result });
      showToast('Profile photo updated');
    };
    reader.readAsDataURL(file);
  }, [updateUser]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const removeAvatar = () => {
    updateUser({ avatar: null });
    showToast('Profile photo removed');
  };

  const initials = (user?.username || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="p-6 md:p-10 animate-in fade-in duration-200 min-h-full"
      style={{ fontFamily: "'Inter', 'Urbanist', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm mb-8 transition-colors hover:text-white cursor-pointer"
          style={{ color: '#8888a8' }}
        >
          <ChevronLeft size={15} />
          Back
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-1">Account Overview</h1>
          <p className="text-sm" style={{ color: '#8888a8' }}>
            Manage your profile, photo, and personal details
          </p>
        </div>

        {/* ─── Profile Photo Card ─── */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-base font-semibold text-white mb-5">Profile Photo</h2>
          <div className="flex items-center gap-6">
            {/* Avatar preview */}
            <div className="relative flex-shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user?.username}
                  className="rounded-full object-cover"
                  style={{ width: 88, height: 88 }}
                />
              ) : (
                <div
                  className="rounded-full flex items-center justify-center font-semibold text-white"
                  style={{
                    width: 88,
                    height: 88,
                    fontSize: 88 * 0.36,
                    background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)',
                  }}
                >
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #7c5cfc, #9d7cff)',
                  border: '2px solid #0d0d1a',
                }}
              >
                <Camera size={13} className="text-white" />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className="flex-1 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all py-6 px-4"
              style={{
                border: dragOver ? '2px dashed #7c5cfc' : '2px dashed rgba(255,255,255,0.1)',
                background: dragOver ? 'rgba(124,92,252,0.08)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-1"
                style={{ background: dragOver ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.05)' }}
              >
                <Camera size={18} style={{ color: dragOver ? '#a78bfa' : '#8888a8' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: dragOver ? '#a78bfa' : '#c4c4d8' }}>
                {dragOver ? 'Drop to upload' : 'Upload new photo'}
              </p>
              <p className="text-xs" style={{ color: '#55557a' }}>PNG, JPG, GIF up to 5 MB</p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>

          {avatar && (
            <button
              onClick={removeAvatar}
              className="mt-4 text-xs transition-colors hover:text-red-400 cursor-pointer"
              style={{ color: '#55557a' }}
            >
              Remove photo
            </button>
          )}
        </div>

        {/* ─── Profile Details Card ─── */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <h2 className="text-base font-semibold text-white mb-5">Profile Details</h2>
          <div className="flex flex-col gap-4">
            {/* Username row */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3.5"
              style={{ background: '#1a1a2a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <User size={15} style={{ color: '#8888a8', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-0.5" style={{ color: '#55557a' }}>Username</p>
                  {editingName ? (
                    <input
                      autoFocus
                      value={nameVal}
                      onChange={(e) => setNameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName();
                        if (e.key === 'Escape') { setEditingName(false); setNameVal(user?.username || ''); }
                      }}
                      className="bg-transparent text-sm text-white outline-none w-full"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white truncate">{user?.username || 'Guest'}</p>
                  )}
                </div>
              </div>
              {editingName ? (
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={saveName}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: 'rgba(124,92,252,0.2)' }}
                  >
                    <Check size={13} style={{ color: '#a78bfa' }} />
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameVal(user?.username || ''); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 cursor-pointer"
                  >
                    <X size={13} style={{ color: '#8888a8' }} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 flex-shrink-0 ml-2 cursor-pointer"
                >
                  <Pencil size={13} style={{ color: '#8888a8' }} />
                </button>
              )}
            </div>

            {/* Email row */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3.5"
              style={{ background: '#1a1a2a', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Mail size={15} style={{ color: '#8888a8', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-0.5" style={{ color: '#55557a' }}>Email address</p>
                  {editingEmail ? (
                    <input
                      autoFocus
                      type="email"
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEmail();
                        if (e.key === 'Escape') { setEditingEmail(false); setEmailVal(user?.email || ''); }
                      }}
                      className="bg-transparent text-sm text-white outline-none w-full"
                    />
                  ) : (
                    <p className="text-sm font-medium text-white truncate">{user?.email || 'No email'}</p>
                  )}
                </div>
              </div>
              {editingEmail ? (
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={saveEmail}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: 'rgba(124,92,252,0.2)' }}
                  >
                    <Check size={13} style={{ color: '#a78bfa' }} />
                  </button>
                  <button
                    onClick={() => { setEditingEmail(false); setEmailVal(user?.email || ''); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 cursor-pointer"
                  >
                    <X size={13} style={{ color: '#8888a8' }} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 flex-shrink-0 ml-2 cursor-pointer"
                >
                  <Pencil size={13} style={{ color: '#8888a8' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── Danger Zone Card ─── */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#13131f', border: '1px solid rgba(224,82,96,0.15)' }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: '#e05260' }}>Danger Zone</h2>
          <p className="text-sm mb-4" style={{ color: '#8888a8' }}>
            Sign out of your account or permanently delete your data.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#c4c4d8',
              }}
            >
              Sign out
            </button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
              style={{
                background: 'rgba(224,82,96,0.1)',
                border: '1px solid rgba(224,82,96,0.25)',
                color: '#e05260',
              }}
            >
              Delete account
            </button>
          </div>
        </div>

        {/* ─── Toast Notification ─── */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium text-white z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{
              background: '#1e1e30',
              border: '1px solid rgba(124,92,252,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,92,252,0.25)' }}
            >
              <Check size={11} style={{ color: '#a78bfa' }} />
            </div>
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
