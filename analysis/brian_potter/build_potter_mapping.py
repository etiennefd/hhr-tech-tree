"""
Build a Potter <-> tech-tree mapping CSV for the 190 inventions in
Brian Potter's "How Long Do We Wait For New Inventions?" analysis.

Source: https://github.com/briancpotter/inventiondating (inventions_full_analysis.docx)

Outputs (in this folder):
  - potter_records.json   : raw parsed records from Potter's docx (190 entries)
  - potter_mapping.csv    : Potter <-> tree mapping with gap analysis

Run from anywhere; paths are relative to this script.
"""
import json, re, csv, os, sys, zipfile, urllib.request
from collections import defaultdict
from xml.etree import ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..'))
TREE_PATH = os.path.join(REPO, 'src/app/api/inventions/techtree-data.json')
DOCX_URL = 'https://raw.githubusercontent.com/briancpotter/inventiondating/main/inventions_full_analysis.docx'
DOCX_LOCAL = os.path.join(HERE, 'potter_full_analysis.docx')
RECORDS_JSON = os.path.join(HERE, 'potter_records.json')
MAPPING_CSV = os.path.join(HERE, 'potter_mapping.csv')

WNS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}


def fetch_docx():
    if not os.path.exists(DOCX_LOCAL):
        print(f'Downloading {DOCX_URL} ...')
        urllib.request.urlretrieve(DOCX_URL, DOCX_LOCAL)


def parse_docx():
    with zipfile.ZipFile(DOCX_LOCAL) as z:
        xml = z.read('word/document.xml').decode('utf-8')
    root = ET.fromstring(xml)
    paragraphs = []
    for p in root.iter(f'{WNS}p'):
        pstyle = ''
        pPr = p.find('w:pPr', NS)
        if pPr is not None:
            ps = pPr.find('w:pStyle', NS)
            if ps is not None:
                pstyle = ps.get(f'{WNS}val', '')
        text = ''.join(t.text or '' for t in p.iter(f'{WNS}t'))
        paragraphs.append((pstyle, text))

    records, current = [], None
    for s, t in paragraphs:
        if s == 'Heading2' and re.match(r'^\d+\.\s', t):
            if current:
                records.append(current)
            m = re.match(r'^(\d+)\.\s+(.+)$', t)
            current = {'num': int(m.group(1)), 'name': m.group(2).strip(), 'raw': []}
        elif current is not None:
            current['raw'].append((s, t))
    if current:
        records.append(current)

    def parse(rec):
        for s, t in rec['raw']:
            m = re.match(r'Year actually invented:\s*(-?\d+)', t)
            if m and 'year' not in rec:
                rec['year'] = int(m.group(1))
            m = re.match(r'Earliest plausible:\s*(.+)', t)
            if m: rec['plausible'] = m.group(1).strip()
            m = re.match(r'Earliest straightforward:\s*(.+)', t)
            if m: rec['straightforward'] = m.group(1).strip()
            m = re.match(r'Confidence:\s*(.+)', t)
            if m: rec['confidence'] = m.group(1).strip()
    for r in records:
        parse(r)
    clean = [{k: v for k, v in r.items() if k != 'raw'} for r in records]
    with open(RECORDS_JSON, 'w') as f:
        json.dump(clean, f, indent=2)
    return clean


def parse_year_range(s):
    """Return earliest year of the range (negative for BC), or None for Flag/N/A/empty."""
    if not s: return None
    sl = s.strip().lower()
    if not sl or sl.startswith('flag') or sl.startswith('n/a'):
        return None
    s2 = s.replace('–', '-').replace('—', '-')
    # BC handling
    bc_match = re.search(r'(\d+)\s*BC', s2, re.I)
    if bc_match:
        return -int(bc_match.group(1))
    nums = re.findall(r'-?\d+', s2)
    if not nums: return None
    return int(nums[0])


