import localFont from 'next/font/local';

const geistSans = localFont({
  src: [
    {
      path: './public/fonts/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    // add other weights/styles as needed
  ],
  variable: '--font-geist-sans',
});
export default geistSans;