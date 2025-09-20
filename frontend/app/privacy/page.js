import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      backgroundColor: 'white',
      color: '#333',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      lineHeight: '1.6'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Privacy Policy</h1>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
        Last updated: September 21, 2025
      </p>

      <h2>Introduction</h2>
      <p>
        At SocialSync (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our social media management platform and related services (collectively, the &quot;Services&quot;).
      </p>

      <h2>Information We Collect</h2>

      <h3>Personal Information</h3>
      <p>
        <strong>Social Media Account Information:</strong> When you connect your social media accounts (Facebook, YouTube, Twitter, Instagram, Telegram, etc.), we collect your profile information, account IDs, and usernames through OAuth authentication.
      </p>
      <p>
        <strong>Authentication Tokens:</strong> We store encrypted OAuth access and refresh tokens to maintain authenticated sessions with social media platforms.
      </p>
      <p>
        <strong>Account Data:</strong> User preferences, settings, connected platforms, and account configuration information.
      </p>

      <h3>Content and Usage Data</h3>
      <p>
        <strong>Posted Content:</strong> Text, images, videos, and media you schedule and publish through our platform.
      </p>
      <p>
        <strong>Analytics Data:</strong> Post performance metrics, engagement statistics, and scheduling information from connected social media accounts.
      </p>
      <p>
        <strong>Usage Patterns:</strong> Information about how you use our platform, including features accessed and posting schedules.
      </p>

      <h3>Technical Information</h3>
      <p>
        <strong>Device Information:</strong> Browser type, operating system, IP address, and device specifications.
      </p>
      <p>
        <strong>Cookies and Storage:</strong> Authentication cookies, session tokens, and local storage for user preferences.
      </p>

      <h2>Data Storage and Third-Party Services</h2>

      <h3>Social Media Platform Integration</h3>
      <p>
        We integrate with various social media platforms to enable posting and analytics. When you connect accounts:
      </p>
      <ul>
        <li>We store encrypted access tokens for each platform</li>
        <li>We may cache profile information and account metadata</li>
        <li>We access posting APIs to schedule and publish content on your behalf</li>
        <li>All data transmission is encrypted using HTTPS/TLS protocols</li>
      </ul>

      <h3>Media Storage</h3>
      <p>
        User-uploaded media (images, videos) is stored securely using Cloudinary CDN services. We store only the URLs and metadata, not the actual media files.
      </p>

      <h3>Database Storage</h3>
      <p>
        We use secure PostgreSQL databases to store:
      </p>
      <ul>
        <li>User account information and preferences</li>
        <li>Connected social media account details</li>
        <li>Scheduled post content and metadata</li>
        <li>Analytics and performance data</li>
        <li>Encrypted authentication tokens</li>
      </ul>

      <h2>Data Security</h2>
      <p>
        We implement industry-standard security measures:
      </p>
      <ul>
        <li><strong>Encryption:</strong> All data transmission uses HTTPS/TLS protocols</li>
        <li><strong>Token Security:</strong> Authentication tokens are encrypted using advanced cryptographic methods</li>
        <li><strong>Access Controls:</strong> Strict authentication and authorization for all service components</li>
        <li><strong>Secure Infrastructure:</strong> Cloud-hosted infrastructure with regular security updates</li>
        <li><strong>Data Isolation:</strong> User data is properly isolated and accessible only to authorized systems</li>
      </ul>

      <h2>Information Sharing and Disclosure</h2>
      <p>
        We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
      </p>
      <ul>
        <li><strong>With Your Consent:</strong> When you share content publicly or grant access to specific users</li>
        <li><strong>Service Providers:</strong> With trusted third-party services (social media platforms, Cloudinary, hosting providers) necessary for service operation</li>
        <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety</li>
        <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
      </ul>

      <h2>Your Rights and Choices</h2>
      <ul>
        <li><strong>Access and Portability:</strong> Download and export all your data through account settings</li>
        <li><strong>Correction:</strong> Update, edit, or correct your information and content</li>
        <li><strong>Deletion:</strong> Delete individual posts, disconnect accounts, or close your account</li>
        <li><strong>Data Control:</strong> You maintain control over your social media accounts and can revoke permissions</li>
        <li><strong>Communication Preferences:</strong> Opt out of non-essential communications</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        We retain your information as necessary to provide services and comply with legal obligations:
      </p>
      <ul>
        <li><strong>Account Data:</strong> Retained while active and for a reasonable period after deactivation</li>
        <li><strong>Content:</strong> Posts and media retained until deleted or account closure</li>
        <li><strong>Analytics:</strong> Performance data retained for service improvement and legal compliance</li>
        <li><strong>Authentication Tokens:</strong> Regularly refreshed and securely deleted when expired</li>
      </ul>

      <h2>Changes to This Privacy Policy</h2>
      <p>
        We may update this Privacy Policy to reflect changes in our practices or applicable laws. We will notify you of material changes by email or platform notification. Your continued use constitutes acceptance of the updated policy.
      </p>

      <h2>Contact Us</h2>
      <p>
        For questions about this Privacy Policy or our data practices:
      </p>
      <ul>
        <li><strong>Email:</strong> u6520053@au.edu</li>
        <li><strong>Additional Support:</strong> u6520177@au.edu, u6520189@au.edu</li>
        <li><strong>Developer Contacts:</strong> savuthmeassavrin168@gmail.com, kaungsatlynn03@gmail.com</li>
        <li><strong>Support:</strong> Contact form on our website</li>
      </ul>
    </div>
  );
}
