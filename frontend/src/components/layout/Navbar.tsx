import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bookmark, LogOut, User, X, Menu, Sun, Moon, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useCurrentUser } from '@/hooks/useUser'
import { SearchBar } from '@/components/movie/SearchBar'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user, signInWithGoogle, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const { data: me } = useCurrentUser()
  const location = useLocation()

  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const handler = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20)
        rafRef.current = null
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => {
      window.removeEventListener('scroll', handler)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

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
                <span className="text-white font-heading font-bold text-sm">W</span>
              </div>
              <span className="font-heading font-bold text-lg tracking-tight">
                Watch<span className="text-gradient">Mate</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/" label="Home" />
              <NavLink to="/trending" label="Trending" />
              {user && <NavLink to="/watchlist" label="My Watchlist" />}
              {user && <NavLink to="/groups" label="Groups" />}
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

              <button
                onClick={toggle}
                className="p-2 rounded-lg text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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
                    {me?.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="p-1.5 rounded-lg text-cinema-muted hover:text-accent transition-colors"
                        aria-label="Admin"
                        title="Admin Dashboard"
                      >
                        <ShieldCheck size={16} />
                      </Link>
                    )}
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
            <motion.div
              className="relative w-full max-w-2xl"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.05 }}
            >
              <SearchBar autoFocus />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-4 top-4 text-cinema-muted hover:text-cinema-text z-10"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </motion.div>
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
              {user && <MobileLink to="/groups" label="Groups" />}
              {user && <MobileLink to="/profile" label="Profile" />}
              {me?.role === 'admin' && <MobileLink to="/admin" label="Admin" />}
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
