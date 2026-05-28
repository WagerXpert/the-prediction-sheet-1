-- ================================================================
-- THE PREDICTION SHEET — CFB Seed Data (2026 Season)
-- Run this in your Supabase SQL Editor AFTER schema.sql
-- ================================================================

-- ── Conferences ──────────────────────────────────────────────────

INSERT INTO public.conferences (sport_id, external_id, name, abbreviation) VALUES
  ('cfb', 'SEC',  'Southeastern Conference',      'SEC'),
  ('cfb', 'B1G',  'Big Ten Conference',           'Big Ten'),
  ('cfb', 'B12',  'Big 12 Conference',            'Big 12'),
  ('cfb', 'ACC',  'Atlantic Coast Conference',    'ACC'),
  ('cfb', 'AAC',  'American Athletic Conference', 'American Athletic'),
  ('cfb', 'MWC',  'Mountain West Conference',     'Mountain West'),
  ('cfb', 'SBC',  'Sun Belt Conference',          'Sun Belt'),
  ('cfb', 'MAC',  'Mid-American Conference',      'MAC'),
  ('cfb', 'CUSA', 'Conference USA',               'CUSA')
ON CONFLICT (sport_id, external_id) DO UPDATE
  SET name         = excluded.name,
      abbreviation = excluded.abbreviation;

