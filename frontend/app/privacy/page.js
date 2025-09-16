'use client';
import { useState } from 'react';
import { FaShieldAlt, FaUsers, FaLock, FaEye, FaCheckCircle, FaInfoCircle, FaEnvelope } from 'react-icons/fa';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: <FaInfoCircle /> },
    { id: 'collection', title: 'Data Collection', icon: <FaEye /> },
    { id: 'usage', title: 'How We Use Data', icon: <FaUsers /> },
    { id: 'sharing', title: 'Data Sharing', icon: <FaShieldAlt /> },
    { id: 'security', title: 'Security', icon: <FaLock /> },
    { id: 'rights', title: 'Your Rights', icon: <FaCheckCircle /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <FaShieldAlt className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-gray-600">Your privacy is important to us</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                      activeSection === section.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
              
              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <FaCheckCircle />
                  GDPR Compliant
                </div>
                <p className="text-green-700 text-sm">
                  We follow EU privacy regulations and respect your data rights.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-lg">
              {/* Overview Section */}
              {activeSection === 'overview' && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaShieldAlt className="text-blue-600 text-2xl" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">We Protect Your Privacy</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                      SocialSync is committed to protecting your personal information and being transparent about how we collect, use, and share your data.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaLock className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Secure by Design</h3>
                      <p className="text-gray-600 text-sm">Your data is encrypted and protected with industry-standard security measures.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaUsers className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">You&apos;re in Control</h3>
                      <p className="text-gray-600 text-sm">Manage your privacy settings and data permissions at any time.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaCheckCircle className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Transparent</h3>
                      <p className="text-gray-600 text-sm">Clear explanations of what data we collect and why we need it.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Last updated:</strong> {new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Effective date:</strong> This policy is effective immediately for new users and existing users.
                    </p>
                  </div>
                </div>
              )}

              {/* Data Collection Section */}
              {activeSection === 'collection' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaEye className="text-blue-600" />
                    Information We Collect
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Information You Provide</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Account Information</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Email address</li>
                            <li>• Name and profile photo</li>
                            <li>• Password (encrypted)</li>
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Content Data</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Posts and media you create</li>
                            <li>• Scheduled content</li>
                            <li>• Workspace collaborations</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Social Media Connections</h3>
                      <p className="text-green-800 mb-4">When you connect your social media accounts, we collect:</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Platform Access</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• OAuth tokens (encrypted)</li>
                            <li>• Account permissions</li>
                            <li>• Platform-specific IDs</li>
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Usage Analytics</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Feature usage patterns</li>
                            <li>• Performance metrics</li>
                            <li>• Error logs (anonymized)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Usage Section */}
              {activeSection === 'usage' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaUsers className="text-blue-600" />
                    How We Use Your Data
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Core Features</h3>
                      <ul className="space-y-3 text-blue-800">
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Connect and manage your social media accounts</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Schedule and publish content across platforms</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Provide workspace collaboration features</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Service Improvement</h3>
                      <ul className="space-y-3 text-green-800">
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Analyze usage patterns to improve features</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Provide customer support and assistance</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Ensure security and prevent abuse</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Sharing Section */}
              {activeSection === 'sharing' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaShieldAlt className="text-blue-600" />
                    Data Sharing & Protection
                  </h2>
                  
                  <div className="bg-red-50 rounded-xl p-6 border border-red-200 mb-6">
                    <h3 className="text-xl font-semibold text-red-900 mb-3">We Never Sell Your Data</h3>
                    <p className="text-red-800">
                      Your personal information is never sold, traded, or transferred to third parties for marketing purposes.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Authorized Sharing Only</h3>
                      <p className="text-blue-800 mb-4">We only share data in these specific situations:</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Social Platforms</h4>
                          <p className="text-gray-700 text-sm">Content is shared with connected social media platforms only when you explicitly post or schedule content.</p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Service Providers</h4>
                          <p className="text-gray-700 text-sm">Essential service providers (hosting, email) under strict confidentiality agreements.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaLock className="text-blue-600" />
                    Security & Protection
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                        <FaLock className="text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-green-900 mb-3">Data Encryption</h3>
                      <p className="text-green-800 text-sm mb-3">All sensitive data is encrypted both in transit and at rest using industry-standard encryption protocols.</p>
                      <ul className="text-green-700 text-sm space-y-1">
                        <li>• TLS 1.3 for data transmission</li>
                        <li>• AES-256 encryption for stored data</li>
                        <li>• Encrypted OAuth tokens</li>
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                        <FaShieldAlt className="text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-purple-900 mb-3">Access Controls</h3>
                      <p className="text-purple-800 text-sm mb-3">Strict access controls and monitoring protect your data from unauthorized access.</p>
                      <ul className="text-purple-700 text-sm space-y-1">
                        <li>• Multi-factor authentication</li>
                        <li>• Regular security audits</li>
                        <li>• Minimal data access principles</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Your Rights Section */}
              {activeSection === 'rights' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaCheckCircle className="text-blue-600" />
                    Your Privacy Rights
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Data Access & Control</h3>
                      <ul className="space-y-3 text-blue-800">
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Access and download your personal data</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Correct inaccurate information</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-blue-600 mt-1 flex-shrink-0" />
                          <span>Delete your account and data</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Privacy Controls</h3>
                      <ul className="space-y-3 text-green-800">
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Manage social media connections</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Control data sharing preferences</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <FaCheckCircle className="text-green-600 mt-1 flex-shrink-0" />
                          <span>Opt-out of analytics tracking</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                    <h3 className="text-xl font-semibold mb-4">Contact Our Privacy Team</h3>
                    <p className="mb-4">Have questions about your privacy rights or need assistance with your data?</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <a 
                        href="mailto:u6520053@au.edu"
                        className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-4 py-2 hover:bg-opacity-30 transition-all"
                      >
                        <FaEnvelope />
                        u6520053@au.edu
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
