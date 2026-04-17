import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_SESSION_COOKIE = "auction_admin_authenticated"

function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME ?? "admin",
    password: process.env.ADMIN_PASSWORD ?? "admin123",
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const authenticated = cookieStore.get(ADMIN_SESSION_COOKIE)?.value === "true"
  return NextResponse.json({ authenticated })
}

export async function POST(request: Request) {
  let body: { username?: string; password?: string }

  try {
    body = (await request.json()) as { username?: string; password?: string }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const username = body.username?.trim() ?? ""
  const password = body.password ?? ""
  const credentials = getAdminCredentials()

  if (username !== credentials.username || password !== credentials.password) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })
  }

  const response = NextResponse.json({ authenticated: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}