-- Seed data for the mock Rent Manager schema.
-- Demo brand: Aurora Property Group (Cincinnati, OH) per PROJECT_SPEC.md §13.4.
-- Mix: 8 Residential properties, 1 Commercial, 1 ManufacturedHousing = 10 total.
-- Distribution: 40 units across the 8 residential properties; 1-3 images per
-- unit; 3-5 amenities per property; 2-4 amenities per unit.
--
-- IDEMPOTENCY: this file is safe to re-run. It TRUNCATEs every rm_* table
-- (CASCADE, RESTART IDENTITY) before re-inserting, so each run lands on
-- identical state regardless of prior contents. Rationale: PROJECT_SPEC.md
-- §5.1 declares the parent tables with `bigint primary key` (not bigserial),
-- so seed inserts must specify ids explicitly anyway -- TRUNCATE is the
-- simpler-to-read option versus a thicket of ON CONFLICT clauses, and because
-- this is dev-only data, dropping rows is harmless.
--   ⚠  Never run this against production data. `pnpm seed` (which calls
--      `supabase db reset --linked`) destroys the linked project's contents.
--
-- IMAGE URLS: stable Unsplash CDN paths (`photo-<id>?w=...&q=...`). These ids
-- are long-lived; if any photo is ever pulled down only the rendered image
-- breaks, not the SQL load.

truncate table
  rm_unit_amenities,
  rm_property_amenities,
  rm_unit_images,
  rm_units,
  rm_properties,
  rm_company
restart identity cascade;