# Hand-curated Potter -> tree node title mapping.
# Built by searching tree titles + subtitles. None = no tree match.
MAPPING = {
    'Voltaic Pile': 'Voltaic pile',
    'Arc Lamp': 'Arc lamp',
    'Isolation of morphine': 'Morphine',
    'Jacquard Loom': 'Jacquard loom',
    'High-pressure steam locomotive': 'Steam locomotive',
    'General anaesthetic': 'Surgery under anesthesia',
    'Internal combustion engine "Pyreolophore"': 'Motorboat',
    'Commercial steamboat': 'Steamboat transport',
    'Canning process': 'Canning',
    'Wrist Watch': 'Wristwatch',
    'Cylinder steam printing press': 'Powered printing press',
    'Safety lamp': 'Safety lamp',
    'Planing machine': 'Planer',
    'Stethoscope': 'Stethoscope',
    'Electric telegraph': 'Electric telegraph',
    'Stirling hot air engine': 'Stirling engine',
    'Dandy horse': 'Dandy horse',
    'Tunneling shield': 'Tunnelling shield',
    'Pattern-tracing lathe': 'Pattern-tracing lathe',
    'Heliography': 'Photoengraving',
    'Difference engine': 'Difference engine',
    "First lighter (Doberiner's Lamp)": "Döbereiner's lamp",
    'Bolt-action rifle': 'Bolt-action rifle',
    'Electromagnet': 'Electromagnet',
    'Friction match': 'Friction match',
    'Gas Stove': 'Gas stove',
    'Hot-blast iron smelting': 'Hot blast',
    'Reaping machine': 'Reaping machine',
    'Commutated electrocmagnetic motor': 'Commutated rotary electric motor',
    'Braile Tactile alphabet': 'Braille',
    'Compound air compressor': None,
    'Corrugated galvanized iron': 'Corrugated iron',
    'Lawn mower': 'Lawn mower',
    'Electromagnetic induction': 'Electromagnetic induction',
    'First practical rotating electric motor': 'Electric motor',
    'Electromechanical relay': 'Electromechanical relay',
    'Morse Code': 'Morse code',
    'Electrotyping': 'Electrotyping',
    'Steam Shovel': 'Steam shovel',
    'Steam Hammer': 'Steam hammer',
    'Photovoltaic effect': 'Photovoltaic effect',
    'Vulcanized Rubber': 'Vulcanized rubber',
    'Daguerrotype': 'Daguerreotype',
    '"Blueprint" (cyanotype) process': 'Blueprint',
    'Printing telegraph': 'Recording telegraph',
    'Fuel Cell': 'Fuel cell',
    'Super-phosphate fertilizer': 'Superphosphate',
    'Wood-pulp paper': 'Mechanical wood pulping',
    'Hypodermic needle': 'Hypodermic needle',
    'Modern high-strength Portland cement': 'Modern Portland cement',
    'Tunnel-boring machine': 'Tunnel boring machine',
    'Nitroglycerin': 'Nitroglycerin',
    'Pneumatic drill': 'Pneumatic drill',
    'Pin-tumbler cylinder Lock': 'Yale pin-tumbler lock',
    'Metallic-cartridge repeating rifle': None,
    'Francis water turbine': 'Francis turbine',
    'Safety pin': 'Safety pin',
    'Hydraulic accumulator': 'Hydraulic accumulator',
    'Public flush toilet': 'Public flush toilet',
    'Chemical-vapor deposition': 'Chemical vapor deposition',
    'Safety-brake elevator': 'Safety elevator',
    'Powered dirigible flight': 'Dirigible',
    'Reinforced concrete': 'Reinforced concrete',
    'Practical three-color photography': 'Color photography',
    'Bessemer Steel Process': 'Bessemer process',
    'Parkesine/celluoid': 'Parkesine',
    'Vapour-compression ice machine': 'Vapor-compression refrigeration system',
    'Mauveine synthetic dye': 'Synthetic dye',
    'Geissler tube': 'Geissler tube',
    'Phonautograph': 'Phonautograph',
    'Lead-acid rechargeable battery': 'Rechargeable battery',
    'Carbon fiber': 'Carbon fibers',
    'Pasteurization': 'Pasteurization',
    'Siemens-martin open-hearth steel process': 'Siemens–Martin process',
    'Dynamite': 'Dynamite',
    'Barbed wire': 'Barbed wire',
    'PVC': 'Vinyl',
    'Early "stainless" steel': 'Tool steel and air-hardening steel',
    'Rotary cement kiln': 'Rotary kiln',
    'Crookes radiometer': 'Crookes radiometer',
    'Gramme dynamo': 'Electric generator',
    'Metal detector': None,
    'Electric tram': 'Electric tram',
    'Four-stroke engine': 'Four-stroke engine',
    'Telephone': 'Telephone',
    'Phonograph': 'Phonograph',
    'Closed-circuit rebreather': 'Rebreather',
    'Pelton Wheel': 'Pelton wheel',
    'Incandescent light bulb': 'Light bulb',
    'Carbon arc welding': 'Carbon arc welding',
    'Recoil-operated machine gun': 'Automatic machine gun',
    'Poudre B Smokeless powder': 'Smokeless gunpowder',
    'Steam turbine': 'Steam turbine',
    'Closed core transformer': 'Closed-core transformer',
    'Safety bicycle': 'Safety bicycle',
    'Zinc-carbon dry cell': 'Dry cell',
    'Hall-Heroult process': 'Hall–Héroult process',
    'Petrol automobile': 'Automobile',
    'Bayer alumina process': 'Bayer process',
    'Wind-generated electricity': 'Wind turbine',
    'Gold cyanidation': 'Gold cyanidation',
    'Ballpoint pen': 'Ballpoint pen',
    'Kinetoscope motion picture viewer': 'Kinetoscope',
    'Experimental proof of radio waves': 'Radio waves and spark-gap transmitter',
    'Practical pneumatic tyre': 'Pneumatic tire',
    'Chlorofluorocarbon refrigerant': 'Chlorofluorocarbons',
    'Pre-cut folding cardboard box': 'Pre-cut cardboard box',
    'Zipper': 'Zipper',
    'Cinematograph': 'Cinematograph',
    'Electric oven': 'Electric stove',
    'Compression "diesel" engine': 'Diesel engine',
    'Rubber surgical gloves': None,
    'Wireless telegraphy': 'Wireless telegraphy',
    'X-ray': 'X-ray',
    'Cloth surgical mask': None,
    'Polyethylene': 'Polyethylene',
    'Nickel cadmium rechargeable battery': 'Nickel–cadmium battery',
    'Zeppelin LZ-1 Rigid airship': 'Zeppelin',
    'Powered suction vacuum cleaner': 'Powered vacuum cleaner',
    'First self-sustaining gas turbine': 'Gas turbine',
    'Laminated safety glass': 'Laminated glass',
    'First sustained, controlled powered flight': 'Airplane',
    'Fleming valve': 'Thermionic diode',
    'First free helicopter flight': 'Cornu helicopter',
    'Bakelite': 'Bakelite',
    'Ramjet concept': 'Ramjet',
    'Cellophane': 'Cellophane',
    'Haber-Bosch process': 'Haber process',
    'First static-image television transmission': None,
    'Cloud chamber': 'Cloud chamber',
    'Electric slot cars': None,
    'First articulated electric trams': 'Articulated tram',
    'Bergius high-pressure coal hydrogenation process': 'Bergius process',
    'Kaplan axial-flow adjustable blade turbine': 'Kaplan turbine',
    'Stainless Steel': 'Stainless steel',
    'First practical battle tanks': 'Tank',
    'Czocharlski crystal pulling': 'Czochralski method',
    'Crystal oscillator': 'Crystal oscillator',
    'Fischer-Tropsch coal-to-liquid process': 'Fischer–Tropsch process',
    'Yagi-Uda directional antenna': 'Yagi–Uda antenna',
    'Liquid fueled rocket launch': 'Liquid-propellant rocket',
    'Three-point hitch': 'Three-point hitch',
    'First public live-image television demo': 'Mechanical television',
    'Quartz Clock': 'Quartz clock',
    "Discovery of penicillin's antibiotic action": 'Penicillin',
    'Turbojet': 'Turbojet',
    'First practical all-electric television': 'Electronic television',
    'Recirculating ball screw': None,
    'Phase-contrast microscopy': 'Phase-contrast microscope',
    'Electron microscope': 'Electron microscope',
    'FM Radio': 'FM radio',
    'Lightweight folding wheelchair': None,
    'Nylon synthetic fiber': 'Nylon',
    'Programmable computer': 'Electromechanical programmable computer',
    'Nuclear fission': 'Nuclear fission',
    'Defibrilator': 'Defibrillator',
    'Plutonium isolation': 'Plutonium',
    'Cavity Magnetron': 'Cavity magnetron',
    'PET Fiber': 'Polyester',
    'V-2 (A-4) long-range ballistic missile': 'Ballistic missile',
    'Influenza vaccine': None,
    'Atomic bomb': 'Atomic bomb',
    'Microwave oven': 'Microwave oven',
    'Radiocarbon dating': 'Radiocarbon dating',
    'Ejector seat': 'Ejector seat',
    'Holography': 'Holography',
    'Hydraulic fracturing': 'Fracking',
    'Transistor': 'Transistor',
    'Atomic clock': 'Atomic clock',
    'Basic oxygen steelmaking': 'Basic oxygen steelmaking',
    '"Bertie the Brain" video game': 'Video game',
    'Tokamak fusion reactor concept': 'Tokamak',
    'Float glass process': 'Float glass',
    'Thermonuclear weapon': 'Hydrogen bomb',
    'Helical scan video tape recorder': 'Video tape recorder',
    'Silicon solar PV cell': 'Solar cell',
    'Hovercraft': 'Hovercraft',
    'Shipping container': 'Intermodal container',
    'Hard-disk drive': 'Hard disk drive',
    'Logic theorist AI program': None,
    'Laser/optical amplifier': 'Maser',
    'IBM 610 Single-use computer': None,
    'Sputnik artificial satellite': 'Artificial satellite',
    'Integrated circuit': 'Hybrid integrated circuit',
    'MOSFET Transistor': 'MOSFET',
    'First working laser': 'Laser',
    'Electronic cigarette': 'Electronic cigarette',
    'Shinkansen high-speed rail': 'High-speed rail',
    'Kevlar': 'Kevlar',
    'Packet-switched networks': 'Packet switching',
}

