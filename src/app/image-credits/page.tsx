'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ImageCredit = {
  title: string;
  nodeName: string;
  imageUrl: string;
  credits: {
    title: string;
    artist?: string;
    license?: string;
    descriptionUrl?: string;
  };
};

export default function ImageCreditsPage() {
  const [imageCredits, setImageCredits] = useState<ImageCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };

  useEffect(() => {
    const fetchImageCredits = async () => {
      try {
        const response = await fetch('/api/image-credits');
        if (!response.ok) {
          throw new Error('Failed to fetch image credits');
        }
        const data = await response.json();
        setImageCredits(data.imageCredits || []);
      } catch (err) {
        setError('Error loading image credits. Please try again later.');
        console.error('Error fetching image credits:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImageCredits();
  }, []);

  // Function to clean HTML from artist field
  const cleanHtml = (html?: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
  };

  // Function to format license text
  const formatLicense = (license?: string): string => {
    if (!license) return '';
    
    // Replace "pd" with "public domain"
    if (license.toLowerCase() === 'pd') {
      return 'public domain';
    }
    
    return license;
  };

  return (
    <div className="min-h-screen bg-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: darkerBlue }}>
          Image Credits
        </h1>

        <div className="mb-6">
          <Link href="/about" className="inline-block" style={linkStyle}>
            ← Back to About
          </Link>
        </div>

        {loading && (
          <div className="text-center py-10">
            <p>Loading image credits...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!loading && !error && imageCredits.length === 0 && (
          <div className="text-center py-10">
            <p>No image credits found.</p>
          </div>
        )}

        {!loading && !error && imageCredits.length > 0 && (
          <>
            <div className="space-y-4">
              {imageCredits.map((credit, index) => (
                <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {credit.credits.descriptionUrl ? (
                      <a 
                        href={credit.credits.descriptionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={linkStyle}
                      >
                        {credit.nodeName}
                      </a>
                    ) : (
                      credit.nodeName
                    )}
                  </h3>
                  
                  {credit.credits.artist && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">Artist/Author:</span> {cleanHtml(credit.credits.artist)}
                    </p>
                  )}
                  
                  {credit.credits.license && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">License:</span> {formatLicense(credit.credits.license)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 pt-6 border-t border-gray-300">
          <Link href="/about" className="inline-block" style={linkStyle}>
            ← Back to About
          </Link>
        </div>
      </div>
    </div>
  );
} 