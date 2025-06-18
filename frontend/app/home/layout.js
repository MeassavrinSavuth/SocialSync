'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../hooks/auth/useUser';
import {
  FaHome, FaChartBar, FaCommentDots, FaFolder, FaUser, FaPlus,
  FaAngleLeft, FaAngleRight
} from 'react-icons/fa';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Home');
  const { profileData, isLoading } = useUser();

  const defaultProfilePic = '/default-avatar.png';
  const [imgSrc, setImgSrc] = useState(defaultProfilePic);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!accessToken || !refreshToken) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/home/dashboard')) setActiveTab('Home');
    else if (path.startsWith('/home/create-post')) setActiveTab('Create Post');
    else if (path.startsWith('/home/analytics')) setActiveTab('Analytics');
    else if (path.startsWith('/home/comments')) setActiveTab('Manage Comments');
    else if (path.startsWith('/home/posts-folder')) setActiveTab('Posts Folder');
    else if (path.startsWith('/home/manage-accounts')) setActiveTab('Manage Account');
  }, []);

  useEffect(() => {
    const imageUrl = profileData?.profileImage;
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      setImgSrc(imageUrl);
    } else {
      setImgSrc(defaultProfilePic);
    }
  }, [profileData]);

  const handleNavClick = (label, path) => {
    setActiveTab(label);
    router.push(path);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className={`transition-all duration-300 bg-white shadow-md p-4 flex flex-col justify-between ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div>
          <div className="flex items-center justify-between mb-6">
            {sidebarOpen && (
              <h1 className="text-2xl font-bold text-indigo-600">SocialSync</h1>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center justify-center w-10 h-10" aria-label="Toggle Sidebar">
              {sidebarOpen ? (
                <FaAngleLeft className="text-3xl text-indigo-600" />
              ) : (
                <FaAngleRight className="text-3xl text-indigo-600" />
              )}
            </button>
          </div>

          <nav className="space-y-2">
            <NavItem icon={<FaHome />} label="Home" open={sidebarOpen} active={activeTab === 'Home'} onClick={() => handleNavClick('Home', '/home/dashboard')} />
            <NavItem icon={<FaPlus />} label="Create Post" open={sidebarOpen} active={activeTab === 'Create Post'} onClick={() => handleNavClick('Create Post', '/home/create-post')} />
            <NavItem icon={<FaChartBar />} label="Analytics" open={sidebarOpen} active={activeTab === 'Analytics'} onClick={() => handleNavClick('Analytics', '/home/analytics')} />
            <NavItem icon={<FaCommentDots />} label="Manage Comments" open={sidebarOpen} active={activeTab === 'Manage Comments'} onClick={() => handleNavClick('Manage Comments', '/home/manage-comments')} />
            <NavItem icon={<FaFolder />} label="Posts Folder" open={sidebarOpen} active={activeTab === 'Posts Folder'} onClick={() => handleNavClick('Posts Folder', '/home/posts-folder')} />
            <NavItem icon={<FaUser />} label="Manage Account" open={sidebarOpen} active={activeTab === 'Manage Account'} onClick={() => handleNavClick('Manage Account', '/home/manage-accounts')} />
          </nav>
        </div>

        <div
          className="flex items-center gap-3 border-t pt-4 cursor-pointer"
          onClick={() => router.push('/home/profile')}
        >
          <img
            src={imgSrc}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover"
            onError={() => setImgSrc(defaultProfilePic)}
          />
          {sidebarOpen && !isLoading && (
            <div>
              <p className="text-sm text-gray-800 font-medium">{profileData?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-800">{profileData?.email || ''}</p>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavItem({ icon, label, dot, open, active, onClick }) {
  return (
    <div
      className={`flex items-center gap-4 px-3 py-3 rounded cursor-pointer transition-all ${
        active ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-7 h-7 text-2xl">
        {icon}
      </div>
      {open && <span className="select-none">{label}</span>}
      {dot && open && <span className="ml-auto w-2 h-2 bg-indigo-500 rounded-full" />}
    </div>
  );
}
