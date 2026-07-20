/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: static export removed — real user accounts, deposits, and the
  // admin panel need Route Handlers and server-side Supabase sessions,
  // which `output: 'export'` does not support. The site now needs a
  // Node-capable host (Vercel) instead of a static file host.
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
