import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          Sign Up
        </h1>

        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm text-slate-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="********"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <button
            type="button"
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
          >
            Create Account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-700">
          Already have an account?{" "}
          <Link href="/" className="font-medium text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </section>
    </main>
  );
}
