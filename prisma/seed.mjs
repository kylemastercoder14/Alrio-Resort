import "dotenv/config";

import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;

const amenities = [
  {
    code: "AC",
    name: "Air conditioning",
    category: "Room Comfort",
    icon: "❄️",
    description:
      "Individually cooled guest rooms provide a comfortable retreat after swimming, dining, or celebrating outdoors.",
    appliesTo: "ROOM_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: true,
    sortOrder: 1,
    internalNotes:
      "Housekeeping should test cooling, remote controls, and filters before every check-in and report weak airflow to maintenance.",
  },
  {
    code: "WIFI",
    name: "Complimentary Wi-Fi",
    category: "Connectivity",
    icon: "🛜",
    description:
      "Complimentary wireless internet is available in guest rooms and the resort's main shared areas.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: true,
    sortOrder: 2,
    internalNotes:
      "Keep the guest network separate from staff systems. Confirm router coverage and refresh the displayed guest password when changed.",
  },
  {
    code: "POOL-ACC",
    name: "Swimming pool access",
    category: "Recreation",
    icon: "🏊",
    description:
      "Guests can enjoy Alrio's private swimming pool during the published pool hours included with their stay or day tour.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: true,
    sortOrder: 3,
    internalNotes:
      "Inspect water clarity, safety signage, rescue equipment, and the pool deck before opening. Enforce capacity and supervision rules.",
  },
  {
    code: "TV",
    name: "Smart TV",
    category: "Entertainment",
    icon: "📺",
    description:
      "Guest rooms include a smart television for personal streaming and relaxed indoor viewing.",
    appliesTo: "ROOM_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: false,
    sortOrder: 4,
    internalNotes:
      "Verify the television, remote, Wi-Fi connection, and guest-mode sign-out during every room turnover.",
  },
  {
    code: "TOIL",
    name: "Essential toiletries",
    category: "Guest Essentials",
    icon: "🧴",
    description:
      "A starter set of soap, shampoo, tissue, and other basic bathroom essentials is prepared for arriving guests.",
    appliesTo: "ROOM_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: false,
    sortOrder: 5,
    internalNotes:
      "Restock sealed guest supplies before check-in. Additional quantities beyond the standard allocation require front-desk approval.",
  },
  {
    code: "AGAME",
    name: "Arcade games",
    category: "Entertainment",
    icon: "🎮",
    description:
      "A selection of family-friendly arcade games offers an easy indoor activity between swims and group gatherings.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: true,
    feeAmount: "300",
    feeUnit: "PER_DAY",
    featured: false,
    sortOrder: 6,
    internalNotes:
      "Issue access only after payment is recorded. Test controls daily and place any faulty unit out of service until repaired.",
  },
  {
    code: "BILLIARDS",
    name: "Billiards table",
    category: "Recreation",
    icon: "🎱",
    description:
      "A full-size billiards table gives families and groups another casual activity to enjoy during their private resort stay.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_USE",
    featured: true,
    sortOrder: 7,
    internalNotes:
      "Count cues, balls, chalk, and the triangle during opening and closing checks. Keep food and drinks away from the felt.",
  },
  {
    code: "KARAOKE",
    name: "Karaoke system",
    category: "Entertainment",
    icon: "🎤",
    description:
      "A karaoke system is available for celebrations, reunions, and relaxed evenings with family and friends.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_USE",
    featured: true,
    sortOrder: 8,
    internalNotes:
      "Test microphones and song controls before guest arrival. Observe quiet hours and store equipment securely after use.",
  },
  {
    code: "DINING",
    name: "Outdoor dining and grill area",
    category: "Dining",
    icon: "🍽️",
    description:
      "A covered outdoor dining area provides a comfortable setting for shared meals, poolside snacks, and catered celebrations.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_USE",
    featured: true,
    sortOrder: 9,
    internalNotes:
      "Sanitize tables and grill surfaces before use. Check LPG connections and keep fire-safety equipment accessible.",
  },
  {
    code: "PARKING",
    name: "On-site guest parking",
    category: "Convenience",
    icon: "🚗",
    description:
      "Complimentary on-site parking is available for registered guest vehicles, subject to resort capacity.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_STAY",
    featured: false,
    sortOrder: 10,
    internalNotes:
      "Record vehicle plate numbers for overnight groups and keep driveways and emergency access lanes unobstructed.",
  },
  {
    code: "KITCHEN",
    name: "Guest kitchen access",
    category: "Dining",
    icon: "🍳",
    description:
      "The designated guest kitchen supports simple meal preparation with essential counters, sinks, and cooking equipment.",
    appliesTo: "PROPERTY_LEVEL",
    chargeable: false,
    feeAmount: null,
    feeUnit: "PER_USE",
    featured: false,
    sortOrder: 11,
    internalNotes:
      "Inventory cookware after each stay. Inspect appliances and gas connections, and confirm the area is clean before turnover.",
  },
];

