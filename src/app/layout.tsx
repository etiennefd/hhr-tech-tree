import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: 'Historical Tech Tree',
  description: 'Interactive visualization of technological history',
  openGraph: {
    title: 'Historical Tech Tree',
    description: 'Interactive visualization of technological history',
    images: [
      {
        url: '/og-image.png', // You'll need to create and add this image to public folder
        width: 1200,
        height: 630,
        alt: 'Historical Tech Tree Visualization',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Historical Tech Tree',
    description: 'Interactive visualization of technological history',
    images: ['/og-image.png'],
  },
  metadataBase: new URL('https://historicaltechtree.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
