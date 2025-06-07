import fs from 'fs/promises';
import path from 'path';
import Airtable from 'airtable';

interface TechNode {
  id: string;
  title: string;
  dateAdded?: string;
  year: number;
}

interface TechLink {
  source: string;
  target: string;
  dateAdded?: string;
}

interface TechTreeData {
  nodes: TechNode[];
  links: TechLink[];
}

interface AppMilestone {
  version: string;
  description: string;
  date: string;
}

function formatDate(dateStr: string): string {
  // Parse the date and adjust for timezone
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-based in JavaScript
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function generateChangelog() {
  try {
    // Conditionally import and configure dotenv only if not in production
    if (process.env.NODE_ENV !== 'production') {
      // Dynamically import dotenv to avoid issues if it's not installed in production
      try {
        const dotenv = await import('dotenv');
        dotenv.config({ path: path.resolve(process.cwd(), '.env.local') }); // Ensure it loads .env.local if you use that
        console.log("Loaded .env.local for development");
      } catch (e) {
        console.warn("dotenv not found or failed to load, proceeding without it.");
      }
    }

    // Initialize Airtable
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID ?? ""
    );

    // Fetch app development milestones
    const milestoneRecords = await base("Milestones")
      .select({
        view: "Grid view",
        sort: [{ field: "Date", direction: "desc" }],
      })
      .all();

    const milestones: AppMilestone[] = milestoneRecords.map(record => ({
      version: String(record.get("Version") || ""),
      description: String(record.get("Description") || ""),
      date: String(record.get("Date") || "")
    }));

    // Read the tech tree data
    const dataPath = path.join(process.cwd(), 'src', 'app', 'api', 'inventions', 'techtree-data.json');
    const data: TechTreeData = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

    // Create maps to store items by date
    const itemsByDate = new Map<string, { 
      techs: string[], 
      connections: Array<{ from: string, to: string }>,
      milestones: Array<{ version: string, description: string }>
    }>();

    // Process app development milestones
    milestones.forEach(milestone => {
      const dateStr = formatDate(milestone.date);
      if (!itemsByDate.has(dateStr)) {
        itemsByDate.set(dateStr, { techs: [], connections: [], milestones: [] });
      }
      itemsByDate.get(dateStr)?.milestones.push({
        version: milestone.version,
        description: milestone.description
      });
    });

    // Process techs
    data.nodes.forEach((node) => {
      if (node.dateAdded) {
        const dateStr = formatDate(node.dateAdded);
        
        if (!itemsByDate.has(dateStr)) {
          itemsByDate.set(dateStr, { techs: [], connections: [], milestones: [] });
        }
        itemsByDate.get(dateStr)?.techs.push(node.title);
      }
    });

    // Process connections
    data.links.forEach((link) => {
      if (link.dateAdded) {
        const dateStr = formatDate(link.dateAdded);
        
        if (!itemsByDate.has(dateStr)) {
          itemsByDate.set(dateStr, { techs: [], connections: [], milestones: [] });
        }

        const sourceNode = data.nodes.find(n => n.id === link.source);
        const targetNode = data.nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          itemsByDate.get(dateStr)?.connections.push({
            from: sourceNode.title,
            to: targetNode.title
          });
        }
      }
    });

    // Sort dates in reverse chronological order
    const sortedDates = Array.from(itemsByDate.keys()).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split(' ');
      const [dayB, monthB, yearB] = b.split(' ');
      const dateA = new Date(`${yearA}-${monthA}-${dayA}`);
      const dateB = new Date(`${yearB}-${monthB}-${dayB}`);
      return dateB.getTime() - dateA.getTime();
    });

    // Generate changelog text
    let changelogText = '';
    
    sortedDates.forEach(date => {
      const items = itemsByDate.get(date);
      if (items) {
        changelogText += `${date}\n`;
        
        // Add app development milestones first
        items.milestones.forEach(milestone => {
          changelogText += `- ${milestone.version}: ${milestone.description}\n`;
        });
        
        // Add techs
        items.techs.forEach(tech => {
          changelogText += `- Added tech: ${tech}\n`;
        });
        
        // Add connections
        items.connections.forEach(conn => {
          changelogText += `- Added connection: ${conn.from} -> ${conn.to}\n`;
        });
        
        changelogText += '\n';
      }
    });

    // Count techs and connections that existed before June 1st, 2025
    const legacyTechs = data.nodes.filter(node => !node.dateAdded).length;
    const legacyConnections = data.links.filter(link => !link.dateAdded).length;

    // Write changelog to file
    const changelogPath = path.join(process.cwd(), 'src', 'app', 'api', 'inventions', 'changelog.txt');
    await fs.writeFile(changelogPath, changelogText);
    
    console.log('Changelog generated successfully!');
  } catch (error) {
    console.error('Error generating changelog:', error);
    process.exit(1);
  }
}

generateChangelog(); 