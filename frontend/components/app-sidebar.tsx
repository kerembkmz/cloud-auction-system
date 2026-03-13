"use client"

import * as React from "react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  ClockCounterClockwiseIcon,
  CommandIcon,
  GearIcon,
  HouseIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  QuestionIcon,
} from "@phosphor-icons/react"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Overview",
      url: "/overview",
      icon: (
        <HouseIcon
        />
      ),
    },
    {
      title: "Create Auction",
      url: "/create-auction",
      icon: (
        <PlusCircleIcon
        />
      ),
    },
    {
      title: "History",
      url: "/history",
      icon: (
        <ClockCounterClockwiseIcon
        />
      ),
    },
    {
      title: "Admin",
      url: "/admin",
      icon: (
        <LockSimpleIcon
        />
      ),
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: (
        <GearIcon
        />
      ),
    },
    {
      title: "Get Help",
      url: "#",
      icon: (
        <QuestionIcon
        />
      ),
    },
    {
      title: "Search",
      url: "#",
      icon: (
        <MagnifyingGlassIcon
        />
      ),
    },
  ],
  documents: [
    {
      name: "All Auctions",
      url: "/overview",
      icon: (
        <HouseIcon
        />
      ),
    },
    {
      name: "Create Auction",
      url: "/create-auction",
      icon: (
        <PlusCircleIcon
        />
      ),
    },
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="#" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Acme Inc.</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
