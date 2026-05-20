import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bookmark, LogOut, User, X, Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const { user, signInWithGoogle, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchVal.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
      setSearchOpen(false)
      setSearchVal('')
    }
  }

  return (
    <>
      <motion.nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass border-b border-cinema-navy-border' : 'bg-transparent'
        }`}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shadow-accent-glow">
                <span className="text-white font-heading font-bold text-sm">O</span>
              </div>
              <span className="font-heading font-bold text-lg tracking-tight">
                OTT<span className="text-gradient">Finder</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/" label="Home" />
              <NavLink to="/trending" label="Trending" />
              {user && <NavLink to="/watchlist" label="My Watchlist" />}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {user ? (
                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to="/watchlist"
                    className="p-2 rounded-lg text-cinema-muted hover:text-accent transition-colors"
                    aria-label="Watchlist"
                  >
                    <Bookmark size={20} />
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link to="/profile" aria-label="Profile">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName ?? 'User'}
                          className="w-8 h-8 rounded-full ring-2 ring-cinema-navy-border hover:ring-accent/60 transition-all"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                      )}
                    </Link>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded-lg text-cinema-muted hover:text-red-400 transition-colors"
                      aria-label="Sign out"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg accent-gradient text-white font-body font-medium text-sm hover:shadow-accent-glow transition-shadow"
                >
                  <User size={16} />
                  Sign in
                </button>
              )}

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-cinema-muted hover:text-cinema-text"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-cinema-black/80 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />
            <motion.form
              onSubmit={handleSearch}
              className="relative w-full max-w-2xl"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-cinema-muted" />
              <input
                autoFocus
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search movies and shows…"
                className="w-full pl-12 pr-14 py-4 bg-cinema-navy border border-cinema-navy-border rounded-xl text-cinema-text text-lg font-body placeholder:text-cinema-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-cinema-text"
              >
                <X size={20} />
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-x-0 top-16 z-40 md:hidden glass border-b border-cinema-navy-border px-4 py-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-col gap-3">
              <MobileLink to="/" label="Home" />
              <MobileLink to="/trending" label="Trending" />
              {user && <MobileLink to="/watchlist" label="My Watchlist" />}
              {user && <MobileLink to="/profile" label="Profile" />}
              {user ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-cinema-navy font-body text-sm"
                >
                  <LogOut size={16} /> Sign out
                </button>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg accent-gradient text-white font-body font-medium text-sm"
                >
                  <User size={16} /> Sign in with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`font-body text-sm font-medium transition-colors relative group ${
        active ? 'text-cinema-text' : 'text-cinema-muted hover:text-cinema-text'
      }`}
    >
      {label}
      <span
        className={`absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-accent transition-transform origin-left ${
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
      />
    </Link>
  )
}

function MobileLink({ to, label }: { to: string; label: string }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg font-body text-sm font-medium transition-colors ${
        active ? 'bg-cinema-navy text-cinema-text' : 'text-cinema-muted hover:text-cinema-text'
      }`}
    >
      {label}
    </Link>
  )
}
