import React, { useState, useEffect, memo } from 'react';
import Link from 'next/link';
import { cacheManager } from '@/utils/cache';

const IntroBox = memo(() => {
  const [counts, setCounts] = useState({ nodes: 0, links: 0 });
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };
  const numberStyle = { 
    color: darkerBlue, 
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" 
  };

  // Get counts from cache and data
  useEffect(() => {
    const getCounts = async () => {
      try {
        // First try to get cached data
        const cachedData = await cacheManager.get();
        if (cachedData?.detailData) {
          setCounts({
            nodes: cachedData.detailData.nodes?.length || 0,
            links: cachedData.detailData.links?.length || 0
          });
        } else if (cachedData?.basicData) {
          setCounts({
            nodes: cachedData.basicData.nodes?.length || 0,
            links: cachedData.basicData.links?.length || 0
          });
        }

        // Then fetch fresh data
        const response = await fetch("/api/inventions");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const freshData = await response.json();
        setCounts({
          nodes: freshData.nodes?.length || 0,
          links: freshData.links?.length || 0
        });
      } catch (error) {
        console.warn("Failed to fetch counts:", error);
        // Don't update counts if there's an error - keep using cached data
      }
    };
    getCounts();
  }, []);

  return (
    <div className="absolute left-4 top-12 p-6 w-[375px] z-50">
      <h1 className="text-2xl font-bold mb-2" style={{ color: darkerBlue }}>
        HISTORICAL TECH TREE
      </h1>
      <p className="text-sm mb-4" style={{ color: darkerBlue }}>
        A project by{" "}
        <a
          href="https://www.hopefulmons.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          Étienne Fortier-Dubois
        </a>
      </p>

      <p className="text-sm mb-4" style={{ color: darkerBlue }}>
        The tech tree is an interactive visualization of technological history from 3
        million years ago to today. A work in progress, it currently contains{" "}
        <span style={numberStyle}>{counts.nodes}</span> technologies and{" "}
        <span style={numberStyle}>{counts.links}</span> connections
        between them.
      </p>

      <div className="text-sm space-x-4">
        <Link href="/about" style={linkStyle}>
          Read more
        </Link>
        <Link href="/about#contributing" style={linkStyle}>
          Contribute
        </Link>
        <a
          href="https://discord.gg/e96JwQjUmX"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          Join Discord
        </a>
      </div>
    </div>
  );
});

IntroBox.displayName = "IntroBox";

export default IntroBox; 