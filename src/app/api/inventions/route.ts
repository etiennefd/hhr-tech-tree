import { NextResponse } from 'next/server';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export async function GET() {
  try {
    const records = await base('Table Name')  // Replace with your table name
      .select({
        view: 'Grid view'  // Replace with your view name
      })
      .all();

    const nodes = records.map(record => ({
      id: record.id,
      title: record.get('Name') as string,
      tier: record.get('Tier') as string,
      image: record.get('Image') as string || '/api/placeholder/100/100',
      year: record.get('Date') as number,
      dateDetails: record.get('Date details') as string,
      type: record.get('Type of innovation') as string,
      fields: (record.get('Field(s)') as string || '').split(',').map(f => f.trim()),
      inventors: (record.get('Inventor(s)') as string || '').split(',').map(i => i.trim()),
      organization: record.get('Organization') as string,
      city: record.get('City') as string,
      countryHistorical: record.get('Country (historical)') as string,
      countryModern: record.get('Country (modern borders)') as string,
      wikipedia: record.get('Wikipedia') as string,
      firstInstance: record.get('Name of first instance') as string,
      otherNames: record.get('Other names') as string,
      details: record.get('Details') as string,
      serendipity: record.get('Serendipity') as string,
      connections2: record.get('Connections 2') as string,
      connectionsFrom: (record.get('From (from Connections 2)') as string || '').split(',').map(c => c.trim()),
      connections: record.get('Connections') as string,
      connectionsTo: (record.get('To (from Connections)') as string || '').split(',').map(c => c.trim()),
      otherLinks: record.get('Other links') as string,
      notes: record.get('Notes for later') as string
    }));

    // Process connections
    const links = records
      .filter(record => record.get('Connections'))
      .flatMap(record => {
        const connections = record.get('Connections') as string;
        return connections.split(',').map(targetId => ({
          source: record.id,
          target: targetId.trim(),
          description: ''
        }));
      });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching from Airtable:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}