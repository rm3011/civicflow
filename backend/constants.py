# backend/constants.py
PROBLEM_TYPES = frozenset({
    "road_damage",
    "water_leakage",
    "drainage",
    "sewage",
    "garbage",
    "streetlight",
    "electricity",
    "traffic",
    "construction",
    "public_health",
    "other",
})

DEPARTMENTS = [
    {"id": "buildings", "name": "Buildings", "name_ta": "கட்டிடங்கள்", "name_hi": "भवन", "icon": "🏗️", "handles_complaints": True},
    {"id": "bridges", "name": "Bridges", "name_ta": "பாலங்கள்", "name_hi": "पुल", "icon": "🌉", "handles_complaints": True},
    {"id": "swm", "name": "Solid Waste Management", "name_ta": "திடக்கழிவு மேலாண்மை", "name_hi": "ठोस अपशिष्ट प्रबंधन", "icon": "🗑️", "handles_complaints": True},
    {"id": "storm_water", "name": "Storm Water Drain", "name_ta": "மழைநீர் வடிகால்", "name_hi": "वर्षा जल नाली", "icon": "🌊", "handles_complaints": True},
    {"id": "bus_roads", "name": "Bus Route Roads", "name_ta": "பஸ் வழித்தட சாலைகள்", "name_hi": "बस मार्ग सड़कें", "icon": "🛣️", "handles_complaints": True},
    {"id": "electrical", "name": "Electrical", "name_ta": "மின்சாரம்", "name_hi": "विद्युत", "icon": "💡", "handles_complaints": True},
    {"id": "mechanical", "name": "Mechanical Engineering", "name_ta": "இயந்திர பொறியியல்", "name_hi": "मैकेनिकल इंजीनियरिंग", "icon": "⚙️", "handles_complaints": False},
    {"id": "works", "name": "Works", "name_ta": "பணிகள்", "name_hi": "कार्य", "icon": "🔧", "handles_complaints": True},
    {"id": "special_projects", "name": "Special Projects", "name_ta": "சிறப்பு திட்டங்கள்", "name_hi": "विशेष परियोजनाएं", "icon": "⭐", "handles_complaints": False},
    {"id": "quality_control", "name": "Quality Control", "name_ta": "தர கட்டுப்பாடு", "name_hi": "गुणवत्ता नियंत्रण", "icon": "✅", "handles_complaints": False},
    {"id": "revenue", "name": "Revenue", "name_ta": "வருவாய்", "name_hi": "राजस्व", "icon": "🧾", "handles_complaints": False},
    {"id": "public_health", "name": "Public Health", "name_ta": "பொது சுகாதாரம்", "name_hi": "जन स्वास्थ्य", "icon": "🏥", "handles_complaints": True},
    {"id": "gen_admin", "name": "General Administration", "name_ta": "பொது நிர்வாகம்", "name_hi": "सामान्य प्रशासन", "icon": "📋", "handles_complaints": False},
    {"id": "education", "name": "Education", "name_ta": "கல்வி", "name_hi": "शिक्षा", "icon": "📚", "handles_complaints": True},
    {"id": "parks", "name": "Parks & Playfields", "name_ta": "பூங்காக்கள்", "name_hi": "पार्क और खेल के मैदान", "icon": "🌳", "handles_complaints": True},
    {"id": "town_planning", "name": "Town Planning", "name_ta": "நகர திட்டமிடல்", "name_hi": "नगर नियोजन", "icon": "📐", "handles_complaints": False},
    {"id": "veterinary", "name": "Veterinary", "name_ta": "கால்நடை", "name_hi": "पशु चिकित्सा", "icon": "🐾", "handles_complaints": False},
    {"id": "fire", "name": "Fire Service", "name_ta": "தீயணைப்பு", "name_hi": "अग्निशमन", "icon": "🔥", "handles_complaints": False},
    {"id": "police", "name": "Police", "name_ta": "காவல்துறை", "name_hi": "पुलिस", "icon": "👮", "handles_complaints": False},
    {"id": "tangedco", "name": "TANGEDCO", "name_ta": "டான்ஜெட்கோ", "name_hi": "टैंगेडको", "icon": "⚡", "handles_complaints": True},
    {"id": "metro_water", "name": "Metro Water (CMWSSB)", "name_ta": "மெட்ரோ நீர்", "name_hi": "मेट्रो जल", "icon": "💧", "handles_complaints": True},
    {"id": "highways", "name": "Highways", "name_ta": "நெடுஞ்சாலைகள்", "name_hi": "राजमार्ग", "icon": "🛤️", "handles_complaints": True},
    {"id": "health", "name": "Health", "name_ta": "சுகாதாரம்", "name_hi": "स्वास्थ्य", "icon": "🩺", "handles_complaints": True},
]

