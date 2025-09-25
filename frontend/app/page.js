// pages/index.js
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import {
  FaFacebookF,
  FaYoutube,
  FaTwitter,
  FaInstagram,
  FaTelegramPlane,
  FaMastodon,
} from "react-icons/fa";
import {
  MdOutlinePostAdd,
  MdSchedule,
  MdAnalytics,
  MdPeople,
} from "react-icons/md";

// Logo component — with className support
const Logo = ({ size = 40, className = "" }) => (
  <Image
    src="/logo-ss.png"
    alt="SocialSync"
    width={size}
    height={size}
    className={className}
    priority
  />
);

export default function Home() {
  const features = [
    {
      title: "Posting",
      desc: "Publish content across multiple platforms easily and efficiently.",
      icon: <MdOutlinePostAdd className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-blue-500 to-indigo-600",
    },
    {
      title: "Scheduling",
      desc: "Plan and schedule posts for the best times to reach your audience.",
      icon: <MdSchedule className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-green-400 to-green-600",
    },
    {
      title: "Analytics",
      desc: "Track engagement and performance across all connected accounts.",
      icon: <MdAnalytics className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-purple-400 to-purple-600",
    },
    {
      title: "Collaboration",
      desc: "Work seamlessly with your team in shared workspaces.",
      icon: <MdPeople className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-pink-400 to-pink-600",
    },
  ];

  const platforms = [
    { icon: FaFacebookF, solid: "#1877F2", name: "Facebook" },
    { icon: FaYoutube, solid: "#FF0000", name: "YouTube" },
    { icon: FaTwitter, solid: "#1DA1F2", name: "Twitter" },
    {
      icon: FaInstagram,
      gradient: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
      name: "Instagram",
    },
    { icon: FaTelegramPlane, solid: "#0088cc", name: "Telegram" },
    { icon: FaMastodon, solid: "#6364FF", name: "Mastodon" },
  ];

  return (
    <div className="min-h-screen font-poppins bg-gradient-to-br from-blue-50 to-indigo-100">
      <Head>
        <title>SocialSync</title>
        {/* Use your logo-ss.png as favicon */}
        <link rel="icon" href="/logo-ss.png" type="image/png" />
        <meta name="theme-color" content="#2563EB" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Logo size={40} className="mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">SocialSync</h1>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Manage All Your Social Media
          <span className="text-blue-600 block">in One Place</span>
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Streamline your workflow with our main features: Posting, Scheduling, Analytics, and Team Collaboration.
        </p>

        {/* Hero Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link
            href="/login"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-xl text-lg font-semibold transition-transform duration-200 hover:scale-105"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-500 hover:to-blue-600 text-white px-8 py-3 rounded-xl text-lg font-semibold transition-transform duration-200 hover:scale-105"
          >
            Sign Up
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-2 gap-12">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-white p-10 rounded-2xl shadow-xl hover:shadow-2xl transition relative overflow-hidden group"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${feature.bg} group-hover:scale-110 transition-transform duration-300`}
              >
                {feature.icon}
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-lg">{feature.desc}</p>
              <svg
                className="absolute top-0 right-0 w-20 h-20 opacity-20 transform rotate-45"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l6 6L21 6" />
              </svg>
            </div>
          ))}
        </div>

        {/* Platforms Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Connect All Your Favorite Platforms
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            {platforms.map((platform, i) => {
              const Icon = platform.icon;
              const isGradient = Boolean(platform.gradient);
              return (
                <div key={i} className="text-center">
                  <div
                    className={[
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 flex-shrink-0",
                      isGradient ? platform.gradient : "",
                    ].join(" ")}
                    style={
                      isGradient ? undefined : { background: platform.solid }
                    }
                  >
                    <Icon className="text-white text-2xl" />
                  </div>
                  <p className="font-semibold text-gray-900">{platform.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Logo size={32} className="mr-2" />
                <h3 className="text-xl font-bold">SocialSync</h3>
              </div>
              <p className="text-gray-400">
                The ultimate social media management platform for creators and businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Help Center
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>u6520053@au.edu</li>
                <li>u6520177@au.edu</li>
                <li>u6520189@au.edu</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 SocialSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
