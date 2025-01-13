import Link from 'next/link'

export default function AboutPage() {
  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };

  return (
    <div className="min-h-screen bg-yellow-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ color: darkerBlue }}>
          About the Historical Tech Tree
        </h1>

        <div className="space-y-6 text-gray-700">
          <p>
            The Historical Tech Tree is an interactive visualization of technological history, 
            showing how inventions and discoveries throughout human history are connected to each other.
          </p>

          <p>
            Each node in the tree represents a significant technological development, discovery, or 
            invention. The connections between nodes show how technologies built upon or influenced 
            each other. The horizontal axis represents time, spanning from the earliest human tools 
            to modern innovations.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Features
          </h2>
          
          <ul className="list-disc pl-5 space-y-2">
            <li>Interactive visualization spanning millions of years of technological history</li>
            <li>Search functionality to find specific technologies</li>
            <li>Filter by fields, locations, and time periods</li>
            <li>Detailed information about each technology including dates, inventors, and historical context</li>
            <li>Visual representation of technological dependencies and influences</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Data Sources
          </h2>

          <p>
            The data for this visualization comes from various historical sources, academic publications, 
            and technological histories. While we strive for accuracy, technology history can be complex 
            and sometimes controversial. Dates and attributions are based on commonly accepted historical 
            records, but may be subject to debate or new discoveries.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4" style={{ color: darkerBlue }}>
            Contributing
          </h2>

          <p>
            This is an open project and contributions are welcome. If you&apos;d like to help improve the 
            tech tree by adding new technologies, correcting information, or suggesting improvements, 
            please visit our{' '}
            <Link href="/contribute" style={linkStyle}>
              contribution page
            </Link>
            .
          </p>

          <div className="mt-12 pt-6 border-t border-gray-300">
            <Link href="/" className="inline-block" style={linkStyle}>
              ← Back to Tech Tree
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 