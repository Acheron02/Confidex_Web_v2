"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/custom-ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ADMIN_ROLE, SUPERADMIN_ROLE, type AdminRole } from "@/lib/rbac"

export function AdminRegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<AdminRole>(ADMIN_ROLE)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch("/api/auth/adminRegister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || "Failed to register admin")
        return
      }

      setMessage("Admin registered successfully.")
      setName("")
      setEmail("")
      setPassword("")
      setRole(ADMIN_ROLE)
    } catch (error) {
      console.error(error)
      setMessage("Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="register-admin-name">Name</Label>
        <Input
          id="register-admin-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Admin name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-admin-email">Email</Label>
        <Input
          id="register-admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@email.com"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="register-admin-password">Password</Label>
        <PasswordInput
          id="register-admin-password"
          value={password}
          onChange={setPassword}
          placeholder="Admin password"
        />
      </div>

      <div className="grid gap-2">
        <Label>Role</Label>
        <Select value={role} onValueChange={(value) => setRole(value as AdminRole)}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ADMIN_ROLE}>Admin</SelectItem>
            <SelectItem value={SUPERADMIN_ROLE}>Superadmin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <Button disabled={loading} className="w-full">
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  )
}
