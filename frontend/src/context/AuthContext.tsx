import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { queryClient } from '@/lib/queryClient'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Process any pending redirect result (needed when running as a PWA/standalone app)
    getRedirectResult(auth).catch(() => {})
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      await signInWithPopup(auth, provider)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        // Popup was blocked (rare on mobile) — fall back to redirect
        await signInWithRedirect(auth, provider)
      } else if (code === 'auth/user-disabled') {
        alert('Your account has been suspended. Please contact support.')
      }
    }
  }

  async function logout() {
    await signOut(auth)
    queryClient.clear()
  }

  function refreshUser() {
    // Firebase mutates the User object in-place after updateProfile; create a new
    // object reference so React sees the change and re-renders dependent components.
    if (auth.currentUser) {
      setUser(Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser))
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
