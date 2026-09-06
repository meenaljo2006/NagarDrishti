"""
Category mappings for infrastructure issues
"""

# Issue categories
CATEGORIES = {
    'pothole': {
        'id': 0,
        'name': 'Pothole',
        'department': 'roads',
        'keywords': ['pothole', 'crack', 'hole', 'road damage', 'broken road'],
        'severity': 'high'
    },
    'garbage': {
        'id': 1,
        'name': 'Garbage',
        'department': 'sanitation',
        'keywords': ['garbage', 'trash', 'waste', 'dump', 'litter'],
        'severity': 'medium'
    },
    'streetlight': {
        'id': 2,
        'name': 'Streetlight',
        'department': 'electricity',
        'keywords': ['streetlight', 'light', 'lamp', 'dark', 'pole'],
        'severity': 'medium'
    },
    'water_leakage': {
        'id': 3,
        'name': 'Water Leakage',
        'department': 'water',
        'keywords': ['water', 'leak', 'pipe', 'drain', 'flood'],
        'severity': 'high'
    },
    'road_damage': {
        'id': 4,
        'name': 'Road Damage',
        'department': 'roads',
        'keywords': ['damage', 'broken', 'repair', 'construction', 'barricade'],
        'severity': 'high'
    }
}

# Reverse mapping
CATEGORY_NAMES = {v['id']: k for k, v in CATEGORIES.items()}

# Get category by ID
def get_category_by_id(category_id):
    return CATEGORY_NAMES.get(category_id, 'other')

# Get category info
def get_category_info(category_name):
    return CATEGORIES.get(category_name, None)

# Get department for category
def get_department(category_name):
    info = get_category_info(category_name)
    return info['department'] if info else 'other'

# Get severity for category
def get_severity(category_name):
    info = get_category_info(category_name)
    return info['severity'] if info else 'medium'