# FLAG cases: Potter declines to give a counterfactual date because the invention
# is the scientific phenomenon-discovery itself, or depends on an off-limits
# framework the rubric forbids the team from inventing. For each, we extract the
# specific binding phenomenon/framework date that Potter names in the body text.
# This lets us still compute a meaningful comparison number — "earliest plausible
# if we accept Potter's named off-limits phenomenon as given" — rather than NaN.
# Sources are quoted phrasings from Potter's docx explanation paragraphs.
FLAG_PHENOMENON = {
    'Voltaic Pile':                (1791, "Galvani's animal-electricity observations"),
    'Mauveine synthetic dye':      (None, "Serendipitous accident, unbounded; modern organic chemistry (post-1865) would also be needed"),
    'Experimental proof of radio waves': (1865, "Maxwell's electromagnetic theory"),
    'X-ray':                       (None, "Phenomenon-discovery; cathode-ray tubes (1870s) available, but discovery itself unforeseeable"),
    'Polyethylene':                (1920, "Staudinger macromolecule framework"),
    'Cloud chamber':               (1896, "Radioactivity (Becquerel)"),
    "Discovery of penicillin's antibiotic action": (None, "Serendipitous accident; phenomenon-discovery"),
    'Programmable computer':       (1936, "Church-Turing computability framework"),
    'Nuclear fission':             (None, "Phenomenon-discovery; off-limits"),
    'Plutonium isolation':         (1938, "Nuclear fission"),
    'Atomic bomb':                 (1938, "Nuclear fission"),
    'Microwave oven':              (1940, "Cavity magnetron (Randall & Boot) + Spencer accident"),
    'Atomic clock':                (1934, "Cleeton & Williams microwave spectroscopy + quantum mechanics"),
    'Tokamak fusion reactor concept': (1939, "Bethe stellar nucleosynthesis + plasma/MHD theory"),
    'Thermonuclear weapon':        (1945, "Working fission primary"),
}

