import Link from 'next/link';
import Airtable from 'airtable'; // Import Airtable
import { FieldSet, Record as AirtableRecord } from 'airtable'; // Import types

// Initialize Airtable - reuse environment variables
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID ?? ""
);

// Define the structure of the fetched data we need
type CreditData = {
  id: string;
  nodeName: string;
  creditsText?: string;
  creditsUrl?: string;
};

// Make the component async to fetch data
export default async function ImageCreditsPage() {
  // Fetch data directly from Airtable
  let creditsData: CreditData[] = [];
  let fetchError: string | null = null;

  try {
    const records = await base("Innovations")
      .select({
        view: "Used for deployment, do not edit directly", // Use the same view as the API
        fields: ["Name", "Image credits", "Image credits URL"],
        filterByFormula: "{Image credits} != ''", // Only fetch records with credits
        sort: [{ field: "Name", direction: "asc" }] // Sort alphabetically by node name
      })
      .all();

    creditsData = records.map((record: AirtableRecord<FieldSet>) => ({
      id: record.id,
      nodeName: String(record.get("Name") || "Unknown"),
      creditsText: String(record.get("Image credits") || ""),
      creditsUrl: String(record.get("Image credits URL") || ""),
    }));
  } catch (err) {
    console.error('Error fetching image credits from Airtable:', err);
    fetchError = 'Error loading image credits from database. Please try again later.';
  }

  const darkerBlue = "#6B98AE";
  const linkStyle = { color: darkerBlue, textDecoration: "underline" };

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

        {fetchError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {fetchError}
          </div>
        )}

        {!fetchError && creditsData.length === 0 && (
          <div className="text-center py-10">
            <p>No image credits found in the database.</p>
          </div>
        )}

        {!fetchError && creditsData.length > 0 && (
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {creditsData.map((credit) => (
              <li key={credit.id}>
                <strong className="font-semibold">{credit.nodeName}:</strong> {credit.creditsText}. 
                {credit.creditsUrl && (
                  <>
                    {' '}
                    <a 
                      href={credit.creditsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={linkStyle}
                      className="hover:text-blue-800"
                    >
                      View source
                    </a>
                    .
                  </>
                )}
                 {' '}
                 <Link 
                   href={`/?initialNodeId=${credit.id}`} 
                   style={linkStyle}
                   className="hover:text-blue-800"
                 >
                    View in tree
                 </Link>
                 .
              </li>
            ))}
          </ul>
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