import Link from 'next/link';
import fs from 'fs/promises';
import path from 'path';

export default async function ChangelogPage() {
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };

  // Read the changelog file
  let changelogContent = '';
  let error = null;

  try {
    const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'inventions', 'changelog.txt');
    changelogContent = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    console.error('Error reading changelog file:', err);
    error = 'Error loading changelog. Please try again later.';
  }

  return (
    <div className="min-h-screen bg-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: darkerBlue }}>
          Changelog
        </h1>

        <div className="mb-6">
          <Link href="/about" className="inline-block" style={linkStyle}>
            ← Back to About
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {!error && (
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {changelogContent}
            </pre>
          </div>
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