export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      
      <div className="prose max-w-none">
        <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using SocialSync, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Description of Service</h2>
          <p className="mb-4">
            SocialSync is a social media management platform that allows users to:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Connect multiple social media accounts</li>
            <li>Schedule and publish content across platforms</li>
            <li>Collaborate with team members on content creation</li>
            <li>Manage media libraries and draft posts</li>
            <li>Track and analyze social media performance</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">User Responsibilities</h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Provide accurate and complete information when creating an account</li>
            <li>Maintain the security of your account credentials</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Respect the terms of service of connected social media platforms</li>
            <li>Not use the service for spam, harassment, or illegal activities</li>
            <li>Not attempt to disrupt or interfere with the service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Content and Intellectual Property</h2>
          <p className="mb-4">
            You retain ownership of all content you create and publish through SocialSync. 
            By using our service, you grant us permission to process and transmit your content 
            to the connected social media platforms as necessary to provide our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
          <p className="mb-4">
            We strive to maintain high service availability, but we do not guarantee uninterrupted 
            access to our services. We may suspend or terminate access for maintenance, 
            security reasons, or violations of these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="mb-4">
            SocialSync shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use of or inability to use the service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Termination</h2>
          <p className="mb-4">
            Either party may terminate this agreement at any time. Upon termination, 
            your right to use the service will cease immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Changes will be 
            effective immediately upon posting on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:{" "}
            <a href="mailto:u6520053@au.edu" className="text-blue-600 hover:underline">
              u6520053@au.edu
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
