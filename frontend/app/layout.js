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
  <link rel="icon" type="image/png" href="/logo-ss.png?v=4" />
  <link rel="shortcut icon" href="/logo-ss.png?v=4" />
        <meta name="theme-color" content="#ffffff" />
        {/*
          Runtime override: some browsers aggressively cache favicons or a
          previously-deployed page can inject a different icon. This script
          forces any favicon link elements to point to the versioned app
          logo on page load which helps surface the new icon without a hard
          binary replace.
        */}
        <script dangerouslySetInnerHTML={{__html: `
          (function(){
            try{
              var href = '/logo-ss.png?v=4';
              var links = Array.from(document.querySelectorAll('link[rel~="icon"]'));
              if (links.length === 0) {
                var el = document.createElement('link');
                el.rel = 'icon';
                el.href = href;
                document.head.appendChild(el);
              } else {
                links.forEach(function(l){ l.href = href; });
              }
            }catch(e){console.warn('favicon override failed', e)}
          })();
        `}} />
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
