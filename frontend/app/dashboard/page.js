// app/dashboard/page.js
'use client'; // This directive makes it a Client Component
import { useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation';
import { FaHome, FaChartBar, FaCommentDots, FaFolder, FaUser, FaPlus } from 'react-icons/fa';

export default function DashboardPage() {
  const router = useRouter(); // Hook for programmatic navigation

  // Protect the route using useEffect
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      console.log('No tokens found. Redirecting to login.');
      router.push('/login'); // Redirect to your login page
    }
  }, [router]); // Depend on router to avoid re-running unnecessarily

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('Logged out. Tokens removed from localStorage.');
    router.push('/login'); // Redirect to your login page (create an app/login/page.js)
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-white shadow-md p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600 mb-6">SocialSync</h1>
          <nav className="space-y-4">
            <NavItem icon={<FaHome />} label="Home" />
            <NavItem icon={<FaPlus />} label="Create Post" />
            <NavItem icon={<FaChartBar />} label="Analytics" />
            <NavItem icon={<FaCommentDots />} label="Manage Comments" dot />
            <NavItem icon={<FaFolder />} label="Posts Folder" />
            <NavItem icon={<FaUser />} label="Manage Account" />
          </nav>
        </div>
        <div className="flex items-center gap-3 border-t pt-4">
          <div className="bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center">
            N
          </div>
          <div>
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-gray-500">johndoe@email.com</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Good afternoon users</h2>
        <h1 className="text-2xl font-bold mb-6">✨ Dashboard Overview</h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <DashboardCard title="Total Posts" value="120" icon="📄" />
          <DashboardCard title="Total Comments" value="350" icon="🗨️" />
          <DashboardCard title="Engagement Rate" value="7.2%" icon="📊" />
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-600 mb-6">
          {["Wed 11", "Thu 12", "Fri 13", "Sat 14", "Sun 15", "Mon 16", "Tue 17"].map(day => (
            <div key={day} className="p-3 border rounded-md bg-white shadow">No Events<br /><strong>{day}</strong></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <ActionCard
            title="Connect to Social Media"
            description="Link your accounts to start scheduling and managing posts."
            buttonText="Connect Now"
            color="from-indigo-500 to-purple-500"
          />
          <ActionCard
            title="Invite Friend to Collaborate"
            description="Work together with teammates on content and campaigns."
            buttonText="Invite Now"
            color="from-green-400 to-green-600"
          />
          <ActionCard
            title="Quick Calendar Look"
            description="Get a snapshot of your upcoming scheduled posts."
            buttonText="View Calendar"
            color="from-pink-500 to-purple-600"
          />
        </div>

        <div className="mt-6">
          <ActionCard
            title="Draft Your Idea"
            description="Capture creative ideas and draft your next post strategy."
            buttonText="Draft Now"
            color="from-indigo-400 to-indigo-700"
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, dot }) {
  return (
    <div className="flex items-center gap-3 text-gray-700 hover:text-indigo-600 cursor-pointer">
      {icon}
      <span>{label}</span>
      {dot && <span className="ml-auto w-2 h-2 bg-indigo-500 rounded-full" />}
    </div>
  );
}

function DashboardCard({ title, value, icon }) {
  return (
    <div className="bg-white p-4 shadow rounded">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-bold flex items-center gap-2">
        <span>{icon}</span> {value}
      </div>
    </div>
  );
}

function ActionCard({ title, description, buttonText, color }) {
  return (
    // Corrected the template literal for className
    <div className={`p-4 rounded shadow bg-gradient-to-r ${color} text-white`}>
      <h3 className="text-md font-semibold mb-1">{title}</h3>
      <p className="text-sm mb-3">{description}</p>
      <button className="bg-white text-black px-3 py-1 rounded font-medium hover:opacity-90">
        {buttonText}
      </button>
    </div>
  );
}