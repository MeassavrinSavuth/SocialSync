'use client';
import { useState } from 'react';
import { FaGavel, FaHandshake, FaShieldAlt, FaExclamationTriangle, FaUserCheck, FaInfoCircle, FaEnvelope } from 'react-icons/fa';

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: <FaInfoCircle /> },
    { id: 'acceptance', title: 'Acceptance', icon: <FaHandshake /> },
    { id: 'services', title: 'Our Services', icon: <FaUserCheck /> },
    { id: 'responsibilities', title: 'Your Responsibilities', icon: <FaGavel /> },
    { id: 'limitations', title: 'Limitations', icon: <FaExclamationTriangle /> },
    { id: 'legal', title: 'Legal Terms', icon: <FaShieldAlt /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
              <FaGavel className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
              <p className="text-gray-600">Fair and transparent terms for our service</p>
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
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    {section.title}
                  </button>
                ))}
              </nav>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                  <FaShieldAlt />
                  Fair Terms
                </div>
                <p className="text-blue-700 text-sm">
                  Our terms are designed to protect both users and our service.
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
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaGavel className="text-green-600 text-2xl" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Clear & Fair Terms</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                      These terms outline our mutual responsibilities and ensure a safe, productive experience for all SocialSync users.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-green-50 rounded-xl">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaHandshake className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Mutual Respect</h3>
                      <p className="text-gray-600 text-sm">Built on principles of fairness and mutual benefit for all parties.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-blue-50 rounded-xl">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaUserCheck className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">User Rights</h3>
                      <p className="text-gray-600 text-sm">Your rights are protected while using our social media management platform.</p>
                    </div>
                    
                    <div className="text-center p-6 bg-purple-50 rounded-xl">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaShieldAlt className="text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Service Protection</h3>
                      <p className="text-gray-600 text-sm">Terms that ensure reliable service for everyone in our community.</p>
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
                      <strong>Effective date:</strong> These terms apply to all current and new users immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Acceptance Section */}
              {activeSection === 'acceptance' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaHandshake className="text-green-600" />
                    Acceptance of Terms
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Agreement to Terms</h3>
                      <p className="text-green-800 mb-4">
                        By creating an account or using SocialSync, you agree to be bound by these Terms of Service. 
                        If you don&apos;t agree with any part of these terms, please don&apos;t use our service.
                      </p>
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">What This Means</h4>
                        <ul className="text-gray-700 space-y-2 text-sm">
                          <li>✓ You understand and accept these terms</li>
                          <li>✓ You agree to follow our community guidelines</li>
                          <li>✓ You acknowledge our service limitations</li>
                          <li>✓ You accept responsibility for your account</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Changes to Terms</h3>
                      <p className="text-blue-800 mb-4">
                        We may update these terms from time to time. We&apos;ll notify you of significant changes and give you time to review them.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">How We Notify You</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Email notifications</li>
                            <li>• In-app announcements</li>
                            <li>• Website updates</li>
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Your Options</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Continue using with new terms</li>
                            <li>• Download your data</li>
                            <li>• Delete your account</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services Section */}
              {activeSection === 'services' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaUserCheck className="text-green-600" />
                    Our Services
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">What SocialSync Provides</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Social Media Management</h4>
                            <ul className="text-gray-700 space-y-1 text-sm">
                              <li>• Connect multiple social accounts</li>
                              <li>• Schedule and publish content</li>
                              <li>• Manage posting across platforms</li>
                            </ul>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Collaboration Tools</h4>
                            <ul className="text-gray-700 space-y-1 text-sm">
                              <li>• Team workspaces</li>
                              <li>• Content drafting and review</li>
                              <li>• Member management</li>
                            </ul>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Media Management</h4>
                            <ul className="text-gray-700 space-y-1 text-sm">
                              <li>• Upload and organize media</li>
                              <li>• Cloud storage integration</li>
                              <li>• Media library sharing</li>
                            </ul>
                          </div>
                          <div className="bg-white rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900 mb-2">Analytics & Insights</h4>
                            <ul className="text-gray-700 space-y-1 text-sm">
                              <li>• Content performance tracking</li>
                              <li>• Team productivity metrics</li>
                              <li>• Usage analytics</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Responsibilities Section */}
              {activeSection === 'responsibilities' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaGavel className="text-green-600" />
                    Your Responsibilities
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-xl font-semibold text-blue-900 mb-4">Account Security</h3>
                        <ul className="space-y-3 text-blue-800">
                          <li className="flex items-start gap-3">
                            <FaUserCheck className="text-blue-600 mt-1 flex-shrink-0" />
                            <span>Keep your login credentials secure and confidential</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaUserCheck className="text-blue-600 mt-1 flex-shrink-0" />
                            <span>Notify us immediately of any unauthorized access</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaUserCheck className="text-blue-600 mt-1 flex-shrink-0" />
                            <span>Use strong passwords and enable two-factor authentication</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <h3 className="text-xl font-semibold text-green-900 mb-4">Content Guidelines</h3>
                        <ul className="space-y-3 text-green-800">
                          <li className="flex items-start gap-3">
                            <FaShieldAlt className="text-green-600 mt-1 flex-shrink-0" />
                            <span>Ensure all content complies with platform policies</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaShieldAlt className="text-green-600 mt-1 flex-shrink-0" />
                            <span>Respect copyright and intellectual property rights</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaShieldAlt className="text-green-600 mt-1 flex-shrink-0" />
                            <span>No spam, harassment, or illegal activities</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                        <h3 className="text-xl font-semibold text-purple-900 mb-4">Legal Compliance</h3>
                        <ul className="space-y-3 text-purple-800">
                          <li className="flex items-start gap-3">
                            <FaGavel className="text-purple-600 mt-1 flex-shrink-0" />
                            <span>Follow all applicable laws and regulations</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaGavel className="text-purple-600 mt-1 flex-shrink-0" />
                            <span>Respect terms of connected social media platforms</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaGavel className="text-purple-600 mt-1 flex-shrink-0" />
                            <span>Obtain necessary permissions for content you share</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                        <h3 className="text-xl font-semibold text-red-900 mb-4">Prohibited Activities</h3>
                        <ul className="space-y-3 text-red-800">
                          <li className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />
                            <span>No attempts to disrupt or interfere with our service</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />
                            <span>No reverse engineering or unauthorized access attempts</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <FaExclamationTriangle className="text-red-600 mt-1 flex-shrink-0" />
                            <span>No selling or transferring your account to others</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Limitations Section */}
              {activeSection === 'limitations' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaExclamationTriangle className="text-green-600" />
                    Service Limitations
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
                      <h3 className="text-xl font-semibold text-yellow-900 mb-4">Service Availability</h3>
                      <p className="text-yellow-800 mb-4">
                        While we strive for 99.9% uptime, we cannot guarantee uninterrupted service. 
                        Maintenance, updates, and unforeseen circumstances may cause temporary disruptions.
                      </p>
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">What We Provide</h4>
                        <ul className="text-gray-700 space-y-1 text-sm">
                          <li>✓ Regular service monitoring</li>
                          <li>✓ Advance notice of planned maintenance</li>
                          <li>✓ Status updates during outages</li>
                          <li>✓ Best-effort restoration times</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                      <h3 className="text-xl font-semibold text-orange-900 mb-4">Third-Party Dependencies</h3>
                      <p className="text-orange-800 mb-4">
                        Our service relies on social media platforms and cloud providers. Changes to their APIs, 
                        policies, or availability may affect our service functionality.
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Social Platforms</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Facebook/Instagram API changes</li>
                            <li>• YouTube policy updates</li>
                            <li>• Twitter/X platform modifications</li>
                          </ul>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Infrastructure</h4>
                          <ul className="text-gray-700 space-y-1 text-sm">
                            <li>• Cloud hosting providers</li>
                            <li>• Content delivery networks</li>
                            <li>• Database services</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Legal Section */}
              {activeSection === 'legal' && (
                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <FaShieldAlt className="text-green-600" />
                    Legal Terms
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Limitation of Liability</h3>
                      <p className="text-gray-800 mb-4">
                        SocialSync provides its service &quot;as is&quot; and shall not be liable for any indirect, 
                        incidental, special, consequential, or punitive damages resulting from your use 
                        of or inability to use the service.
                      </p>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-xl font-semibold text-blue-900 mb-4">Intellectual Property</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Your Content</h4>
                          <p className="text-gray-700 text-sm">
                            You retain ownership of all content you create and publish through SocialSync. 
                            You grant us permission to process and transmit your content as necessary to provide our services.
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Our Platform</h4>
                          <p className="text-gray-700 text-sm">
                            SocialSync&apos;s technology, design, and branding are our intellectual property. 
                            You may not copy, modify, or redistribute our platform.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Termination</h3>
                      <p className="text-green-800 mb-4">
                        Either party may terminate this agreement at any time. Upon termination, 
                        your right to use the service will cease immediately.
                      </p>
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Data Retention</h4>
                        <ul className="text-gray-700 space-y-1 text-sm">
                          <li>• 30-day grace period for account reactivation</li>
                          <li>• Data export available during grace period</li>
                          <li>• Permanent deletion after grace period expires</li>
                          <li>• Backup retention for security purposes only</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
                      <h3 className="text-xl font-semibold mb-4">Questions About These Terms?</h3>
                      <p className="mb-4">Our team is here to help clarify any questions about our terms of service.</p>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
