/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    domains: ['upload.wikimedia.org', 'platform-lookaside.fbsbx.com', "res.cloudinary.com",
       "api.telegram.org" ,"yt3.ggpht.com",'pbs.twimg.com','abs.twimg.com', "files.mastodon.social","scontent.fbkk29-8.fna.fbcdn.net",
      "instagram.com","scontent.fbkk2-8.fna.fbcdn.net",'scontent.fbkk22-1.fna.fbcdn.net','scontent.fbkk22-2.fna.fbcdn.net','graph.facebook.com', 'localhost', "lh3.googleusercontent.com","scontent.fbkk18-2.fna.fbcdn.net", "mastodon.social" ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