const services = [
  {
    code: "SVC-2002",
    title: "Celebration Styling Package",
    category: "Events & Celebrations",
    provider: "Alrio Events Team",
    baseCharge: "6500",
    billingType: "FIXED_PRICE",
    duration: "4 hours",
    bookingLeadTime: "72 hours",
    feeNote: "Final price depends on the theme, guest count, and requested decorative pieces.",
    description:
      "A coordinated styling service for birthdays, anniversaries, reunions, and intimate celebrations at Alrio Private Resort.",
    internalNotes:
      "Collect the approved theme, color palette, celebrant name, setup area, and supplier access time before confirming the service.",
  },
  {
    code: "SVC-2003",
    title: "Private Karaoke Setup",
    category: "Entertainment",
    provider: "Alrio Guest Services",
    baseCharge: "1800",
    billingType: "FIXED_PRICE",
    duration: "4 hours",
    bookingLeadTime: "12 hours",
    feeNote: "Includes two microphones and standard sound setup; extended use is subject to availability.",
    description:
      "A prepared karaoke setup with microphones and sound support for lively group gatherings and celebrations.",
    internalNotes:
      "Test the speakers and microphones before handover, document equipment condition, and remind guests about resort quiet hours.",
  },
  {
    code: "SVC-2004",
    title: "In-Room Relaxation Massage",
    category: "Wellness",
    provider: "Accredited Wellness Partner",
    baseCharge: "1200",
    billingType: "PER_GUEST",
    duration: "60 minutes",
    bookingLeadTime: "24 hours",
    feeNote: "Subject to therapist availability; guests should disclose relevant health conditions before the session.",
    description:
      "A one-hour relaxation massage arranged in the privacy of the guest room through an accredited local therapist.",
    internalNotes:
      "Confirm therapist identity, schedule, guest consent, room assignment, and any declared health limitations before arrival.",
  },
  {
    code: "SVC-2005",
    title: "Round-Trip Van Transfer",
    category: "Transportation",
    provider: "Alrio Transport Partner",
    baseCharge: "3500",
    billingType: "FIXED_PRICE",
    duration: "Round trip",
    bookingLeadTime: "48 hours",
    feeNote: "Rate covers an agreed pickup zone; tolls, parking, and distant pickup points may incur additional charges.",
    description:
      "Pre-arranged private van transportation for resort groups traveling from an agreed nearby pickup location.",
    internalNotes:
      "Record pickup address, contact number, passenger count, luggage details, arrival time, and assigned driver before confirmation.",
  },
  {
    code: "SVC-2006",
    title: "Filipino Breakfast Tray",
    category: "Food & Beverage",
    provider: "Alrio Kitchen Team",
    baseCharge: "380",
    billingType: "PER_GUEST",
    duration: "Morning service",
    bookingLeadTime: "12 hours",
    feeNote: "Available for a minimum of four guests; menu substitutions depend on kitchen stock.",
    description:
      "A freshly prepared Filipino breakfast tray delivered at the agreed morning service time for overnight guests.",
    internalNotes:
      "Confirm serving time, guest count, room or dining area, allergy information, and selected menu before kitchen cutoff.",
  },
];