# GCC verifies the 15-zone count; the named list is the existing project zone map.
# Source: https://chennaicorporation.gov.in/gcc/council/about-council/
CHENNAI_ZONES = [
    {"id": 1, "name": "Tiruvottiyur", "name_ta": "திருவொற்றியூர்", "name_hi": "तिरुवोट्टियूर", "region": "North"},
    {"id": 2, "name": "Manali", "name_ta": "மணலி", "name_hi": "मनाली", "region": "North"},
    {"id": 3, "name": "Madhavaram", "name_ta": "மாதவரம்", "name_hi": "माधवरम", "region": "North"},
    {"id": 4, "name": "Tondiarpet", "name_ta": "தண்டையார்பேட்டை", "name_hi": "टोंडियारपेट", "region": "North"},
    {"id": 5, "name": "Royapuram", "name_ta": "ராயபுரம்", "name_hi": "रोयापुरम", "region": "North"},
    {"id": 6, "name": "Thiru-Vi-Ka Nagar", "name_ta": "திரு-வி-கா நகர்", "name_hi": "थिरु-वि-का नगर", "region": "Central"},
    {"id": 7, "name": "Ambattur", "name_ta": "அம்பத்தூர்", "name_hi": "अंबात्तूर", "region": "Central"},
    {"id": 8, "name": "Anna Nagar", "name_ta": "அண்ணா நகர்", "name_hi": "अन्ना नगर", "region": "Central"},
    {"id": 9, "name": "Teynampet", "name_ta": "தேனாம்பேட்டை", "name_hi": "तेयनमपेट", "region": "Central"},
    {"id": 10, "name": "Kodambakkam", "name_ta": "கோடம்பாக்கம்", "name_hi": "कोडंबक्कम", "region": "South"},
    {"id": 11, "name": "Valasaravakkam", "name_ta": "வளசரவாக்கம்", "name_hi": "वलसरवक्कम", "region": "South"},
    {"id": 12, "name": "Alandur", "name_ta": "ஆலந்தூர்", "name_hi": "आलंदूर", "region": "South"},
    {"id": 13, "name": "Adyar", "name_ta": "அடையாறு", "name_hi": "अड्यार", "region": "South"},
    {"id": 14, "name": "Perungudi", "name_ta": "பெருங்குடி", "name_hi": "पेरुंगुडी", "region": "South"},
    {"id": 15, "name": "Sholinganallur", "name_ta": "சோழிங்கநல்லூர்", "name_hi": "शोलिंगनल्लूर", "region": "South"},
]


# These are district revenue divisions, not corporation zones.
# Source: https://chengalpattu.nic.in/administrative-setup/revenue-administration/
CHENGALPATTU_AREAS = [
    {"id": 101, "name": "Chengalpattu", "name_ta": "செங்கல்பட்டு", "name_hi": "चेंगलपट्टू"},
    {"id": 103, "name": "Madurantakam", "name_ta": "மதுராந்தகம்", "name_hi": "मदுரंतकम"},
    {"id": 102, "name": "Tambaram", "name_ta": "தாம்பரம்", "name_hi": "तांबरम"},
]

# These are district revenue divisions, not corporation zones.
# Source: https://kancheepuram.nic.in/about-district/administrative-setup/revenue-administration/
KANCHEEPURAM_AREAS = [
    {"id": 201, "name": "Kancheepuram", "name_ta": "காஞ்சிபுரம்", "name_hi": "कांचीपुरम"},
    {"id": 204, "name": "Sriperumbudur", "name_ta": "ஸ்ரீபெரும்புதூர்", "name_hi": "श्रीपेरुम्बुदूर"},
]

DISTRICTS = [
    {"id": "chennai", "name": "Chennai", "name_ta": "சென்னை", "name_hi": "चेन्नई"},
    {"id": "chengalpattu", "name": "Chengalpattu", "name_ta": "செங்கல்பட்டு", "name_hi": "चेंगलपट्टू"},
    {"id": "kancheepuram", "name": "Kancheepuram", "name_ta": "காஞ்சிபுரம்", "name_hi": "कांचीपुरम"},
]