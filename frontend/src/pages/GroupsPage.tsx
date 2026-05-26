import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Plus, LogIn, Copy, Check, Loader2, Crown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useMyGroups, useCreateGroup, useJoinGroup } from '@/hooks/useGroups'
import type { GroupDto } from '@/types'

export function GroupsPage() {
  const { user } = useAuth()
  const { data: groups = [], isLoading } = useMyGroups()
  const { mutateAsync: create, isPending: creating } = useCreateGroup()
  const { mutateAsync: join, isPending: joining } = useJoinGroup()

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!user) return <Navigate to="/" replace />

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!groupName.trim()) return
    setError(null)
    try {
      await create(groupName.trim())
      setGroupName('')
      setShowCreate(false)
    } catch {
      setError('Failed to create group.')
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setError(null)
    try {
      await join(inviteCode.trim().toUpperCase())
      setInviteCode('')
      setShowJoin(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setError(msg ?? 'Invalid invite code or already a member.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 rounded-full bg-accent" />
            <h1 className="font-heading font-bold text-2xl text-cinema-text">My Groups</h1>
          </div>
          <p className="text-cinema-muted/60 text-sm font-body ml-3">
            Watch together, compete on who watches the most.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text text-sm font-body transition-colors"
          >
            <LogIn size={15} /> Join
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(null) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg accent-gradient text-white text-sm font-body hover:shadow-accent-glow transition-all"
          >
            <Plus size={15} /> Create
          </button>
        </div>
      </motion.div>

      {/* Create modal */}
      {showCreate && (
        <motion.form
          onSubmit={handleCreate}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cinema-navy border border-accent/30 rounded-xl p-5 mb-6 space-y-3"
        >
          <p className="font-heading font-semibold text-cinema-text text-sm">Create a new group</p>
          <input
            autoFocus
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (e.g. Friday Movie Night)"
            maxLength={50}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/40 focus:outline-none focus:border-accent/60"
          />
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating || !groupName.trim()}
              className="px-4 py-2 rounded-lg accent-gradient text-white text-sm font-body font-semibold disabled:opacity-50 flex items-center gap-2">
              {creating && <Loader2 size={13} className="animate-spin" />} Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-cinema-muted text-sm font-body hover:text-cinema-text">
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {/* Join modal */}
      {showJoin && (
        <motion.form
          onSubmit={handleJoin}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cinema-navy border border-accent/30 rounded-xl p-5 mb-6 space-y-3"
        >
          <p className="font-heading font-semibold text-cinema-text text-sm">Join via invite code</p>
          <input
            autoFocus
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g. NINJA42"
            maxLength={10}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/40 focus:outline-none focus:border-accent/60 tracking-widest uppercase"
          />
          {error && <p className="text-red-400 text-xs font-body">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={joining || !inviteCode.trim()}
              className="px-4 py-2 rounded-lg accent-gradient text-white text-sm font-body font-semibold disabled:opacity-50 flex items-center gap-2">
              {joining && <Loader2 size={13} className="animate-spin" />} Join
            </button>
            <button type="button" onClick={() => setShowJoin(false)}
              className="px-4 py-2 rounded-lg text-cinema-muted text-sm font-body hover:text-cinema-text">
              Cancel
            </button>
          </div>
        </motion.form>
      )}

      {/* Groups list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-20 text-center"
        >
          <Users size={40} className="text-cinema-muted/30" />
          <div>
            <p className="font-heading font-semibold text-cinema-text">No groups yet</p>
            <p className="text-cinema-muted/60 text-sm font-body mt-1">
              Create a group or join one with an invite code.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GroupCard group={group} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: GroupDto }) {
  const [copied, setCopied] = useState(false)

  function copyCode() {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Link
      to={`/groups/${group.id}`}
      className="block bg-cinema-navy border border-cinema-navy-border hover:border-accent/40 rounded-xl p-5 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {group.isAdmin && <Crown size={13} className="text-yellow-400 shrink-0" />}
            <h3 className="font-heading font-bold text-cinema-text group-hover:text-accent transition-colors truncate">
              {group.name}
            </h3>
          </div>
          <p className="text-cinema-muted/60 text-xs font-body">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); copyCode() }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cinema-surface border border-cinema-navy-border text-cinema-muted hover:text-cinema-text text-xs font-body font-mono transition-colors shrink-0"
          title="Copy invite code"
        >
          {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          {group.inviteCode}
        </button>
      </div>
    </Link>
  )
}
