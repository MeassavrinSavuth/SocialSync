import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SocialSync",
  description: "A social media management tool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
  {/* canonical favicon (ICO) for broad browser support */}
  <link rel="icon" href="/favicon.ico" />
  {/* fallback/versioned PNGs */}
  <link rel="icon" type="image/png" href="/logo-ss.png?v=3" />
  <link rel="shortcut icon" href="/logo-ss.png?v=3" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="bottom-right" toastOptions={{
          style: {
            fontSize: '0.9rem',
            background: '#fff',
            color: '#333',
            border: '1px solid #e5e7eb'
          },
        }} />
        {children}
      </body>
    </html>
  );
}
