import os
from dotenv import load_dotenv
import math
from pyairtable import Api

def load_data():
    # Load environment variables and Airtable connection
    load_dotenv('.env.local')
    api_key = os.getenv("AIRTABLE_API_KEY")
    base_id = os.getenv("AIRTABLE_BASE_ID")
    
    try:
        # Connect to Airtable using the recommended approach
        api = Api(api_key)
        base = api.base(base_id)
        
        # Get tables
        innovations_table = base.table("Innovations")
        connections_table = base.table("Connections")
        
        # Get all records
        innovations = innovations_table.all(view="Used for deployment, do not edit directly")
        connections = connections_table.all(view="Used for deployment, do not edit directly")
        
        # Filter inventions with dates
        valid_inventions = []
        for inv in innovations:
            try:
                date_value = inv['fields'].get('Date')
                if date_value and not math.isnan(float(date_value)):
                    valid_inventions.append(inv)
            except (ValueError, TypeError):
                # Skip if Date is not a valid number
                pass
        
        return valid_inventions, connections
    except Exception as e:
        print(f"Error loading data: {e}")
        import traceback
        traceback.print_exc()
        return [], []

def validate_data(inventions, connections):
    # Create lookup dictionary for inventions by ID and get all inventions (including undated)
    invention_dict = {inv['id']: inv for inv in inventions}
    
    # Get all innovations to look up names even for undated inventions
    try:
        api = Api(os.getenv("AIRTABLE_API_KEY"))
        base = api.base(os.getenv("AIRTABLE_BASE_ID"))
        all_innovations = base.table("Innovations").all(view="Used for deployment, do not edit directly")
        all_invention_dict = {inv['id']: inv for inv in all_innovations}
    except:
        all_invention_dict = invention_dict  # Fallback to dated inventions only
    
    # Track incoming and outgoing connections
    incoming_connections = {inv['id']: 0 for inv in inventions}
    outgoing_connections = {inv['id']: 0 for inv in inventions}
    
    # Results tracking
    issues = {
        'time_paradoxes': [],
        'no_image': [],
        'zero_outgoing': 0,
        'zero_incoming': 0,
        'orphans': [],
        'missing_endpoint': [],
        'undated_endpoint': []
    }
    
    # Check connections
    for conn in connections:
        # Use the ID field from fields if available
        connection_id = conn['fields'].get('ID', conn['id'])
        from_id = conn['fields'].get('From')
        to_id = conn['fields'].get('To')
        
        # Check for missing endpoints
        if not from_id or not to_id:
            # Get the name of the endpoint that is present
            present_id = from_id if from_id else to_id
            present_id = present_id[0] if isinstance(present_id, list) else present_id
            present_name = "Unknown"
            
            if present_id in all_invention_dict:
                present_name = all_invention_dict[present_id]['fields'].get('Name', 'Unknown')
            
            issues['missing_endpoint'].append({
                'id': connection_id,
                'missing': 'From' if not from_id else 'To',
                'present_name': present_name
            })
            continue
            
        # Handle array or string values
        from_id = from_id[0] if isinstance(from_id, list) else from_id
        to_id = to_id[0] if isinstance(to_id, list) else to_id
        
        # Get names for both endpoints if possible
        from_name = "Unknown"
        to_name = "Unknown"
        
        if from_id in all_invention_dict:
            from_name = all_invention_dict[from_id]['fields'].get('Name', 'Unknown')
        if to_id in all_invention_dict:
            to_name = all_invention_dict[to_id]['fields'].get('Name', 'Unknown')
        
        # Check if both endpoints exist in our valid inventions
        if from_id not in invention_dict or to_id not in invention_dict:
            # This means one of the endpoints is undated
            issues['undated_endpoint'].append({
                'id': connection_id,
                'from_id': from_id,
                'to_id': to_id,
                'from_name': from_name,
                'to_name': to_name,
                'undated': 'From' if from_id not in invention_dict else 'To'
            })
            continue
            
        # If we got here, both endpoints exist and are dated
        from_year = int(invention_dict[from_id]['fields']['Date'])
        to_year = int(invention_dict[to_id]['fields']['Date'])
        
        outgoing_connections[from_id] += 1
        incoming_connections[to_id] += 1
        
        # Check for time paradoxes
        if from_year > to_year:
            issues['time_paradoxes'].append({
                'id': connection_id,
                'from': invention_dict[from_id]['fields']['Name'],
                'from_year': from_year,
                'to': invention_dict[to_id]['fields']['Name'],
                'to_year': to_year
            })
    
    # Check for missing images and count connection issues
    for inv_id, inv in invention_dict.items():
        if not inv['fields'].get('Image URL'):
            issues['no_image'].append(inv['fields'].get('Name', 'Unknown'))

        has_outgoing = outgoing_connections[inv_id] > 0
        has_incoming = incoming_connections[inv_id] > 0

        if not has_outgoing:
            issues['zero_outgoing'] += 1

        if not has_incoming:
            issues['zero_incoming'] += 1

        # Orphans have neither incoming nor outgoing connections
        if not has_outgoing and not has_incoming:
            issues['orphans'].append(inv['fields'].get('Name', 'Unknown'))

    return issues

def main():
    inventions, connections = load_data()
    issues = validate_data(inventions, connections)
    
    # Print results
    print(f"Data Validation Results\n{'='*30}")
    
    print(f"Total dated inventions: {len(inventions)}")
    print(f"Total connections: {len(connections)}")
    
    print(f"\nTime paradoxes (From invention is later than To invention): {len(issues['time_paradoxes'])}")
    for paradox in issues['time_paradoxes']:
        print(f"  - Connection {paradox['id']}: {paradox['from']} ({paradox['from_year']}) → {paradox['to']} ({paradox['to_year']})")
    
    print(f"\nConnections missing an endpoint: {len(issues['missing_endpoint'])}")
    for conn in issues['missing_endpoint']:
        print(f"  - Connection {conn['id']} is missing {conn['missing']} endpoint, present endpoint: {conn['present_name']}")
    
    print(f"\nConnections with undated endpoints: {len(issues['undated_endpoint'])}")
    for conn in issues['undated_endpoint']:
        print(f"  - Connection {conn['id']} has undated {conn['undated']} endpoint: {conn['from_name']} → {conn['to_name']}")
    
    print(f"\nInventions with no outgoing connections: {issues['zero_outgoing']}")
    print(f"Inventions with no incoming connections: {issues['zero_incoming']}")

    print(f"\nOrphans (no incoming or outgoing connections): {len(issues['orphans'])}")
    for orphan in issues['orphans']:
        print(f"  - {orphan}")
    
    print(f"\nInventions with no Image URL: {len(issues['no_image'])}")
    for inv in issues['no_image']:
        print(f"  - {inv}")

if __name__ == "__main__":
    main()
