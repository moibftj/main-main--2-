'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, ShieldOff, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

type UserManagementActionsProps = {
  user: {
    id: string
    full_name: string | null
    email: string
    role: string
    is_super_user: boolean
  }
  isSuperAdmin: boolean
}

export function UserManagementActions({ user, isSuperAdmin }: UserManagementActionsProps) {
  const router = useRouter()
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [superUserDialogOpen, setSuperUserDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>(user.role)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only super admins can manage users
  if (!isSuperAdmin) {
    return null
  }

  const handlePromoteUser = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role: selectedRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user role')
      }

      setPromoteDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSuperUser = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/super-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          isSuperUser: !user.is_super_user
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update super admin status')
      }

      setSuperUserDialogOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Change Role Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedRole(user.role)
          setPromoteDialogOpen(true)
        }}
      >
        <UserPlus className="h-4 w-4 mr-1" />
        Change Role
      </Button>

      {/* Super Admin Toggle Button - Only for admins */}
      {user.role === 'admin' && (
        <Button
          variant={user.is_super_user ? 'destructive' : 'default'}
          size="sm"
          onClick={() => setSuperUserDialogOpen(true)}
        >
          {user.is_super_user ? (
            <>
              <ShieldOff className="h-4 w-4 mr-1" />
              Revoke Super Admin
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-1" />
              Grant Super Admin
            </>
          )}
        </Button>
      )}

      {/* Promote User Dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {user.full_name || user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select Role</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscriber">Subscriber</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPromoteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handlePromoteUser} disabled={loading}>
              {loading ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Super Admin Toggle Dialog */}
      <Dialog open={superUserDialogOpen} onOpenChange={setSuperUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.is_super_user ? 'Revoke Super Admin' : 'Grant Super Admin'}
            </DialogTitle>
            <DialogDescription>
              {user.is_super_user
                ? `Remove super admin privileges from ${user.full_name || user.email}? They will still be an admin but won't be able to manage users or grant super admin status.`
                : `Grant super admin privileges to ${user.full_name || user.email}? This will allow them to manage all users and grant/revoke super admin status.`}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSuperUserDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleToggleSuperUser}
              disabled={loading}
              variant={user.is_super_user ? 'destructive' : 'default'}
            >
              {loading
                ? 'Updating...'
                : user.is_super_user
                ? 'Revoke Super Admin'
                : 'Grant Super Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
