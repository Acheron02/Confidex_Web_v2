"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-context"
import { useEffect } from "react"
import { AdminLogin } from "@/components/auth/admin-login-form"
import CheckAuth from "@/components/common/check-auth"
import { isAdminRole } from "@/lib/rbac"

export default function AdminLoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) return

    if (isAdminRole(user.role)) {
      router.replace("/pages/admin/dashboard")
      return
    }

    router.replace(user._id ? `/pages/users/${user._id}` : "/")
  }, [user, loading, router])

  if (loading) {
    return <CheckAuth />
  }

  if (user) {
    return null
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <AdminLogin
          onSwitchToLogin={() => router.push("/")}
          onClose={() => router.push("/")}
        />
      </div>
    </main>
  )
}
