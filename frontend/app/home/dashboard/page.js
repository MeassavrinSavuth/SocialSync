'use client';

// Removed unnecessary Image import as it's not used in this file
// import Image from 'next/image';

// Assuming SocialAccountCard and DashboardCard are defined elsewhere or correctly imported
// You might need to import DashboardCard and ActionCard if they are in separate files
// import DashboardCard from './DashboardCard';
// import ActionCard from './ActionCard';


export default function DashboardPage() {
  return (
    <>
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Good afternoon users</h2> {/* Darker text */}
      <h1 className="text-2xl font-bold mb-6 text-gray-900">✨ Dashboard Overview</h1> {/* Darker text */}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <DashboardCard title="Total Posts" value="120" icon="📄" />
        <DashboardCard title="Total Comments" value="350" icon="🗨️" />
        <DashboardCard title="Engagement Rate" value="7.2%" icon="📊" />
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-sm mb-6"> {/* Removed text-gray-600 here to let inner elements control color */}
        {["Wed 11", "Thu 12", "Fri 13", "Sat 14", "Sun 15", "Mon 16", "Tue 17"].map(day => (
          <div key={day} className="p-3 border rounded-md bg-white shadow text-gray-800"> {/* Darker text for calendar */}
            No Events<br /><strong>{day}</strong>
          </div>
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
    </>
  );
}

function DashboardCard({ title, value, icon }) {
  return (
    <div className="bg-white p-4 shadow rounded">
      {/* Changed text-gray-500 to text-gray-700 for better visibility */}
      <div className="text-sm text-gray-700">{title}</div>
      {/* Kept text-xl font-bold, default black on white is usually fine */}
      <div className="text-xl font-bold flex items-center gap-2">
        <span>{icon}</span> {value}
      </div>
    </div>
  );
}

function ActionCard({ title, description, buttonText, color }) {
  return (
    // text-white on color gradients is generally good, no changes needed here.
    // The contrast is typically sufficient.
    <div className={`p-4 rounded shadow bg-gradient-to-r ${color} text-white`}>
      <h3 className="text-md font-semibold mb-1">{title}</h3>
      <p className="text-sm mb-3">{description}</p>
      <button className="bg-white text-black px-3 py-1 rounded font-medium hover:opacity-90">
        {buttonText}
      </button>
    </div>
  );
}