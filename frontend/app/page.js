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
// SVG imports as static assets
const PostingSVG = "/posting.svg";
const SchedulingSVG = "/scheduling.svg";
const AnalyticsSVG = "/analytics.svg";
const CollaborationSVG = "/collaboration.svg";

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
      desc: "Create and publish engaging content across all your social media platforms with our intuitive posting tools. Craft compelling posts, add media attachments, and reach your audience instantly with our streamlined publishing workflow.",
      icon: <MdOutlinePostAdd className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-blue-500 to-indigo-600",
      svg: PostingSVG,
      layout: "left-text-right-svg"
    },
    {
      title: "Scheduling",
      desc: "Plan and schedule your social media content strategically with our advanced scheduling system. Set up posts for optimal times, create content calendars, and maintain consistent engagement with your audience even when you're away.",
      icon: <MdSchedule className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-green-400 to-green-600",
      svg: SchedulingSVG,
      layout: "left-svg-right-text"
    },
    {
      title: "Analytics",
      desc: "Gain deep insights into your social media performance with comprehensive analytics and reporting tools. Track engagement metrics, monitor follower growth, and make data-driven decisions to optimize your social media strategy.",
      icon: <MdAnalytics className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr",
      style: { background: 'linear-gradient(to top right, #6d63fe, #4f46e5)' },
      svg: AnalyticsSVG,
      layout: "left-text-right-svg"
    },
    {
      title: "Collaboration",
      desc: "Foster teamwork and streamline your social media management with powerful collaboration features. Share workspaces with team members, assign roles and permissions, and maintain brand consistency across all platforms.",
      icon: <MdPeople className="w-10 h-10 text-white" />,
      bg: "bg-gradient-to-tr from-pink-400 to-pink-600",
      svg: CollaborationSVG,
      layout: "left-svg-right-text"
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
              <h1 className="text-2xl font-bold" style={{ color: '#6d63fe' }}>SocialSync</h1>
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
          <span className="block" style={{ color: '#6d63fe' }}>in One Place</span>
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Streamline your workflow with our main features: Posting, Scheduling, Analytics, and Team Collaboration.
        </p>

        {/* Hero Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link
            href="/login"
            className="bg-white hover:bg-gray-100 px-8 py-3 rounded-xl text-lg font-semibold transition-transform duration-200 hover:scale-105"
            style={{ color: '#6d63fe' }}
          >
            Login
          </Link>
          <Link
            href="/register"
            className="text-white px-8 py-3 rounded-xl text-lg font-semibold transition-transform duration-200 hover:scale-105"
            style={{ background: 'linear-gradient(to right, #6d63fe, #4f46e5)' }}
          >
            Sign Up
          </Link>
        </div>

        {/* Features Section */}
        <div className="space-y-16">
          {features.map((feature, i) => (
            <div
              key={i}
              className={`flex items-center gap-12 ${
                feature.layout === "left-svg-right-text" ? "flex-row" : "flex-row-reverse"
              }`}
            >
              {/* SVG Section */}
              <div className="flex-1 flex justify-center">
                <div className="w-80 h-80 flex items-center justify-center">
                  <Image
                    src={feature.svg}
                    alt={feature.title}
                    width={320}
                    height={320}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              
              {/* Text Section */}
              <div className="flex-1">
                <div className="py-8">
                  <h3 className="text-4xl font-bold text-gray-900 mb-6">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-xl leading-relaxed">{feature.desc}</p>
                </div>
              </div>
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
                <h3 className="text-xl font-bold" style={{ color: '#6d63fe' }}>SocialSync</h3>
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