# Edges treated as predecessors for the "all types" gap metric.
EXCLUDE_TYPES = {'Independently invented', 'Concurrent development'}


def build_mapping_csv():
    with open(RECORDS_JSON) as f:
        potter = json.load(f)
    with open(TREE_PATH) as f:
        tree = json.load(f)

    nodes_by_title = {n['title']: n for n in tree['nodes']}
    nodes_by_id = {n['id']: n for n in tree['nodes']}
    incoming = defaultdict(list)
    for link in tree['links']:
        incoming[link['target']].append(link)

    rows = []
    matched = unmatched = 0
    for p in potter:
        tree_title = MAPPING.get(p['name'])
        node = nodes_by_title.get(tree_title) if tree_title else None
        earliest = parse_year_range(p.get('plausible'))
        potter_gap = (p['year'] - earliest) if earliest is not None else ''

        if node:
            matched += 1
            preds = [link for link in incoming[node['id']] if link['type'] not in EXCLUDE_TYPES]
            pred_rows = []
            for link in preds:
                src = nodes_by_id.get(link['source'])
                if src:
                    pred_rows.append((src['year'], src['title'], link['type']))
            pred_rows.sort()
            if pred_rows:
                latest_y, latest_t, latest_type = max(pred_rows)
                tree_gap = node['year'] - latest_y
                binding = f"{latest_t} ({latest_y}) [{latest_type}]"
            else:
                tree_gap = ''
                binding = '(no in-edges)'
            date_diff = node['year'] - p['year']
        else:
            unmatched += 1
            tree_gap = binding = ''
            date_diff = ''

        flag_year, flag_phenom = FLAG_PHENOMENON.get(p['name'], (None, ''))
        flag_gap = (p['year'] - flag_year) if flag_year is not None else ''

        rows.append({
            'potter_num': p['num'],
            'potter_name': p['name'],
            'potter_year': p['year'],
            'potter_plausible': p.get('plausible', ''),
            'potter_straightforward': p.get('straightforward', ''),
            'potter_confidence': p.get('confidence', ''),
            'potter_gap': potter_gap,
            'flag_binding_year': flag_year if flag_year is not None else '',
            'flag_binding_phenomenon': flag_phenom,
            'flag_gap': flag_gap,
            'tree_title': node['title'] if node else '',
            'tree_subtitle': node.get('subtitle', '') if node else '',
            'tree_year': node['year'] if node else '',
            'tree_id': node['id'] if node else '',
            'date_diff_tree_minus_potter': date_diff,
            'tree_binding_predecessor': binding,
            'tree_gap': tree_gap,
        })

    fieldnames = list(rows[0].keys())
    with open(MAPPING_CSV, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f'Wrote {MAPPING_CSV}')
    print(f'  matched: {matched}/{len(potter)}, unmatched: {unmatched}')
    return rows


if __name__ == '__main__':
    fetch_docx()
    parse_docx()
    build_mapping_csv()
