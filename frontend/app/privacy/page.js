export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="mb-4">
            SocialSync collects information you provide directly to us, such as when you create an account, 
            connect social media platforms, or use our services.
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Account information (email, name, profile picture)</li>
            <li>Social media account connections and permissions</li>
            <li>Content you create, schedule, and publish through our platform</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide and maintain our social media management services</li>
            <li>Connect and manage your social media accounts</li>
            <li>Schedule and publish content on your behalf</li>
            <li>Provide customer support and communicate with you</li>
            <li>Improve and develop our services</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or otherwise transfer your personal information to third parties, 
            except as described in this policy:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>With social media platforms (Facebook, YouTube, etc.) as necessary to provide our services</li>
            <li>With service providers who assist in our operations</li>
            <li>When required by law or to protect our rights</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Social Media Permissions</h2>
          <p className="mb-4">
            When you connect your social media accounts, we request specific permissions:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Google/YouTube:</strong> Access to upload videos, manage channel content</li>
            <li><strong>Facebook:</strong> Access to manage pages, publish posts</li>
            <li><strong>Twitter:</strong> Access to publish tweets, manage account</li>
            <li><strong>Instagram:</strong> Access to publish photos and videos</li>
          </ul>
          <p>You can revoke these permissions at any time through your social media account settings.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:{" "}
            <a href="mailto:u6520053@au.edu" className="text-blue-600 hover:underline">
              u6520053@au.edu
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
