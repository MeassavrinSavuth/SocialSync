// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Add any other paths where your Tailwind classes are used
  ],
  theme: {
    extend: {
        colors: {
        facebook: '#1877F2',
        instagram: '#E4405F', // A common Instagram reddish-pink
        youtube: '#FF0000',
        twitter: '#1DA1F2',
        mastodon: '#6364FF', // Mastodon's default purple-blue
      },
    },
  },
  plugins: [
    // Make sure this line is present
    require('@tailwindcss/forms'), // You might have other plugins, keep them
    require('@tailwindcss/typography'), // Example of another common plugin
    require('@tailwindcss/aspect-ratio'), // Example
    // THIS IS THE CRUCIAL ONE FOR BACKDROP BLUR
    require('@tailwindcss/forms'), // Ensure forms is here if you use it
    require('@tailwindcss/typography'), // Ensure typography is here if you use it
    // Other plugins...
  ],
  // Add this if it's missing or if you're on an older Tailwind version
  // and need to explicitly enable experimental features
  // corePlugins: {
  //   backdropFilter: true, // This enables backdrop-filter properties
  // },
};