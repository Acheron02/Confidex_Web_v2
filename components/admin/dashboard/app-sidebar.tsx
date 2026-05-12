"use client";

import * as React from "react";
import Image from "next/image";
import { LogOut, PanelLeftClose, PanelLeftOpen, Upload } from "lucide-react";

import { adminDashboardNavItems } from "@/components/admin/dashboard/constants/nav";
import type { AdminDashboardSection } from "@/components/admin/dashboard/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminDashboardAppSidebarProps {
  activeSection: AdminDashboardSection;
  onSectionChange: (section: AdminDashboardSection) => void;
  adminName?: string;
  adminEmail?: string;
  role?: string;
  onLogout: () => Promise<void>;
}

function formatInitials(name?: string) {
  if (!name?.trim()) return "AD";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 rounded-lg border border-sidebar-border/60 cursor-pointer"
      onClick={toggleSidebar}
    >
      {state === "collapsed" ? (
        <PanelLeftOpen className="size-4" />
      ) : (
        <PanelLeftClose className="size-4" />
      )}
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

export function AdminDashboardAppSidebar({
  activeSection,
  onSectionChange,
  adminName,
  adminEmail,
  role,
  onLogout,
}: AdminDashboardAppSidebarProps) {
  const { state } = useSidebar();
  const [profileImage, setProfileImage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedImage = window.localStorage.getItem("adminProfileImage");
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admins/profile-image", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return;

    const data = await res.json();
    if (typeof data.url === "string") {
      setProfileImage(data.url);
      window.localStorage.setItem("adminProfileImage", data.url);
    }
  };

  const isCollapsed = state === "collapsed";
  const isSuperadmin = role === "superadmin";

  const filteredNavItems = adminDashboardNavItems.filter((item) => {
    if (item.key === "revenue" && !isSuperadmin) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader
        className={`border-b px-3 py-3 ${
          isCollapsed ? "flex items-center justify-center px-2 py-2" : ""
        }`}
      >
        {isCollapsed ? (
          <SidebarCollapseButton />
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Image
                src="/confidex_logo_v2.png"
                alt="Confidex"
                width={160}
                height={160}
                className="h-auto w-[140px] object-contain"
                priority
              />

              <SidebarCollapseButton />
            </div>

            <p className="text-xs leading-tight text-sidebar-foreground/70">
              Booth operations dashboard
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={activeSection === item.key}
                      tooltip={item.title}
                      onClick={() => onSectionChange(item.key)}
                      className="cursor-pointer"
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={`shrink-0 border-t ${
          isCollapsed
            ? "flex items-center justify-center px-2 py-3"
            : "px-3 py-3"
        }`}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <label className="relative shrink-0 cursor-pointer">
              <Avatar className="size-9 border border-sidebar-border/70">
                <AvatarImage
                  src={profileImage ?? undefined}
                  alt={adminName ?? "Admin"}
                />
                <AvatarFallback>{formatInitials(adminName)}</AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Upload className="size-2.5" />
              </span>
            </label>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg border border-sidebar-border/60"
              onClick={() => void onLogout()}
            >
              <LogOut className="size-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-sidebar-border/60 bg-sidebar-accent/35 p-2.5">
            <div className="flex items-center gap-3">
              <label className="relative shrink-0 cursor-pointer">
                <Avatar className="size-10 border border-sidebar-border/70">
                  <AvatarImage
                    src={profileImage ?? undefined}
                    alt={adminName ?? "Admin"}
                  />
                  <AvatarFallback>{formatInitials(adminName)}</AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                  <Upload className="size-3" />
                </span>
              </label>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {adminName || "Administrator"}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/65">
                  {adminEmail || "admin@confidex.local"}
                </p>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className="rounded-full capitalize text-[10px]"
                  >
                    {role || "admin"}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator className="my-3 bg-sidebar-border/60" />

            <Button
              variant="ghost"
              className="w-full cursor-pointer justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => void onLogout()}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
