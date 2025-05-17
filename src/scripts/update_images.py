import os
import requests
import re
from urllib.parse import unquote
from airtable import Airtable
from dotenv import load_dotenv
import time
from typing import Union
from PIL import Image
import io
import hashlib
import argparse

# --- Configuration ---
load_dotenv(dotenv_path='.env.local')
AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_NAME = "Innovations" # Make sure this matches your table name
IMAGE_URL_FIELD = "Image URL"       # The field containing Wikimedia image URLs
CREDITS_FIELD = "Image credits"     # The field to store the text credits
CREDITS_URL_FIELD = "Image credits URL" # The field to store the credit source URL
LOCAL_IMAGE_FIELD = "Local image"   # New field to store the local image path

# Wikimedia API constants
WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php"
FETCH_TIMEOUT = 10 # seconds
REQUEST_DELAY = 0.5 # seconds between API calls to be polite

# Image processing constants
IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'tech-images')
IMAGE_SIZE = (160, 160)
IMAGE_QUALITY = 75

# Create a session with proper headers
session = requests.Session()
session.headers.update({
    'User-Agent': 'TechTree/1.0 (https://historicaltechtree.com; etienne@historicaltechtree.com) Python/3.x',
    'Accept': 'image/webp,image/*,*/*;q=0.8'
})

# Ensure images directory exists
os.makedirs(IMAGES_DIR, exist_ok=True)

# Add tech-images to .gitignore if not already there
GITIGNORE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.gitignore')
if os.path.exists(GITIGNORE_PATH):
    with open(GITIGNORE_PATH, 'r') as f:
        gitignore_content = f.read()
    
    if 'public/tech-images' not in gitignore_content:
        with open(GITIGNORE_PATH, 'a') as f:
            f.write('\n# Local tech images\npublic/tech-images/\n')
else:
    with open(GITIGNORE_PATH, 'w') as f:
        f.write('# Local tech images\npublic/tech-images/\n')

# --- Helper Functions ---

def download_and_optimize_image(url: str, title: str) -> Union[str, None]:
    """Downloads and optimizes an image, returns the local path."""
    try:
        # Generate a filename from the title
        safe_title = re.sub(r'[^a-z0-9]', '-', title.lower())
        filename = f"{safe_title}.webp"
        local_path = os.path.join(IMAGES_DIR, filename)

        # Skip if image already exists
        if os.path.exists(local_path):
            print(f"    Image already exists: {filename}")
            return f"/tech-images/{filename}"

        # Download the image using the session
        response = session.get(url, timeout=FETCH_TIMEOUT)
        response.raise_for_status()

        # Open and optimize the image
        img = Image.open(io.BytesIO(response.content))
        
        # Convert to RGB if necessary (for PNG with transparency)
        if img.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize and save as WebP
        img.thumbnail(IMAGE_SIZE, Image.Resampling.LANCZOS)
        img.save(local_path, 'WEBP', quality=IMAGE_QUALITY)

        print(f"    Downloaded and optimized: {filename}")
        return f"/tech-images/{filename}"

    except Exception as e:
        print(f"    Error processing image: {e}")
        return None

def extract_filename_from_url(url: str) -> Union[str, None]:
    """Extracts the filename from various Wikimedia URL formats."""
    if not url or 'wikimedia.org' not in url:
        return None
    try:
        # Decode URL encoding first
        decoded_url = unquote(url)

        # Match common patterns like /commons/a/ab/Filename.jpg or /commons/thumb/a/ab/Filename.jpg/120px-Filename.jpg
        match = re.search(r'\/([^\/]+?)(?:\/\d+px-[^\/]+)?$', decoded_url)
        if match:
            filename = match.group(1)
            # Remove any query parameters (e.g., ?timestamp=...)
            filename = filename.split('?')[0]
            # Sometimes the filename itself is duplicated in thumb URLs, remove the size prefix if present
            filename = re.sub(r'^\d+px-', '', filename)
            return filename
    except Exception as e:
        print(f"    Error parsing filename from URL {url}: {e}")
    return None


