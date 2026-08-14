import React, { memo } from 'react';
import Link from 'next/link';

interface IntroBoxProps {
  // Counts come from the data the viewer has already loaded. Fetching them
  // here meant pulling the whole catalogue down a second time per page load
  // just to render two numbers.
  nodeCount: number;
  linkCount: number;
}

const IntroBox = memo(({ nodeCount, linkCount }: IntroBoxProps) => {
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };
  const numberStyle = {
    color: darkerBlue,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  };

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
        <span style={numberStyle}>{nodeCount}</span> technologies and{" "}
        <span style={numberStyle}>{linkCount}</span> connections
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
        <Link href="/changelog" style={linkStyle}>
          Changelog
        </Link>
      </div>
    </div>
  );
});

IntroBox.displayName = "IntroBox";

export default IntroBox; 