-- ── Teams: SEC ───────────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-ala',  'Alabama',          'ALA',  'Crimson Tide'),
  ('cfb-ark',  'Arkansas',         'ARK',  'Razorbacks'),
  ('cfb-aub',  'Auburn',           'AUB',  'Tigers'),
  ('cfb-fla',  'Florida',          'FLA',  'Gators'),
  ('cfb-uga',  'Georgia',          'UGA',  'Bulldogs'),
  ('cfb-uk',   'Kentucky',         'UK',   'Wildcats'),
  ('cfb-lsu',  'LSU',              'LSU',  'Tigers'),
  ('cfb-mss',  'Mississippi State','MSU',  'Bulldogs'),
  ('cfb-miz',  'Missouri',         'MIZ',  'Tigers'),
  ('cfb-ole',  'Ole Miss',         'MISS', 'Rebels'),
  ('cfb-sc',   'South Carolina',   'SC',   'Gamecocks'),
  ('cfb-tenn', 'Tennessee',        'TENN', 'Volunteers'),
  ('cfb-tex',  'Texas',            'TEX',  'Longhorns'),
  ('cfb-txam', 'Texas A&M',        'TXAM', 'Aggies'),
  ('cfb-vand', 'Vanderbilt',       'VAN',  'Commodores'),
  ('cfb-okla', 'Oklahoma',         'OU',   'Sooners')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'SEC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: Big Ten ───────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-ill',  'Illinois',          'ILL',  'Fighting Illini'),
  ('cfb-ind',  'Indiana',           'IND',  'Hoosiers'),
  ('cfb-iowa', 'Iowa',              'IOWA', 'Hawkeyes'),
  ('cfb-umd',  'Maryland',          'MD',   'Terrapins'),
  ('cfb-mich', 'Michigan',          'MICH', 'Wolverines'),
  ('cfb-msu',  'Michigan State',    'MSU',  'Spartans'),
  ('cfb-minn', 'Minnesota',         'MINN', 'Golden Gophers'),
  ('cfb-neb',  'Nebraska',          'NEB',  'Cornhuskers'),
  ('cfb-nw',   'Northwestern',      'NW',   'Wildcats'),
  ('cfb-osu',  'Ohio State',        'OSU',  'Buckeyes'),
  ('cfb-psu',  'Penn State',        'PSU',  'Nittany Lions'),
  ('cfb-pur',  'Purdue',            'PUR',  'Boilermakers'),
  ('cfb-rut',  'Rutgers',           'RUT',  'Scarlet Knights'),
  ('cfb-ucla', 'UCLA',              'UCLA', 'Bruins'),
  ('cfb-usc',  'USC',               'USC',  'Trojans'),
  ('cfb-wash', 'Washington',        'UW',   'Huskies'),
  ('cfb-wisc', 'Wisconsin',         'WISC', 'Badgers'),
  ('cfb-ore',  'Oregon',            'ORE',  'Ducks')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'B1G'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: Big 12 ────────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-ariz',  'Arizona',       'ARIZ', 'Wildcats'),
  ('cfb-asu',   'Arizona State', 'ASU',  'Sun Devils'),
  ('cfb-bay',   'Baylor',        'BAY',  'Bears'),
  ('cfb-byu',   'BYU',           'BYU',  'Cougars'),
  ('cfb-ucf',   'UCF',           'UCF',  'Knights'),
  ('cfb-cin',   'Cincinnati',    'CIN',  'Bearcats'),
  ('cfb-colo',  'Colorado',      'CU',   'Buffaloes'),
  ('cfb-hou',   'Houston',       'HOU',  'Cougars'),
  ('cfb-isu',   'Iowa State',    'ISU',  'Cyclones'),
  ('cfb-kan',   'Kansas',        'KU',   'Jayhawks'),
  ('cfb-ksu',   'Kansas State',  'KSU',  'Wildcats'),
  ('cfb-okst',  'Oklahoma State','OKST', 'Cowboys'),
  ('cfb-tcu',   'TCU',           'TCU',  'Horned Frogs'),
  ('cfb-ttu',   'Texas Tech',    'TTU',  'Red Raiders'),
  ('cfb-utah',  'Utah',          'UTAH', 'Utes'),
  ('cfb-wvu',   'West Virginia', 'WVU',  'Mountaineers')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'B12'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: ACC ───────────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-bc',    'Boston College',  'BC',   'Eagles'),
  ('cfb-cal',   'California',      'CAL',  'Golden Bears'),
  ('cfb-clem',  'Clemson',         'CLEM', 'Tigers'),
  ('cfb-duke',  'Duke',            'DUKE', 'Blue Devils'),
  ('cfb-fsu',   'Florida State',   'FSU',  'Seminoles'),
  ('cfb-gt',    'Georgia Tech',    'GT',   'Yellow Jackets'),
  ('cfb-lou',   'Louisville',      'LOU',  'Cardinals'),
  ('cfb-miami', 'Miami',           'UM',   'Hurricanes'),
  ('cfb-ncst',  'NC State',        'NCST', 'Wolfpack'),
  ('cfb-unc',   'North Carolina',  'UNC',  'Tar Heels'),
  ('cfb-pitt',  'Pittsburgh',      'PITT', 'Panthers'),
  ('cfb-smu',   'SMU',             'SMU',  'Mustangs'),
  ('cfb-stan',  'Stanford',        'STAN', 'Cardinal'),
  ('cfb-syr',   'Syracuse',        'SYR',  'Orange'),
  ('cfb-uva',   'Virginia',        'UVA',  'Cavaliers'),
  ('cfb-vt',    'Virginia Tech',   'VT',   'Hokies'),
  ('cfb-wake',  'Wake Forest',     'WAKE', 'Demon Deacons')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'ACC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: American Athletic ─────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-army',  'Army',           'ARMY', 'Black Knights'),
  ('cfb-char',  'Charlotte',      'CLT',  '49ers'),
  ('cfb-ecu',   'East Carolina',  'ECU',  'Pirates'),
  ('cfb-fau',   'FAU',            'FAU',  'Owls'),
  ('cfb-mem',   'Memphis',        'MEM',  'Tigers'),
  ('cfb-navy',  'Navy',           'NAVY', 'Midshipmen'),
  ('cfb-unt',   'North Texas',    'UNT',  'Mean Green'),
  ('cfb-rice',  'Rice',           'RICE', 'Owls'),
  ('cfb-usf',   'South Florida',  'USF',  'Bulls'),
  ('cfb-temp',  'Temple',         'TEM',  'Owls'),
  ('cfb-tuln',  'Tulane',         'TUL',  'Green Wave'),
  ('cfb-tuls',  'Tulsa',          'TULS', 'Golden Hurricane'),
  ('cfb-uab',   'UAB',            'UAB',  'Blazers'),
  ('cfb-utsa',  'UTSA',           'UTSA', 'Roadrunners')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'AAC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: Mountain West ──────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-af',   'Air Force',       'AFA',  'Falcons'),
  ('cfb-bsu',  'Boise State',     'BSU',  'Broncos'),
  ('cfb-csu',  'Colorado State',  'CSU',  'Rams'),
  ('cfb-fres', 'Fresno State',    'FRES', 'Bulldogs'),
  ('cfb-haw',  'Hawaii',          'HAW',  'Rainbow Warriors'),
  ('cfb-nev',  'Nevada',          'NEV',  'Wolf Pack'),
  ('cfb-nm',   'New Mexico',      'UNM',  'Lobos'),
  ('cfb-sdsu', 'San Diego State', 'SDSU', 'Aztecs'),
  ('cfb-sjsu', 'San Jose State',  'SJSU', 'Spartans'),
  ('cfb-unlv', 'UNLV',            'UNLV', 'Rebels'),
  ('cfb-usu',  'Utah State',      'USU',  'Aggies'),
  ('cfb-wyo',  'Wyoming',         'WYO',  'Cowboys')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'MWC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: Sun Belt ───────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-app',   'Appalachian State',  'APP',  'Mountaineers'),
  ('cfb-arst',  'Arkansas State',     'ARST', 'Red Wolves'),
  ('cfb-ccu',   'Coastal Carolina',   'CCU',  'Chanticleers'),
  ('cfb-gaso',  'Georgia Southern',   'GASO', 'Eagles'),
  ('cfb-gast',  'Georgia State',      'GAST', 'Panthers'),
  ('cfb-jmu',   'James Madison',      'JMU',  'Dukes'),
  ('cfb-ull',   'Louisiana',          'ULL',  'Ragin Cajuns'),
  ('cfb-ulm',   'Louisiana Monroe',   'ULM',  'Warhawks'),
  ('cfb-marsh', 'Marshall',           'MRSH', 'Thundering Herd'),
  ('cfb-odu',   'Old Dominion',       'ODU',  'Monarchs'),
  ('cfb-sou',   'South Alabama',      'USA',  'Jaguars'),
  ('cfb-smiss', 'Southern Miss',      'USM',  'Golden Eagles'),
  ('cfb-txst',  'Texas State',        'TXST', 'Bobcats'),
  ('cfb-troy',  'Troy',               'TROY', 'Trojans')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'SBC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: MAC ────────────────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-akr',  'Akron',           'AKR',  'Zips'),
  ('cfb-ball', 'Ball State',      'BALL', 'Cardinals'),
  ('cfb-bgsu', 'Bowling Green',   'BGSU', 'Falcons'),
  ('cfb-buff', 'Buffalo',         'BUFF', 'Bulls'),
  ('cfb-cmu',  'Central Michigan','CMU',  'Chippewas'),
  ('cfb-emu',  'Eastern Michigan','EMU',  'Eagles'),
  ('cfb-kent', 'Kent State',      'KENT', 'Golden Flashes'),
  ('cfb-mioh', 'Miami (OH)',      'MIA',  'RedHawks'),
  ('cfb-niu',  'Northern Illinois','NIU', 'Huskies'),
  ('cfb-ohio', 'Ohio',            'OHIO', 'Bobcats'),
  ('cfb-tol',  'Toledo',          'TOL',  'Rockets'),
  ('cfb-wmu',  'Western Michigan','WMU',  'Broncos')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'MAC'