def get_wikimedia_credits(filename: str) -> Union[dict, None]:
    """Fetches image credits from Wikimedia Commons API."""
    params = {
        "action": "query",
        "prop": "imageinfo",
        "iiprop": "extmetadata",
        "format": "json",
        "titles": f"File:{filename}",
        "origin": "*" # Required for CORS
    }
    try:
        response = session.get(WIKIMEDIA_API_URL, params=params, timeout=FETCH_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        pages = data.get("query", {}).get("pages", {})
        if not pages:
            print(f"    No pages found for File:{filename}")
            return None

        page_id = list(pages.keys())[0]
        if page_id == "-1": # File does not exist
             print(f"    File:{filename} does not exist on Commons.")
             return None

        page_data = pages[page_id]
        imageinfo = page_data.get("imageinfo", [{}])[0]
        metadata = imageinfo.get("extmetadata", {})

        if not metadata:
             print(f"    No extmetadata found for File:{filename}")
             return None # No metadata found

        # Extract metadata fields
        image_title = metadata.get("ImageDescription", {}).get("value")
        artist = metadata.get("Artist", {}).get("value")
        license_short = metadata.get("LicenseShortName", {}).get("value")
        license_long = metadata.get("License", {}).get("value") # Fallback
        description_url = metadata.get("DescriptionUrl", {}).get("value")
        date_original = metadata.get("DateTimeOriginal", {}).get("value")

        # Clean up artist field (sometimes contains HTML)
        if artist:
            artist = re.sub('<[^<]+?>', '', artist).strip()

        # Clean up image title (sometimes contains HTML)
        if image_title:
            image_title = re.sub('<[^<]+?>', '', image_title).strip()
        else:
            # Fallback to filename if no description
            image_title = filename.replace('_', ' ')

        # Extract year from date_original if available
        year_created = None
        if date_original:
            # Search for a 4-digit year
            year_match = re.search(r'\b(\d{4})\b', date_original)
            if year_match:
                year_created = year_match.group(1)

        # Prefer short license name, fallback to long name or None
        license = license_short if license_short else license_long

        # Construct the desired credits string
        credits_parts = []
        if image_title:
            credits_parts.append(f'"{image_title}"') # Add quotes around title
        if artist:
            credits_parts.append(f"by {artist}")
        if year_created:
            credits_parts.append(f"{year_created}")
        if license:
            credits_parts.append(f"licensed under {license}")

        # Add the static part
        if credits_parts: # Only add 'via...' if there are other credits
            credits_parts.append("via Wikimedia Commons")
            credits_text = ", ".join(credits_parts)
        else:
            credits_text = None # No meaningful credits found

        # Construct the Wikimedia Commons file page URL
        commons_url = f"https://commons.wikimedia.org/wiki/File:{filename}"

        return {
            "credits": credits_text,
            "url": commons_url # Always return the constructed Commons URL
        }

    except requests.exceptions.RequestException as e:
        print(f"    Error fetching credits for File:{filename}: {e}")
        return None
    except Exception as e:
        print(f"    Error processing credits for File:{filename}: {e}")
        return None


# --- Main Script ---

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Update images from Airtable records.')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', help='Update all images, including those that already have a local image')
    group.add_argument('--new', action='store_true', help='Update only records that have no local image')
    
    args = parser.parse_args()

    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        print("Error: AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in .env file")
        return

    print(f"Connecting to Airtable Base ID: {AIRTABLE_BASE_ID}, Table: {AIRTABLE_TABLE_NAME}")
    try:
        airtable = Airtable(AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, AIRTABLE_API_KEY)
        print("Fetching records...")
        # First, try to get the fields to check if Local image exists
        try:
            fields = [IMAGE_URL_FIELD, CREDITS_FIELD, CREDITS_URL_FIELD, LOCAL_IMAGE_FIELD, "Name"]
            records = airtable.get_all(fields=fields, max_records=1)
            
            # Debug: Print available fields from first record
            if records:
                print("\nAvailable fields in first record:")
                for field in records[0].get('fields', {}).keys():
                    print(f"  - {field}")
        except Exception as e:
            if 'UNKNOWN_FIELD_NAME' in str(e):
                print("Note: 'Local image' field not found in Airtable. Please add it first.")
                return
            else:
                raise e

        # Fetch records based on the selected mode
        if args.new:
            # Only fetch records without local images
            records = airtable.get_all(
                fields=fields,
                formula=f"AND({{Image URL}} != '', {{Local image}} = '')"
            )
            print(f"Found {len(records)} records without local images.")
        else:  # args.all
            # Fetch all records with an image URL
            records = airtable.get_all(
                fields=fields,
                formula=f"{{Image URL}} != ''"
            )
            print(f"Found {len(records)} records with image URLs.")

    except Exception as e:
        print(f"Error connecting to or fetching from Airtable: {e}")
        return

    updates = []
    processed_count = 0
    updated_count = 0
    skipped_count = 0
    error_count = 0

    for record in records:
        processed_count += 1
        record_id = record['id']
        image_url = record.get('fields', {}).get(IMAGE_URL_FIELD)
        title = record.get('fields', {}).get('Name', '')
        current_local = record.get('fields', {}).get(LOCAL_IMAGE_FIELD)

        print(f"\nProcessing record {processed_count}/{len(records)}: {record_id}")
        print(f"  Title: {title}")
        print(f"  Image URL: {image_url}")
        if current_local:
            print(f"  Current local image: {current_local}")

        # Skip if no image URL or if it doesn't look like a Wikimedia URL
        if not image_url or 'wikimedia.org' not in image_url:
            print("  Skipping: No valid Wikimedia URL found.")
            skipped_count += 1
            continue

        # Skip if no title
        if not title:
            print("  Skipping: No title found for the record.")
            skipped_count += 1
            continue

        filename = extract_filename_from_url(image_url)
        if not filename:
            print("  Skipping: Could not extract filename from URL.")
            skipped_count += 1
            continue

        print(f"  Extracted filename: {filename}")
        credits_data = get_wikimedia_credits(filename)

        # Download and optimize the image
        local_image_path = download_and_optimize_image(image_url, title)

        if credits_data or local_image_path:
            update_payload = {}
            needs_update = False

            if credits_data:
                if credits_data.get("credits"):
                    update_payload[CREDITS_FIELD] = credits_data["credits"]
                    needs_update = True
                    print(f"    -> Credits: {credits_data['credits']}")
                if credits_data.get("url"):
                    update_payload[CREDITS_URL_FIELD] = credits_data["url"]
                    needs_update = True
                    print(f"    -> Credits URL: {credits_data['url']}")

            if local_image_path and LOCAL_IMAGE_FIELD in fields:
                # In --all mode, only update if the local image path is different
                if args.all and current_local == local_image_path:
                    print("  Skipping: Local image is already up to date.")
                    skipped_count += 1
                    continue
                update_payload[LOCAL_IMAGE_FIELD] = local_image_path
                needs_update = True
                print(f"    -> Local image: {local_image_path}")

            if needs_update:
                updates.append({
                    "id": record_id,
                    "fields": update_payload
                })
                updated_count += 1
                print("  Added to batch update.")
            else:
                print("  Skipping update: No new info found.")
                skipped_count += 1
        else:
            error_count += 1
            print("  Skipping: Error fetching or processing data.")

        time.sleep(REQUEST_DELAY)

        # Send batch updates every 10 records
        if len(updates) >= 10:
            print("\n--- Sending batch update ---")
            try:
                airtable.batch_update(updates)
                print(f"--- Batch update successful ({len(updates)} records) ---")
                updates = []
            except Exception as e:
                print(f"--- Batch update failed: {e} ---")
                error_count += len(updates)
                updates = []

    # Send any remaining updates
    if updates:
        print("\n--- Sending final batch update ---")
        try:
            airtable.batch_update(updates)
            print(f"--- Final batch update successful ({len(updates)} records) ---")
        except Exception as e:
            print(f"--- Final batch update failed: {e} ---")
            error_count += len(updates)

    print("\n--- Script Finished ---")
    print(f"Total Records Processed: {processed_count}")
    print(f"Records Updated: {updated_count}")
    print(f"Records Skipped: {skipped_count}")
    print(f"Errors: {error_count}")

if __name__ == "__main__":
    main()