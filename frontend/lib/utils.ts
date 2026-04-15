import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUserInitials(name: string): string {
  if (!name || typeof name !== "string") return "U"
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "U"
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const avatarColors = [
  "bg-blue-500",
  "bg-blue-600",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-red-500",
  "bg-rose-500",
  "bg-pink-500",
  "bg-fuchsia-500",
  "bg-purple-500",
  "bg-violet-500",
  "bg-indigo-500",
  "bg-green-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-yellow-500",
]

export function getAvatarBackgroundColor(name: string): string {
  if (!name || typeof name !== "string") return avatarColors[0]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  
  const index = Math.abs(hash) % avatarColors.length
  return avatarColors[index]
}