const rooms = [
  {
    code: "DR-102",
    name: "Deluxe Pool View Room",
    type: "Deluxe Queen",
    building: "Main Villa",
    floor: "Ground Floor",
    baseRate: "3800",
    peakRate: "4500",
    extraPersonCharge: "650",
    maxAdults: 2,
    childrenOccupancy: 1,
    bedConfiguration: "1 Queen",
    roomSize: "28 sqm",
    viewType: "Pool view",
    minNights: 1,
    guestNote:
      "A comfortable pool-facing room for couples or small families, with quick access to Alrio's shared recreation and dining areas.",
    notes:
      "Confirm the air conditioner, smart TV, bathroom supplies, linens, and pool-facing door lock during every turnover.",
    amenityCodes: ["AC", "WIFI", "TV", "TOIL", "POOL-ACC"],
  },
  {
    code: "GR-103",
    name: "Garden Twin Room",
    type: "Garden Twin",
    building: "Garden Wing",
    floor: "Ground Floor",
    baseRate: "4200",
    peakRate: "5000",
    extraPersonCharge: "650",
    maxAdults: 3,
    childrenOccupancy: 2,
    bedConfiguration: "2 Double",
    roomSize: "32 sqm",
    viewType: "Garden view",
    minNights: 1,
    guestNote:
      "A relaxed ground-floor room with two beds and a quieter garden-side setting for friends or a small family.",
    notes:
      "Inspect both beds, curtains, screens, air conditioning, and the garden-facing windows before guest arrival.",
    amenityCodes: ["AC", "WIFI", "TV", "TOIL", "PARKING"],
  },
  {
    code: "FS-201",
    name: "Garden Family Suite",
    type: "Family Suite",
    building: "Main Villa",
    floor: "Second Floor",
    baseRate: "7200",
    peakRate: "8200",
    extraPersonCharge: "800",
    maxAdults: 4,
    childrenOccupancy: 3,
    bedConfiguration: "2 Queen, 1 Sofa Bed",
    roomSize: "46 sqm",
    viewType: "Garden view",
    minNights: 1,
    guestNote:
      "A spacious family suite with flexible sleeping arrangements and easy access to the resort's shared entertainment areas.",
    notes:
      "Prepare the sofa bed only when included in the final guest count. Check all linens, remotes, bathroom fixtures, and storage spaces.",
    amenityCodes: [
      "AC",
      "WIFI",
      "TV",
      "TOIL",
      "POOL-ACC",
      "BILLIARDS",
      "KARAOKE",
    ],
  },
  {
    code: "BK-202",
    name: "Barkada Loft",
    type: "Dormitory",
    building: "Annex Wing",
    floor: "Second Floor",
    baseRate: "9000",
    peakRate: "10500",
    extraPersonCharge: "750",
    maxAdults: 8,
    childrenOccupancy: 2,
    bedConfiguration: "4 Bunk Beds",
    roomSize: "52 sqm",
    viewType: "Courtyard view",
    minNights: 1,
    guestNote:
      "A practical group room designed for barkadas, reunion groups, and team outings that prefer to stay together.",
    notes:
      "Count pillows, towels, blankets, and bunk-bed ladders before check-in. Verify upper-bunk guards and room ventilation.",
    amenityCodes: [
      "AC",
      "WIFI",
      "TOIL",
      "POOL-ACC",
      "AGAME",
      "BILLIARDS",
      "KARAOKE",
    ],
  },
  {
    code: "PV-301",
    name: "Grand Poolside Villa",
    type: "Pool Villa",
    building: "Pool Wing",
    floor: "Ground Floor",
    baseRate: "14500",
    peakRate: "17000",
    extraPersonCharge: "1000",
    maxAdults: 8,
    childrenOccupancy: 4,
    bedConfiguration: "1 King, 2 Queen",
    roomSize: "85 sqm",
    viewType: "Pool view",
    minNights: 1,
    guestNote:
      "Alrio's largest premium accommodation, designed for families and private groups that want generous space beside the pool.",
    notes:
      "Complete the full premium-room checklist before arrival, including all beds, bathrooms, appliances, access points, and poolside safety items.",
    amenityCodes: [
      "AC",
      "WIFI",
      "TV",
      "TOIL",
      "POOL-ACC",
      "DINING",
      "PARKING",
      "KITCHEN",
      "BILLIARDS",
      "KARAOKE",
    ],
  },
];

