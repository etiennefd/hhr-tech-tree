import requests
from bs4 import BeautifulSoup
import networkx as nx
import re
from collections import defaultdict
import time
from typing import Dict, Set, List, Tuple

class WikiTechScraper:
    def __init__(self):
        self.base_url = "https://en.wikipedia.org"
        self.session = requests.Session()
        self.graph = nx.DiGraph()
        self.visited_pages = set()
        self.relationship_keywords = {
            'inspired': ['inspired by', 'based on', 'influenced by', 'derived from'],
            'prerequisite': ['required', 'necessary', 'needed', 'dependent on', 'relies on'],
            'component': ['consists of', 'contains', 'uses', 'incorporates', 'integrated'],
            'improvement': ['improved', 'enhanced', 'advanced', 'developed from', 'evolution of']
        }
        
    def get_page_content(self, url: str) -> BeautifulSoup:
        """Fetch and parse a Wikipedia page."""
        response = self.session.get(url)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
        
    def extract_year(self, text: str) -> int:
        """Extract year from text using regex."""
        year_match = re.search(r'\b(1\d{3}|20[0-2]\d)\b', text)
        return int(year_match.group()) if year_match else None
        
    def find_relationships(self, text: str) -> List[Tuple[str, str]]:
        """Find technological relationships in text."""
        relationships = []
        
        for rel_type, keywords in self.relationship_keywords.items():
            for keyword in keywords:
                # Look for patterns like "X was inspired by Y" or "Y inspired X"
                pattern = rf'([\w\s]+)\s+{keyword}\s+([\w\s]+)'
                matches = re.finditer(pattern, text.lower())
                
                for match in matches:
                    tech1 = match.group(1).strip()
                    tech2 = match.group(2).strip()
                    relationships.append((tech1, tech2, rel_type))
                    
        return relationships
        
    def analyze_page(self, url: str, depth: int = 0, max_depth: int = 2):
        """Recursively analyze a Wikipedia page and its linked pages."""
        if depth > max_depth or url in self.visited_pages:
            return
            
        print(f"Analyzing page: {url}")
        self.visited_pages.add(url)
        
        try:
            soup = self.get_page_content(url)
            
            # Get the main content
            content = soup.find('div', {'id': 'mw-content-text'})
            if not content:
                return
                
            # Extract text and find relationships
            text = content.get_text()
            relationships = self.find_relationships(text)
            
            # Add nodes and edges to the graph
            for tech1, tech2, rel_type in relationships:
                self.graph.add_edge(tech1, tech2, relationship=rel_type)
            
            # Find relevant links to other technology pages
            for link in content.find_all('a'):
                href = link.get('href', '')
                if href.startswith('/wiki/') and ':' not in href:
                    # Skip disambiguation and category pages
                    if any(x in href.lower() for x in ['disambiguation', 'category:', 'file:', 'help:']):
                        continue
                        
                    next_url = self.base_url + href
                    self.analyze_page(next_url, depth + 1, max_depth)
                    
            # Be nice to Wikipedia's servers
            time.sleep(1)
            
        except Exception as e:
            print(f"Error analyzing {url}: {str(e)}")
            
    def get_technology_timeline(self) -> Dict[int, Set[str]]:
        """Create a timeline of technologies based on extracted years."""
        timeline = defaultdict(set)
        
        for node in self.graph.nodes():
            year = self.extract_year(node)
            if year:
                timeline[year].add(node)
                
        return dict(sorted(timeline.items()))
        
    def export_graph(self, filename: str):
        """Export the relationship graph to a GraphML file."""
        nx.write_graphml(self.graph, filename)
        
    def print_summary(self):
        """Print a summary of the analyzed technology relationships."""
        print(f"\nAnalysis Summary:")
        print(f"Total technologies found: {self.graph.number_of_nodes()}")
        print(f"Total relationships found: {self.graph.number_of_edges()}")
        
        print("\nRelationship types:")
        relationship_counts = defaultdict(int)
        for _, _, data in self.graph.edges(data=True):
            relationship_counts[data.get('relationship', 'unknown')] += 1
            
        for rel_type, count in relationship_counts.items():
            print(f"- {rel_type}: {count}")
            
def main():
    scraper = WikiTechScraper()
    
    # Start with some seed pages
    seed_pages = [
        "https://en.wikipedia.org/wiki/History_of_technology",
        "https://en.wikipedia.org/wiki/Timeline_of_historic_inventions",
    ]
    
    for page in seed_pages:
        scraper.analyze_page(page, max_depth=2)
        
    # Export results
    scraper.export_graph("tech_relationships.graphml")
    scraper.print_summary()
    
    # Print timeline
    timeline = scraper.get_technology_timeline()
    print("\nTechnology Timeline:")
    for year, techs in timeline.items():
        print(f"{year}: {', '.join(techs)}")

if __name__ == "__main__":
    main()