-- ───────────────────────────────────────────────────────────────────────────
-- Company (single row -- the property manager's tenant info)
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_company (id, name, legal_name, primary_phone, email, street, city, state, postal_code, logo_url) values
  (1, 'Aurora Property Group', 'Aurora Property Group LLC', '+1-513-555-0100', 'hello@aurora-cincy.com',
   '1500 Vine Street, Suite 300', 'Cincinnati', 'OH', '45202',
   'https://images.unsplash.com/photo-1611224885990-ab7363d1f2a9?w=400&q=80');

-- ───────────────────────────────────────────────────────────────────────────
-- Properties (10 total: 8 Residential, 1 Commercial, 1 ManufacturedHousing)
-- Cincinnati neighborhoods chosen to look like a real PM portfolio on stage.
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_properties (id, name, short_name, property_type, email, primary_phone, street, city, state, postal_code, hero_image_url) values
  (1, 'The Aurora at Hyde Park', 'Hyde Park', 'Residential', 'hydepark@aurora-cincy.com', '+1-513-555-0101',
   '2700 Erie Avenue', 'Cincinnati', 'OH', '45208',
   'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80'),
  (2, 'Burnet Woods Apartments', 'Burnet Woods', 'Residential', 'burnetwoods@aurora-cincy.com', '+1-513-555-0102',
   '1820 Clifton Avenue', 'Cincinnati', 'OH', '45219',
   'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1600&q=80'),
  (3, 'Mt. Adams Vista', 'Mt. Adams', 'Residential', 'mtadams@aurora-cincy.com', '+1-513-555-0103',
   '1145 St. Gregory Street', 'Cincinnati', 'OH', '45202',
   'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1600&q=80'),
  (4, 'The Banks Residences', 'The Banks', 'Residential', 'thebanks@aurora-cincy.com', '+1-513-555-0104',
   '100 East Freedom Way', 'Cincinnati', 'OH', '45202',
   'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80'),
  (5, 'Oakley Station Lofts', 'Oakley Station', 'Residential', 'oakley@aurora-cincy.com', '+1-513-555-0105',
   '4900 Marburg Avenue', 'Cincinnati', 'OH', '45209',
   'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1600&q=80'),
  (6, 'Northside Commons', 'Northside', 'Residential', 'northside@aurora-cincy.com', '+1-513-555-0106',
   '4015 Hamilton Avenue', 'Cincinnati', 'OH', '45223',
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1600&q=80'),
  (7, 'Mariemont Square', 'Mariemont', 'Residential', 'mariemont@aurora-cincy.com', '+1-513-555-0107',
   '6900 Wooster Pike', 'Cincinnati', 'OH', '45227',
   'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?w=1600&q=80'),
  (8, 'Walnut Hills Heritage', 'Walnut Hills', 'Residential', 'walnuthills@aurora-cincy.com', '+1-513-555-0108',
   '935 William Howard Taft Road', 'Cincinnati', 'OH', '45206',
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80'),
  (9, 'Aurora Business Center', 'Business Ctr', 'Commercial', 'business@aurora-cincy.com', '+1-513-555-0109',
   '1234 Vine Street', 'Cincinnati', 'OH', '45202',
   'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80'),
  (10, 'Twin Lakes Estates', 'Twin Lakes', 'ManufacturedHousing', 'twinlakes@aurora-cincy.com', '+1-513-555-0110',
   '5500 Reading Road', 'Cincinnati', 'OH', '45237',
   'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=80');

-- ───────────────────────────────────────────────────────────────────────────
-- Units (40 across the 8 residential properties)
-- Unit ids encode the property: 1XX -> property 1, 2XX -> property 2, etc.
-- All rents respect the demo's $850-$2,800 Cincinnati range (CLAUDE.md).
-- A handful of units are flagged unavailable with a near-future available_date
-- so the Repeater filter demos have realistic data to filter against.
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_units (id, property_id, unit_name, square_footage, bedrooms, bathrooms, current_market_rent, is_available, available_date, primary_image_url, description) values
  -- Property 1 — The Aurora at Hyde Park (luxury, 6 units)
  (101, 1, 'Apt 101', 720, 1, 1.0, 1850.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Ground-floor one-bedroom with private patio overlooking the courtyard, oversized windows, and quartz finishes throughout.'),
  (102, 1, 'Apt 102', 750, 1, 1.0, 1925.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Sun-flooded one-bedroom with chef''s kitchen, walk-in closet, and a balcony facing the Hyde Park Square fountain.'),
  (103, 1, 'Apt 201', 1100, 2, 2.0, 2450.00, true, null,
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Spacious two-bedroom with split floor plan, en-suite primary bath, and a private east-facing balcony.'),
  (104, 1, 'Apt 202', 1150, 2, 2.0, 2550.00, false, '2026-05-23',
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
   'Corner two-bedroom with floor-to-ceiling windows, double vanity, and rooftop access just down the hall.'),
  (105, 1, 'Penthouse 301', 1700, 3, 2.5, 2800.00, true, null,
   'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80',
   'Top-floor penthouse with 270-degree views, gas fireplace, custom Italian cabinetry, and a private rooftop terrace.'),
  (106, 1, 'Studio 102', 480, 0, 1.0, 1400.00, true, null,
   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
   'Bright studio with built-in Murphy bed, walk-in shower, and energy-efficient stainless appliances.'),
  -- Property 2 — Burnet Woods Apartments (Clifton, near UC, 5 units)
  (201, 2, 'Studio A', 380, 0, 1.0, 895.00, true, null,
   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
   'Efficient studio steps from UC campus, refinished hardwoods, and on-site coin laundry.'),
  (202, 2, 'Studio B', 400, 0, 1.0, 920.00, true, null,
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
   'Updated studio with new kitchenette, large closet, and southern exposure over Burnet Woods park.'),
  (203, 2, '1B - 102', 580, 1, 1.0, 1100.00, true, null,
   'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
   'Classic one-bedroom in a 1920s building, original moldings preserved, ceiling fan in every room.'),
  (204, 2, '1B - 201', 600, 1, 1.0, 1150.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Second-floor one-bedroom with bay windows facing Clifton Avenue and updated bathroom tile.'),
  (205, 2, '2B - 301', 850, 2, 1.0, 1400.00, false, '2026-06-06',
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Top-floor two-bedroom roommate floor plan with separate dining nook and a private rear stoop.'),
  -- Property 3 — Mt. Adams Vista (5 units)
  (301, 3, 'Apt 1A', 700, 1, 1.0, 1500.00, true, null,
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
   'Hillside one-bedroom with skyline views, gas range, and a deeded covered parking spot.'),
  (302, 3, 'Apt 2A', 720, 1, 1.0, 1550.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Updated one-bedroom with quartz counters, designer lighting, and direct elevator access.'),
  (303, 3, 'Apt 3A - View', 1050, 2, 2.0, 2100.00, true, null,
   'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80',
   'Two-bedroom corner unit with floor-to-ceiling glass facing downtown Cincinnati and the Ohio River.'),
  (304, 3, 'Apt 4A - View', 1100, 2, 2.0, 2200.00, false, '2026-05-30',
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Penthouse-level two-bedroom with wraparound terrace, fireplace, and bonus office nook.'),
  (305, 3, 'Studio Tower', 460, 0, 1.0, 1250.00, true, null,
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
   'Boutique studio in the original 1890s tower with exposed brick and a working transom window.'),
  -- Property 4 — The Banks Residences (downtown, 6 units)
  (401, 4, 'Apt 305', 680, 1, 1.0, 1750.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Downtown one-bedroom steps from the Reds and Bengals stadiums, smart-home enabled.'),
  (402, 4, 'Apt 412', 780, 1, 1.5, 1950.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Open-concept one-bedroom with powder room, kitchen island, and a Juliet balcony over Freedom Way.'),
  (403, 4, 'Apt 510', 1200, 2, 2.0, 2500.00, true, null,
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Two-bedroom with riverfront view, dedicated work-from-home alcove, and gas range cooking.'),
  (404, 4, 'Apt 615', 1250, 2, 2.0, 2650.00, false, '2026-06-13',
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
   'East-facing two-bedroom with sunrise views over the Roebling Bridge and a covered garage spot.'),
  (405, 4, 'Apt 720', 1300, 2, 2.5, 2800.00, true, null,
   'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80',
   'Top-tier two-bedroom with double primary suites, rooftop pool access, and concierge service.'),
  (406, 4, 'Studio S03', 510, 0, 1.0, 1600.00, true, null,
   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
   'Efficient downtown studio with built-in queen Murphy bed and a streetcar stop at the door.'),
  -- Property 5 — Oakley Station Lofts (5 units)
  (501, 5, 'Loft 1', 800, 1, 1.0, 1375.00, true, null,
   'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80',
   'Industrial loft with 14-foot ceilings, polished concrete floors, and exposed steel beams.'),
  (502, 5, 'Loft 2', 850, 1, 1.0, 1450.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'South-facing loft with oversized factory windows and a sleeping mezzanine over the great room.'),
  (503, 5, 'Loft 3', 1150, 2, 2.0, 1825.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Two-bedroom loft conversion with original brick masonry and a dedicated home-office bay.'),
  (504, 5, 'Loft 4', 1200, 2, 2.0, 1950.00, false, '2026-05-16',
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Corner loft with two private decks, gas grill hookup, and direct access to the courtyard pool.'),
  (505, 5, 'Studio Loft S2', 540, 0, 1.0, 1200.00, true, null,
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
   'Compact loft studio with built-in storage wall and skylights over the kitchen.'),
  -- Property 6 — Northside Commons (4 units)
  (601, 6, 'Apt 101', 600, 1, 1.0, 975.00, true, null,
   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
   'Cozy one-bedroom on the Hamilton Avenue strip, walking distance to coffee shops and music venues.'),
  (602, 6, 'Apt 202', 650, 1, 1.0, 1050.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Refreshed one-bedroom with new flooring, ceiling fans, and dedicated bike storage downstairs.'),
  (603, 6, 'Apt 303', 880, 2, 1.0, 1350.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Two-bedroom with a screened-in back porch and a community garden plot included in rent.'),
  (604, 6, 'Apt 404', 950, 2, 1.5, 1475.00, false, '2026-05-09',
   'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
   'Top-floor two-bedroom with vaulted ceilings, half-bath off the primary, and skyline peeks from the kitchen.'),
  -- Property 7 — Mariemont Square (5 units)
  (701, 7, 'Townhome A', 1100, 2, 1.5, 1425.00, true, null,
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Two-story townhome on the Mariemont green with a fenced patio and attached one-car garage.'),
  (702, 7, 'Townhome B', 1100, 2, 1.5, 1475.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Renovated townhome with new shaker cabinetry, full-size in-unit laundry, and a private deck.'),
  (703, 7, 'Townhome C', 1450, 3, 2.0, 1650.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Three-bedroom family townhome backing to the school district, finished basement, and pet-friendly yard.'),
  (704, 7, 'Townhome D', 1500, 3, 2.0, 1750.00, false, '2026-06-20',
   'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80',
   'End-unit three-bedroom with a sunroom addition, gas fireplace, and oversized two-car garage.'),
  (705, 7, 'Carriage 1', 750, 1, 1.0, 1225.00, true, null,
   'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80',
   'Carriage-house one-bedroom with vaulted beam ceiling and access to the main estate gardens.'),
  -- Property 8 — Walnut Hills Heritage (4 units)
  (801, 8, 'Apt 1A', 620, 1, 1.0, 895.00, true, null,
   'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
   'Restored 1910 walk-up with original transoms, gas range, and bay windows over Taft Road.'),
  (802, 8, 'Apt 2B', 640, 1, 1.0, 950.00, true, null,
   'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80',
   'Sunny second-floor one-bedroom with a refurbished claw-foot tub and shared rear courtyard.'),
  (803, 8, 'Apt 3C', 880, 2, 1.0, 1250.00, true, null,
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
   'Two-bedroom roommate floor plan with central A/C upgrade and dedicated dining room.'),
  (804, 8, 'Apt 4D', 900, 2, 1.0, 1375.00, false, '2026-05-30',
   'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80',
   'Top-floor two-bedroom with skyline views from the kitchen window and a deeded surface parking spot.');

-- ───────────────────────────────────────────────────────────────────────────
-- Unit images (1-3 per unit; primary image is already on rm_units)
-- id is bigserial so we let the DB assign it.
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_unit_images (unit_id, image_url, display_order) values
  -- Property 1 - Hyde Park
  (101, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (101, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 2),
  (102, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 1),
  (102, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 2),
  (103, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 1),
  (103, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 2),
  (103, 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80', 3),
  (104, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 1),
  (104, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80', 2),
  (105, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 1),
  (105, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 2),
  (105, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 3),
  (106, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 1),
  -- Property 2 - Burnet Woods
  (201, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80', 1),
  (202, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 1),
  (202, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 2),
  (203, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),
  (203, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 2),
  (204, 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80', 1),
  (205, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 1),
  (205, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 2),
  -- Property 3 - Mt. Adams Vista
  (301, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (301, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 2),
  (302, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 1),
  (302, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80', 2),
  (303, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 1),
  (303, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', 2),
  (303, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 3),
  (304, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 1),
  (304, 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80', 2),
  (305, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80', 1),
  -- Property 4 - The Banks
  (401, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (401, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 2),
  (402, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 1),
  (402, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 2),
  (403, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 1),
  (403, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 2),
  (403, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 3),
  (404, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),
  (404, 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80', 2),
  (405, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (405, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 2),
  (405, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 3),
  (406, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 1),
  -- Property 5 - Oakley Station
  (501, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),
  (501, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 2),
  (502, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 1),
  (503, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80', 1),
  (503, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 2),
  (504, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 1),
  (504, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 2),
  (505, 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80', 1),
  -- Property 6 - Northside
  (601, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (602, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 1),
  (602, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 2),
  (603, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', 1),
  (603, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 2),
  (604, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 1),
  -- Property 7 - Mariemont
  (701, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),
  (701, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=80', 2),
  (702, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 1),
  (702, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 2),
  (703, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80', 1),
  (703, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80', 2),
  (703, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 3),
  (704, 'https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=1200&q=80', 1),
  (704, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80', 2),
  (705, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=80', 1),
  -- Property 8 - Walnut Hills
  (801, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80', 1),
  (801, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&q=80', 2),
  (802, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', 1),
  (802, 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&q=80', 2),
  (803, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=1200&q=80', 1),
  (803, 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=1200&q=80', 2),
  (804, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80', 1),
  (804, 'https://images.unsplash.com/photo-1556909195-450a2dd92e62?w=1200&q=80', 2);

-- ───────────────────────────────────────────────────────────────────────────
-- Property amenities (3-5 per property)
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_property_amenities (property_id, amenity) values
  (1, 'Pool'), (1, 'Fitness Center'), (1, 'Pet Friendly'), (1, 'Garage Parking'), (1, 'Rooftop Lounge'),
  (2, 'Pet Friendly'), (2, 'On-Site Laundry'), (2, 'Bike Storage'), (2, 'Study Lounge'),
  (3, 'Pet Friendly'), (3, 'Garage Parking'), (3, 'Rooftop Lounge'), (3, 'Concierge'),
  (4, 'Pool'), (4, 'Fitness Center'), (4, 'Garage Parking'), (4, 'Rooftop Lounge'), (4, 'Concierge'),
  (5, 'Pet Friendly'), (5, 'Fitness Center'), (5, 'Bike Storage'), (5, 'Garage Parking'),
  (6, 'Pet Friendly'), (6, 'On-Site Laundry'), (6, 'Bike Storage'), (6, 'Community Garden'),
  (7, 'Pet Friendly'), (7, 'Garage Parking'), (7, 'Playground'), (7, 'Picnic Area'),
  (8, 'Pet Friendly'), (8, 'On-Site Laundry'), (8, 'Garage Parking'),
  (9, 'Garage Parking'), (9, 'Conference Rooms'), (9, 'High-Speed Internet'), (9, 'Concierge'),
  (10, 'Pet Friendly'), (10, 'Community Pool'), (10, 'Playground'), (10, 'Picnic Area'), (10, 'Lake Access');

-- ───────────────────────────────────────────────────────────────────────────
-- Unit amenities (2-4 per unit)
-- ───────────────────────────────────────────────────────────────────────────

insert into rm_unit_amenities (unit_id, amenity) values
  -- Property 1 - Hyde Park (luxury units)
  (101, 'In-Unit Laundry'), (101, 'Stainless Appliances'), (101, 'Quartz Countertops'), (101, 'Hardwood Floors'),
  (102, 'In-Unit Laundry'), (102, 'Stainless Appliances'), (102, 'Walk-In Closet'), (102, 'Balcony'),
  (103, 'In-Unit Laundry'), (103, 'Stainless Appliances'), (103, 'Walk-In Closet'), (103, 'Central A/C'),
  (104, 'In-Unit Laundry'), (104, 'Quartz Countertops'), (104, 'Walk-In Closet'), (104, 'Balcony'),
  (105, 'In-Unit Laundry'), (105, 'Stainless Appliances'), (105, 'Quartz Countertops'), (105, 'Walk-In Closet'),
  (106, 'In-Unit Laundry'), (106, 'Stainless Appliances'), (106, 'Hardwood Floors'),
  -- Property 2 - Burnet Woods (student-friendly)
  (201, 'Hardwood Floors'), (201, 'Central A/C'),
  (202, 'Hardwood Floors'), (202, 'Central A/C'), (202, 'Walk-In Closet'),
  (203, 'Hardwood Floors'), (203, 'Dishwasher'), (203, 'Central A/C'),
  (204, 'Hardwood Floors'), (204, 'Dishwasher'), (204, 'Balcony'),
  (205, 'Hardwood Floors'), (205, 'Dishwasher'), (205, 'Central A/C'),
  -- Property 3 - Mt. Adams Vista
  (301, 'In-Unit Laundry'), (301, 'Dishwasher'), (301, 'Central A/C'), (301, 'Balcony'),
  (302, 'In-Unit Laundry'), (302, 'Quartz Countertops'), (302, 'Walk-In Closet'),
  (303, 'In-Unit Laundry'), (303, 'Stainless Appliances'), (303, 'Balcony'), (303, 'Hardwood Floors'),
  (304, 'In-Unit Laundry'), (304, 'Stainless Appliances'), (304, 'Walk-In Closet'),
  (305, 'Dishwasher'), (305, 'Central A/C'), (305, 'Hardwood Floors'),
  -- Property 4 - The Banks (downtown premium)
  (401, 'In-Unit Laundry'), (401, 'Stainless Appliances'), (401, 'Smart Thermostat'),
  (402, 'In-Unit Laundry'), (402, 'Quartz Countertops'), (402, 'Balcony'),
  (403, 'In-Unit Laundry'), (403, 'Stainless Appliances'), (403, 'Walk-In Closet'), (403, 'Balcony'),
  (404, 'In-Unit Laundry'), (404, 'Stainless Appliances'), (404, 'Quartz Countertops'),
  (405, 'In-Unit Laundry'), (405, 'Stainless Appliances'), (405, 'Walk-In Closet'), (405, 'Balcony'),
  (406, 'In-Unit Laundry'), (406, 'Stainless Appliances'), (406, 'Hardwood Floors'),
  -- Property 5 - Oakley Station Lofts
  (501, 'In-Unit Laundry'), (501, 'Hardwood Floors'), (501, 'Central A/C'),
  (502, 'In-Unit Laundry'), (502, 'Hardwood Floors'), (502, 'Stainless Appliances'),
  (503, 'In-Unit Laundry'), (503, 'Stainless Appliances'), (503, 'Hardwood Floors'), (503, 'Walk-In Closet'),
  (504, 'In-Unit Laundry'), (504, 'Quartz Countertops'), (504, 'Balcony'),
  (505, 'Hardwood Floors'), (505, 'Central A/C'),
  -- Property 6 - Northside Commons
  (601, 'Hardwood Floors'), (601, 'Central A/C'),
  (602, 'Dishwasher'), (602, 'Central A/C'),
  (603, 'Dishwasher'), (603, 'Central A/C'), (603, 'Balcony'),
  (604, 'Dishwasher'), (604, 'Central A/C'), (604, 'Walk-In Closet'),
  -- Property 7 - Mariemont (suburban)
  (701, 'In-Unit Laundry'), (701, 'Dishwasher'), (701, 'Central A/C'), (701, 'Balcony'),
  (702, 'In-Unit Laundry'), (702, 'Dishwasher'), (702, 'Hardwood Floors'),
  (703, 'In-Unit Laundry'), (703, 'Stainless Appliances'), (703, 'Walk-In Closet'), (703, 'Balcony'),
  (704, 'In-Unit Laundry'), (704, 'Stainless Appliances'), (704, 'Walk-In Closet'),
  (705, 'In-Unit Laundry'), (705, 'Hardwood Floors'),
  -- Property 8 - Walnut Hills
  (801, 'Hardwood Floors'), (801, 'Central A/C'),
  (802, 'Hardwood Floors'), (802, 'Central A/C'),
  (803, 'Dishwasher'), (803, 'Central A/C'), (803, 'Hardwood Floors'),
  (804, 'Dishwasher'), (804, 'Central A/C'), (804, 'Balcony');