const packages = [
  {
    code: "PKG-FAMILY",
    name: "Alrio Family Escape",
    category: "Stay package",
    price: "13500",
    compareAtPrice: "15200",
    description:
      "A relaxed overnight package for families who want comfortable suite options, pool time, breakfast, and easy access to Alrio's shared recreation areas.",
    inclusionsNote:
      "Includes one eligible family suite, swimming pool access, billiards, parking, Wi-Fi, and Filipino breakfast service for up to six registered guests.",
    minNights: 1,
    maxGuests: 6,
    featured: true,
    sortOrder: 1,
    roomCodes: ["FS-101", "FS-201"],
    serviceCodes: ["SVC-2006"],
    amenityCodes: ["POOL-ACC", "BILLIARDS", "PARKING", "WIFI", "DINING"],
  },
  {
    code: "PKG-BARKADA",
    name: "Barkada Pool and Karaoke Getaway",
    category: "Group package",
    price: "18500",
    compareAtPrice: "20700",
    description:
      "A group-friendly overnight package built for barkada trips, reunions, and team bonding with shared accommodation, food, and entertainment.",
    inclusionsNote:
      "Includes the Barkada Loft, pool access, private karaoke setup, billiards, arcade access, outdoor dining space, and a poolside barbecue dinner for ten guests.",
    minNights: 1,
    maxGuests: 10,
    featured: true,
    sortOrder: 2,
    roomCodes: ["BK-202"],
    serviceCodes: ["SVC-2001", "SVC-2003"],
    amenityCodes: [
      "POOL-ACC",
      "KARAOKE",
      "BILLIARDS",
      "AGAME",
      "DINING",
      "PARKING",
      "WIFI",
    ],
  },
  {
    code: "PKG-CELEBRATE",
    name: "Private Celebration Experience",
    category: "Event package",
    price: "26500",
    compareAtPrice: "29500",
    description:
      "A coordinated private-resort celebration package for birthdays, anniversaries, intimate reunions, and other meaningful occasions.",
    inclusionsNote:
      "Includes one eligible poolside accommodation, celebration styling, poolside barbecue dinner, pool access, karaoke, outdoor dining, and guest parking for up to twelve people.",
    minNights: 1,
    maxGuests: 12,
    featured: true,
    sortOrder: 3,
    roomCodes: ["FS-101", "PV-301"],
    serviceCodes: ["SVC-2001", "SVC-2002", "SVC-2003"],
    amenityCodes: [
      "POOL-ACC",
      "KARAOKE",
      "DINING",
      "PARKING",
      "WIFI",
      "KITCHEN",
    ],
  },
  {
    code: "PKG-COUPLE",
    name: "Poolside Couple Retreat",
    category: "Stay package",
    price: "7800",
    compareAtPrice: "9180",
    description:
      "A quiet overnight escape for two with a pool-view room, breakfast, and a private relaxation treatment arranged at the resort.",
    inclusionsNote:
      "Includes the Deluxe Pool View Room, pool access, two Filipino breakfast trays, Wi-Fi, parking, and one relaxation massage session for each registered guest.",
    minNights: 1,
    maxGuests: 2,
    featured: false,
    sortOrder: 4,
    roomCodes: ["DR-102"],
    serviceCodes: ["SVC-2004", "SVC-2006"],
    amenityCodes: ["POOL-ACC", "WIFI", "PARKING", "TV", "TOIL"],
  },
  {
    code: "PKG-PREMIUM",
    name: "Grand Poolside Villa Experience",
    category: "Premium package",
    price: "19500",
    compareAtPrice: "22200",
    description:
      "Alrio's premium private-group package combines the largest poolside accommodation with convenient arrival support, breakfast, and full access to key resort amenities.",
    inclusionsNote:
      "Includes the Grand Poolside Villa, round-trip van transfer from an agreed pickup zone, Filipino breakfast service, pool access, karaoke, billiards, kitchen access, dining area, and parking.",
    minNights: 1,
    maxGuests: 12,
    featured: true,
    sortOrder: 5,
    roomCodes: ["PV-301"],
    serviceCodes: ["SVC-2005", "SVC-2006"],
    amenityCodes: [
      "POOL-ACC",
      "KARAOKE",
      "BILLIARDS",
      "KITCHEN",
      "DINING",
      "PARKING",
      "WIFI",
      "TV",
      "TOIL",
    ],
  },
];

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query("BEGIN");

  const resortResult = await client.query(
    `SELECT id, "resortName" AS name
       FROM "resort_profile"
      ORDER BY CASE WHEN LOWER(COALESCE("resortName", '')) LIKE '%alrio%' THEN 0 ELSE 1 END,
               "createdAt"
      LIMIT 1`,
  );
  const resort = resortResult.rows[0];

  if (!resort) {
    throw new Error("No resort profile exists. Create the Alrio resort profile before seeding its catalog.");
  }

  for (const amenity of amenities) {
    await client.query(
      `INSERT INTO "resort_amenity" (
        id, "resortProfileId", code, name, category, icon, description,
        "appliesTo", chargeable, "feeAmount", "feeUnit", status,
        "showOnBookingPage", featured, "sortOrder", "internalNotes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8::"ResortAmenityScope", $9, $10, $11::"ResortAmenityFeeUnit", 'ACTIVE'::"ResortAmenityStatus",
        true, $12, $13, $14, NOW(), NOW()
      )
      ON CONFLICT ("resortProfileId", code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        icon = EXCLUDED.icon,
        description = EXCLUDED.description,
        "appliesTo" = EXCLUDED."appliesTo",
        chargeable = EXCLUDED.chargeable,
        "feeAmount" = EXCLUDED."feeAmount",
        "feeUnit" = EXCLUDED."feeUnit",
        status = EXCLUDED.status,
        "showOnBookingPage" = EXCLUDED."showOnBookingPage",
        featured = EXCLUDED.featured,
        "sortOrder" = EXCLUDED."sortOrder",
        "internalNotes" = EXCLUDED."internalNotes",
        "updatedAt" = NOW()`,
      [
        randomUUID(),
        resort.id,
        amenity.code,
        amenity.name,
        amenity.category,
        amenity.icon,
        amenity.description,
        amenity.appliesTo,
        amenity.chargeable,
        amenity.feeAmount,
        amenity.feeUnit,
        amenity.featured,
        amenity.sortOrder,
        amenity.internalNotes,
      ],
    );
  }

  for (const service of services) {
    await client.query(
      `INSERT INTO "resort_service" (
        id, "resortProfileId", code, title, category, provider, "baseCharge",
        "billingType", duration, "bookingLeadTime", "feeNote", description,
        "internalNotes", "showOnBookingPage", status, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8::"ResortServiceBillingType", $9, $10, $11, $12,
        $13, true, 'ACTIVE'::"ResortServiceStatus", NOW(), NOW()
      )
      ON CONFLICT ("resortProfileId", code) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        provider = EXCLUDED.provider,
        "baseCharge" = EXCLUDED."baseCharge",
        "billingType" = EXCLUDED."billingType",
        duration = EXCLUDED.duration,
        "bookingLeadTime" = EXCLUDED."bookingLeadTime",
        "feeNote" = EXCLUDED."feeNote",
        description = EXCLUDED.description,
        "internalNotes" = EXCLUDED."internalNotes",
        "showOnBookingPage" = EXCLUDED."showOnBookingPage",
        status = EXCLUDED.status,
        "updatedAt" = NOW()`,
      [
        randomUUID(),
        resort.id,
        service.code,
        service.title,
        service.category,
        service.provider,
        service.baseCharge,
        service.billingType,
        service.duration,
        service.bookingLeadTime,
        service.feeNote,
        service.description,
        service.internalNotes,
      ],
    );
  }

  for (const room of rooms) {
    const roomId = randomUUID();
    const savedRoom = await client.query(
      `INSERT INTO "resort_room" (
        id, "resortProfileId", code, name, type, building, floor, "baseRate",
        "peakRate", "extraPersonCharge", "maxAdults", "childrenOccupancy",
        "bedConfiguration", "roomSize", "viewType", "smokingPolicy", status,
        "checkIn", "checkOut", "minNights", "guestNote", notes, "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14, $15, 'NON_SMOKING'::"ResortRoomSmokingPolicy", 'AVAILABLE'::"ResortRoomStatus",
        '14:00:00', '12:00:00', $16, $17, $18, NOW(), NOW()
      )
      ON CONFLICT ("resortProfileId", code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        building = EXCLUDED.building,
        floor = EXCLUDED.floor,
        "baseRate" = EXCLUDED."baseRate",
        "peakRate" = EXCLUDED."peakRate",
        "extraPersonCharge" = EXCLUDED."extraPersonCharge",
        "maxAdults" = EXCLUDED."maxAdults",
        "childrenOccupancy" = EXCLUDED."childrenOccupancy",
        "bedConfiguration" = EXCLUDED."bedConfiguration",
        "roomSize" = EXCLUDED."roomSize",
        "viewType" = EXCLUDED."viewType",
        "smokingPolicy" = EXCLUDED."smokingPolicy",
        "checkIn" = EXCLUDED."checkIn",
        "checkOut" = EXCLUDED."checkOut",
        "minNights" = EXCLUDED."minNights",
        "guestNote" = EXCLUDED."guestNote",
        notes = EXCLUDED.notes,
        "updatedAt" = NOW()
      RETURNING id`,
      [
        roomId,
        resort.id,
        room.code,
        room.name,
        room.type,
        room.building,
        room.floor,
        room.baseRate,
        room.peakRate,
        room.extraPersonCharge,
        room.maxAdults,
        room.childrenOccupancy,
        room.bedConfiguration,
        room.roomSize,
        room.viewType,
        room.minNights,
        room.guestNote,
        room.notes,
      ],
    );
    const persistedRoomId = savedRoom.rows[0].id;

    await client.query(
      `DELETE FROM "_ResortRoomAmenities" WHERE "B" = $1`,
      [persistedRoomId],
    );
    await client.query(
      `INSERT INTO "_ResortRoomAmenities" ("A", "B")
       SELECT id, $1
         FROM "resort_amenity"
        WHERE "resortProfileId" = $2
          AND code = ANY($3::text[])
       ON CONFLICT DO NOTHING`,
      [persistedRoomId, resort.id, room.amenityCodes],
    );
  }

  for (const pack of packages) {
    const packageId = randomUUID();
    const savedPackage = await client.query(
      `INSERT INTO "resort_package" (
        id, "resortProfileId", code, name, category, price, "compareAtPrice",
        description, "inclusionsNote", "minNights", "maxGuests",
        "showOnBookingPage", featured, status, "sortOrder", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        true, $12, 'ACTIVE'::"ResortPackageStatus", $13, NOW(), NOW()
      )
      ON CONFLICT ("resortProfileId", code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        "compareAtPrice" = EXCLUDED."compareAtPrice",
        description = EXCLUDED.description,
        "inclusionsNote" = EXCLUDED."inclusionsNote",
        "minNights" = EXCLUDED."minNights",
        "maxGuests" = EXCLUDED."maxGuests",
        "showOnBookingPage" = EXCLUDED."showOnBookingPage",
        featured = EXCLUDED.featured,
        status = EXCLUDED.status,
        "sortOrder" = EXCLUDED."sortOrder",
        "updatedAt" = NOW()
      RETURNING id`,
      [
        packageId,
        resort.id,
        pack.code,
        pack.name,
        pack.category,
        pack.price,
        pack.compareAtPrice,
        pack.description,
        pack.inclusionsNote,
        pack.minNights,
        pack.maxGuests,
        pack.featured,
        pack.sortOrder,
      ],
    );
    const persistedPackageId = savedPackage.rows[0].id;

    await client.query(
      `DELETE FROM "_ResortPackageAmenities" WHERE "B" = $1`,
      [persistedPackageId],
    );
    await client.query(
      `INSERT INTO "_ResortPackageAmenities" ("A", "B")
       SELECT id, $1
         FROM "resort_amenity"
        WHERE "resortProfileId" = $2
          AND code = ANY($3::text[])
       ON CONFLICT DO NOTHING`,
      [persistedPackageId, resort.id, pack.amenityCodes],
    );

    await client.query(
      `DELETE FROM "_ResortPackageRooms" WHERE "A" = $1`,
      [persistedPackageId],
    );
    await client.query(
      `INSERT INTO "_ResortPackageRooms" ("A", "B")
       SELECT $1, id
         FROM "resort_room"
        WHERE "resortProfileId" = $2
          AND code = ANY($3::text[])
       ON CONFLICT DO NOTHING`,
      [persistedPackageId, resort.id, pack.roomCodes],
    );

    await client.query(
      `DELETE FROM "_ResortPackageServices" WHERE "A" = $1`,
      [persistedPackageId],
    );
    await client.query(
      `INSERT INTO "_ResortPackageServices" ("A", "B")
       SELECT $1, id
         FROM "resort_service"
        WHERE "resortProfileId" = $2
          AND code = ANY($3::text[])
       ON CONFLICT DO NOTHING`,
      [persistedPackageId, resort.id, pack.serviceCodes],
    );
  }

  await client.query("COMMIT");

  const amenityCount = await client.query(
    `SELECT COUNT(*)::int AS count FROM "resort_amenity" WHERE "resortProfileId" = $1`,
    [resort.id],
  );
  const serviceCount = await client.query(
    `SELECT COUNT(*)::int AS count FROM "resort_service" WHERE "resortProfileId" = $1`,
    [resort.id],
  );
  const roomCount = await client.query(
    `SELECT COUNT(*)::int AS count FROM "resort_room" WHERE "resortProfileId" = $1`,
    [resort.id],
  );
  const packageCount = await client.query(
    `SELECT COUNT(*)::int AS count FROM "resort_package" WHERE "resortProfileId" = $1`,
    [resort.id],
  );

  console.log(
    `Seeded ${resort.name || "Alrio Private Resort"}: ${amenityCount.rows[0].count} amenities, ${serviceCount.rows[0].count} services, ${roomCount.rows[0].count} rooms, and ${packageCount.rows[0].count} packages.`,
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
