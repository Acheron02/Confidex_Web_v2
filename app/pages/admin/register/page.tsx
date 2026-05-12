"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-context"
import CheckAuth from "@/components/common/check-auth"
import { AdminRegisterForm } from "@/components/auth/admin-register-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isSuperAdminRole } from "@/lib/rbac"

export default function AdminRegisterPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace("/pages/admin")
      return
    }

    if (!isSuperAdminRole(user.role)) {
      router.replace(
        user.role === "admin" ? "/pages/admin/dashboard" : `/pages/users/${user._id}`
      )
    }
  }, [user, loading, router])

  if (loading) return <CheckAuth />

  if (!user || !isSuperAdminRole(user.role)) return null

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>Register admin</CardTitle>
          <CardDescription>
            Create a new admin or superadmin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminRegisterForm />
        </CardContent>
      </Card>
    </main>
  )
}