ON CONFLICT (sport_id, external_id) DO NOTHING;

-- ── Teams: Conference USA ─────────────────────────────────────────

INSERT INTO public.teams (sport_id, conference_id, external_id, name, abbreviation, mascot)
SELECT 'cfb', c.id, v.ext_id, v.tname, v.abbr, v.mascot
FROM public.conferences c
CROSS JOIN (VALUES
  ('cfb-fiu',   'FIU',             'FIU',  'Panthers'),
  ('cfb-jvst',  'Jacksonville State','JSU','Gamecocks'),
  ('cfb-ksu',   'Kennesaw State',  'KSU',  'Owls'),
  ('cfb-lib',   'Liberty',         'LIB',  'Flames'),
  ('cfb-latu',  'Louisiana Tech',  'LATECH','Bulldogs'),
  ('cfb-mtsu',  'Middle Tennessee','MTSU', 'Blue Raiders'),
  ('cfb-nmsu',  'New Mexico State','NMST', 'Aggies'),
  ('cfb-samu',  'Sam Houston',     'SHSU', 'Bearkats'),
  ('cfb-utep',  'UTEP',            'UTEP', 'Miners'),
  ('cfb-wku',   'Western Kentucky','WKU',  'Hilltoppers')
) AS v(ext_id, tname, abbr, mascot)
WHERE c.sport_id = 'cfb' AND c.external_id = 'CUSA'
ON CONFLICT (sport_id, external_id) DO NOTHING;
