/**
 * Protikkha Electric - Master A-Z Catalog Configuration & Seed Engine
 * 
 * Configures all 14 major electrical and industrial hardware product groups,
 * their hierarchical subcategories, units, and initial representative products
 * with technical specifications and packaging unit conversions.
 * 
 * IDEMPOTENT: Safe to run repeatedly; preserves all existing user records.
 */

import prisma from "@/lib/prisma";

export interface CatalogGroupConfig {
  categoryName: string;
  subcategories: string[];
  sampleProducts: Array<{
    name: string;
    code: string;
    subCategoryName: string;
    brandName: string;
    baseUnit: string;
    costPrice: number;
    sellPrice: number;
    wholesalePrice: number;
    initialStock: number;
    packaging?: {
      packagingUnit: string;
      ratio: number;
    };
    specs: {
      specType: string;
      conductorMaterial?: string;
      cableSize?: string;
      coreCount?: number;
      voltageGrade?: string;
      currentRating?: string;
      poleType?: string;
      breakingCapacity?: string;
      trippingCurve?: string;
      gangModule?: string;
      conduitDiameter?: string;
      wattage?: string;
      colorTemperature?: string;
      warrantyMonths?: number;
    };
  }>;
}

export const MASTER_14_CATALOG_GROUPS: CatalogGroupConfig[] = [
  // 1. Wires & Cables
  {
    categoryName: "Wires & Cables",
    subcategories: [
      "House Wiring (BYA / BYM)",
      "Flexible Twin & Multi-Core Cables",
      "Armoured Underground Cables",
      "Control & Signal Cables",
      "Solar DC Cables",
      "Submersible & Industrial Cables",
      "LAN & Coaxial Cables",
    ],
    sampleProducts: [
      {
        name: "BRB 1.5 RM Single Core Copper Wire (Red)",
        code: "PE-WIR-0001",
        subCategoryName: "House Wiring (BYA / BYM)",
        brandName: "BRB Cable Industries",
        baseUnit: "Meter",
        costPrice: 42,
        sellPrice: 48,
        wholesalePrice: 45,
        initialStock: 500,
        packaging: { packagingUnit: "Reel", ratio: 100 },
        specs: {
          specType: "CABLE",
          conductorMaterial: "Copper",
          cableSize: "1.5 RM",
          coreCount: 1,
          voltageGrade: "450/750V",
          warrantyMonths: 120,
        },
      },
      {
        name: "BBS 2.5 RM Single Core Copper Wire (Black)",
        code: "PE-WIR-0002",
        subCategoryName: "House Wiring (BYA / BYM)",
        brandName: "BBS Cables",
        baseUnit: "Meter",
        costPrice: 68,
        sellPrice: 78,
        wholesalePrice: 72,
        initialStock: 400,
        packaging: { packagingUnit: "Reel", ratio: 100 },
        specs: {
          specType: "CABLE",
          conductorMaterial: "Copper",
          cableSize: "2.5 RM",
          coreCount: 1,
          voltageGrade: "450/750V",
          warrantyMonths: 120,
        },
      },
      {
        name: "Paradise 4.0 RM Multi-Core Flexible Cable",
        code: "PE-WIR-0003",
        subCategoryName: "Flexible Twin & Multi-Core Cables",
        brandName: "Paradise Cables",
        baseUnit: "Meter",
        costPrice: 135,
        sellPrice: 155,
        wholesalePrice: 145,
        initialStock: 300,
        packaging: { packagingUnit: "Coil", ratio: 100 },
        specs: {
          specType: "CABLE",
          conductorMaterial: "Copper",
          cableSize: "4.0 RM",
          coreCount: 3,
          voltageGrade: "600/1000V",
          warrantyMonths: 60,
        },
      },
    ],
  },

  // 2. Pipes, Conduits, Trunking & Fittings
  {
    categoryName: "Pipes, Conduits & Fittings",
    subcategories: [
      "uPVC Electrical Conduits",
      "Flexible PVC & Metal Hoses",
      "Cable Trunking & PVC Channels",
      "Cable Trays & Ladders",
      "Junction Boxes, Couplers & Bends",
      "GI Pipes & Pipe Clamps",
    ],
    sampleProducts: [
      {
        name: "National PVC Electrical Conduit Pipe 20mm (10ft)",
        code: "PE-CND-0001",
        subCategoryName: "uPVC Electrical Conduits",
        brandName: "National Polymer",
        baseUnit: "Piece",
        costPrice: 65,
        sellPrice: 80,
        wholesalePrice: 72,
        initialStock: 150,
        packaging: { packagingUnit: "Bundle", ratio: 25 },
        specs: {
          specType: "CONDUIT",
          conduitDiameter: "20mm",
          warrantyMonths: 36,
        },
      },
      {
        name: "Gazi PVC Conduit Pipe 25mm Heavy Duty (10ft)",
        code: "PE-CND-0002",
        subCategoryName: "uPVC Electrical Conduits",
        brandName: "Gazi Pipes",
        baseUnit: "Piece",
        costPrice: 95,
        sellPrice: 115,
        wholesalePrice: 105,
        initialStock: 100,
        packaging: { packagingUnit: "Bundle", ratio: 20 },
        specs: {
          specType: "CONDUIT",
          conduitDiameter: "25mm",
          warrantyMonths: 36,
        },
      },
      {
        name: "Universal Flexible Metal Conduit Hose 20mm (50m)",
        code: "PE-CND-0003",
        subCategoryName: "Flexible PVC & Metal Hoses",
        brandName: "General Electric",
        baseUnit: "Meter",
        costPrice: 38,
        sellPrice: 48,
        wholesalePrice: 42,
        initialStock: 250,
        packaging: { packagingUnit: "Roll", ratio: 50 },
        specs: {
          specType: "CONDUIT",
          conduitDiameter: "20mm",
          warrantyMonths: 24,
        },
      },
    ],
  },

  // 3. Switches, Sockets & Accessories
  {
    categoryName: "Switches & Sockets",
    subcategories: [
      "Modular Piano & Plate Switches",
      "Universal & Multi Sockets",
      "Fan Speed Regulators & Dimmers",
      "Extension Boards & Spike Guards",
      "Doorbells & Chime Switches",
      "Industrial Plugs & Heavy Receptacles",
    ],
    sampleProducts: [
      {
        name: "Super Star Premier 1-Gang Light Switch",
        code: "PE-SWT-0001",
        subCategoryName: "Modular Piano & Plate Switches",
        brandName: "Super Star Group",
        baseUnit: "Pcs",
        costPrice: 90,
        sellPrice: 115,
        wholesalePrice: 102,
        initialStock: 120,
        packaging: { packagingUnit: "Box", ratio: 10 },
        specs: {
          specType: "SWITCH",
          gangModule: "1-Gang",
          currentRating: "10A",
          warrantyMonths: 60,
        },
      },
      {
        name: "Super Star Premier 2-Gang Light Switch",
        code: "PE-SWT-0002",
        subCategoryName: "Modular Piano & Plate Switches",
        brandName: "Super Star Group",
        baseUnit: "Pcs",
        costPrice: 155,
        sellPrice: 195,
        wholesalePrice: 175,
        initialStock: 80,
        packaging: { packagingUnit: "Box", ratio: 10 },
        specs: {
          specType: "SWITCH",
          gangModule: "2-Gang",
          currentRating: "10A",
          warrantyMonths: 60,
        },
      },
      {
        name: "Click Elegance Universal 3-Pin Socket with Switch",
        code: "PE-SWT-0003",
        subCategoryName: "Universal & Multi Sockets",
        brandName: "Click",
        baseUnit: "Pcs",
        costPrice: 180,
        sellPrice: 225,
        wholesalePrice: 200,
        initialStock: 90,
        packaging: { packagingUnit: "Box", ratio: 10 },
        specs: {
          specType: "SWITCH",
          gangModule: "Socket",
          currentRating: "16A",
          warrantyMonths: 36,
        },
      },
    ],
  },

  // 4. Lighting & Luminaires
  {
    categoryName: "Lighting & Luminaires",
    subcategories: [
      "LED Bulbs & Battens (Tube Lights)",
      "LED Panel Lights & Ceiling Downlights",
      "Floodlights & Streetlights",
      "Industrial High-Bay Lights",
      "Rechargeable Emergency Lights",
      "Decorative Spotlights & LED Strips",
    ],
    sampleProducts: [
      {
        name: "Super Star 9W LED Bulb (Daylight 6500K)",
        code: "PE-LGT-0001",
        subCategoryName: "LED Bulbs & Battens (Tube Lights)",
        brandName: "Super Star Group",
        baseUnit: "Pcs",
        costPrice: 120,
        sellPrice: 150,
        wholesalePrice: 135,
        initialStock: 150,
        packaging: { packagingUnit: "Carton", ratio: 50 },
        specs: {
          specType: "LIGHTING",
          wattage: "9W",
          colorTemperature: "Daylight 6500K",
          warrantyMonths: 24,
        },
      },
      {
        name: "Transtec 18W Slim LED Panel Downlight (Warm White)",
        code: "PE-LGT-0002",
        subCategoryName: "LED Panel Lights & Ceiling Downlights",
        brandName: "Transtec Lighting",
        baseUnit: "Pcs",
        costPrice: 320,
        sellPrice: 420,
        wholesalePrice: 370,
        initialStock: 60,
        packaging: { packagingUnit: "Box", ratio: 20 },
        specs: {
          specType: "LIGHTING",
          wattage: "18W",
          colorTemperature: "Warm White 3000K",
          warrantyMonths: 24,
        },
      },
      {
        name: "Philips 50W Outdoor Waterproof LED Floodlight",
        code: "PE-LGT-0003",
        subCategoryName: "Floodlights & Streetlights",
        brandName: "Philips",
        baseUnit: "Pcs",
        costPrice: 1450,
        sellPrice: 1850,
        wholesalePrice: 1650,
        initialStock: 25,
        packaging: { packagingUnit: "Piece", ratio: 1 },
        specs: {
          specType: "LIGHTING",
          wattage: "50W",
          colorTemperature: "Daylight 6500K",
          warrantyMonths: 36,
        },
      },
    ],
  },

  // 5. Circuit Protection & Distribution
  {
    categoryName: "Circuit Breakers & Protection",
    subcategories: [
      "Miniature Circuit Breakers (MCB)",
      "Moulded Case Circuit Breakers (MCCB)",
      "Residual Current Devices (RCCB / RCBO)",
      "Main Distribution Boards & Sub-Panels",
      "Changeover Switches & Isolators",
      "HRC Fuses & Cut-Out Bases",
    ],
    sampleProducts: [
      {
        name: "Schneider Easy9 16A Single Pole MCB",
        code: "PE-BRK-0001",
        subCategoryName: "Miniature Circuit Breakers (MCB)",
        brandName: "Schneider Electric",
        baseUnit: "Pcs",
        costPrice: 240,
        sellPrice: 310,
        wholesalePrice: 275,
        initialStock: 100,
        packaging: { packagingUnit: "Box", ratio: 12 },
        specs: {
          specType: "BREAKER",
          currentRating: "16A",
          poleType: "1P",
          breakingCapacity: "6kA",
          trippingCurve: "C",
          warrantyMonths: 36,
        },
      },
      {
        name: "Schneider Easy9 32A Double Pole MCB (2P)",
        code: "PE-BRK-0002",
        subCategoryName: "Miniature Circuit Breakers (MCB)",
        brandName: "Schneider Electric",
        baseUnit: "Pcs",
        costPrice: 520,
        sellPrice: 650,
        wholesalePrice: 580,
        initialStock: 50,
        packaging: { packagingUnit: "Box", ratio: 6 },
        specs: {
          specType: "BREAKER",
          currentRating: "32A",
          poleType: "2P",
          breakingCapacity: "6kA",
          trippingCurve: "C",
          warrantyMonths: 36,
        },
      },
      {
        name: "ABB 40A 4-Pole RCCB Earth Leakage 30mA",
        code: "PE-BRK-0003",
        subCategoryName: "Residual Current Devices (RCCB / RCBO)",
        brandName: "ABB",
        baseUnit: "Pcs",
        costPrice: 2200,
        sellPrice: 2650,
        wholesalePrice: 2400,
        initialStock: 20,
        packaging: { packagingUnit: "Box", ratio: 1 },
        specs: {
          specType: "BREAKER",
          currentRating: "40A",
          poleType: "4P",
          breakingCapacity: "10kA",
          trippingCurve: "C",
          warrantyMonths: 36,
        },
      },
    ],
  },

  // 6. Contactors, Relays & Automation
  {
    categoryName: "Contactors, Relays & Automation",
    subcategories: [
      "AC Magnetic Contactors",
      "Thermal Overload Relays",
      "Electronic Timers & Digital Counters",
      "Push Buttons, Selectors & Indicator Lamps",
      "Limit Switches & Proximity Sensors",
      "Phase Failure & Voltage Monitoring Relays",
    ],
    sampleProducts: [
      {
        name: "Chint NC1-2510 25A 3-Pole Magnetic Contactor 220V",
        code: "PE-AUT-0001",
        subCategoryName: "AC Magnetic Contactors",
        brandName: "Chint Global",
        baseUnit: "Pcs",
        costPrice: 950,
        sellPrice: 1200,
        wholesalePrice: 1080,
        initialStock: 35,
        specs: {
          specType: "GENERAL",
          currentRating: "25A",
          voltageGrade: "220V AC",
          warrantyMonths: 24,
        },
      },
      {
        name: "Chint NR2-25 Thermal Overload Relay (12A-18A)",
        code: "PE-AUT-0002",
        subCategoryName: "Thermal Overload Relays",
        brandName: "Chint Global",
        baseUnit: "Pcs",
        costPrice: 650,
        sellPrice: 820,
        wholesalePrice: 740,
        initialStock: 30,
        specs: {
          specType: "GENERAL",
          currentRating: "18A",
          warrantyMonths: 24,
        },
      },
      {
        name: "Omron H3Y-2 Analog On-Delay Timer Relay (220VAC)",
        code: "PE-AUT-0003",
        subCategoryName: "Electronic Timers & Digital Counters",
        brandName: "Omron",
        baseUnit: "Pcs",
        costPrice: 480,
        sellPrice: 620,
        wholesalePrice: 550,
        initialStock: 40,
        specs: {
          specType: "GENERAL",
          voltageGrade: "220VAC",
          warrantyMonths: 12,
        },
      },
    ],
  },

  // 7. Motors, Pumps, Fans & Spare Parts
  {
    categoryName: "Motors, Pumps & Fans",
    subcategories: [
      "Single-Phase & 3-Phase Induction Motors",
      "Domestic & Submersible Water Pumps",
      "Industrial Centrifugal Pumps",
      "Ceiling Fans & High-Speed Exhaust Fans",
      "Motor Starting & Running Capacitors",
      "Pump Mechanical Seals & Bearings",
    ],
    sampleProducts: [
      {
        name: "Pedrollo 1.0 HP Domestic Water Pump (1x1 Inch)",
        code: "PE-MOT-0001",
        subCategoryName: "Domestic & Submersible Water Pumps",
        brandName: "Pedrollo",
        baseUnit: "Pcs",
        costPrice: 6800,
        sellPrice: 7800,
        wholesalePrice: 7250,
        initialStock: 15,
        specs: {
          specType: "GENERAL",
          voltageGrade: "220V",
          warrantyMonths: 24,
        },
      },
      {
        name: "BRB Supreme 56 Inch Ceiling Fan (White)",
        code: "PE-MOT-0002",
        subCategoryName: "Ceiling Fans & High-Speed Exhaust Fans",
        brandName: "BRB Fans",
        baseUnit: "Pcs",
        costPrice: 2750,
        sellPrice: 3350,
        wholesalePrice: 3050,
        initialStock: 45,
        packaging: { packagingUnit: "Box", ratio: 1 },
        specs: {
          specType: "GENERAL",
          wattage: "75W",
          voltageGrade: "220V",
          warrantyMonths: 36,
        },
      },
      {
        name: "Amber 3.5 uF Fan Capacitor 450V AC",
        code: "PE-MOT-0003",
        subCategoryName: "Motor Starting & Running Capacitors",
        brandName: "Amber Capacitors",
        baseUnit: "Pcs",
        costPrice: 42,
        sellPrice: 65,
        wholesalePrice: 52,
        initialStock: 200,
        packaging: { packagingUnit: "Box", ratio: 50 },
        specs: {
          specType: "ACCESSORY",
          voltageGrade: "450V AC",
          warrantyMonths: 12,
        },
      },
    ],
  },

  // 8. Power Tools, Machinery & Welding
  {
    categoryName: "Power Tools, Machinery & Welding",
    subcategories: [
      "Electric Drills & Impact Drivers",
      "Angle Grinders & Metal Cutters",
      "Rotary Hammers & Demolition Breakers",
      "Inverter Arc & TIG Welding Machines",
      "Drill Bits, Grinding Discs & Saw Blades",
      "Carbon Brushes, Armatures & Tool Spares",
    ],
    sampleProducts: [
      {
        name: "Bosch GWS 750-100 Heavy Duty Angle Grinder 4 Inch",
        code: "PE-TLS-0001",
        subCategoryName: "Angle Grinders & Metal Cutters",
        brandName: "Bosch",
        baseUnit: "Pcs",
        costPrice: 3800,
        sellPrice: 4450,
        wholesalePrice: 4100,
        initialStock: 18,
        specs: {
          specType: "GENERAL",
          wattage: "750W",
          voltageGrade: "220V",
          warrantyMonths: 12,
        },
      },
      {
        name: "Makita HR2470 24mm Rotary Hammer Drill (780W)",
        code: "PE-TLS-0002",
        subCategoryName: "Rotary Hammers & Demolition Breakers",
        brandName: "Makita",
        baseUnit: "Pcs",
        costPrice: 8200,
        sellPrice: 9600,
        wholesalePrice: 8900,
        initialStock: 10,
        specs: {
          specType: "GENERAL",
          wattage: "780W",
          voltageGrade: "220V",
          warrantyMonths: 12,
        },
      },
      {
        name: "Riland ARC 200 Inverter Welding Machine (Single Phase)",
        code: "PE-TLS-0003",
        subCategoryName: "Inverter Arc & TIG Welding Machines",
        brandName: "Riland",
        baseUnit: "Pcs",
        costPrice: 11500,
        sellPrice: 13800,
        wholesalePrice: 12600,
        initialStock: 8,
        specs: {
          specType: "GENERAL",
          currentRating: "200A",
          voltageGrade: "220V",
          warrantyMonths: 18,
        },
      },
    ],
  },

  // 9. Nuts, Bolts, Screws & Fasteners
  {
    categoryName: "Nuts, Bolts, Screws & Fasteners",
    subcategories: [
      "Hex Head Bolts & Hex Nuts (MS / SS)",
      "Heavy Anchor Bolts & Rawlbolts",
      "Self-Tapping Wood & Gypsum Screws",
      "Threaded Stud Rods (1m / 2m)",
      "Flat & Spring Washers",
      "Nylon & Metal Wall Plugs (Royal Plugs)",
    ],
    sampleProducts: [
      {
        name: "Galvanized Hex Bolt & Nut M10 x 50mm",
        code: "PE-FST-0001",
        subCategoryName: "Hex Head Bolts & Hex Nuts (MS / SS)",
        brandName: "Crown Fasteners",
        baseUnit: "Piece",
        costPrice: 6.5,
        sellPrice: 10,
        wholesalePrice: 8,
        initialStock: 800,
        packaging: { packagingUnit: "Packet", ratio: 100 },
        specs: {
          specType: "ACCESSORY",
          conductorMaterial: "Galvanized Steel",
          warrantyMonths: 0,
        },
      },
      {
        name: "Heavy Duty Expansion Anchor Bolt M12 x 100mm",
        code: "PE-FST-0002",
        subCategoryName: "Heavy Anchor Bolts & Rawlbolts",
        brandName: "Crown Fasteners",
        baseUnit: "Piece",
        costPrice: 28,
        sellPrice: 40,
        wholesalePrice: 34,
        initialStock: 350,
        packaging: { packagingUnit: "Box", ratio: 50 },
        specs: {
          specType: "ACCESSORY",
          conductorMaterial: "Carbon Steel",
          warrantyMonths: 0,
        },
      },
      {
        name: "Drywall Self-Tapping Black Screws 1.5 Inch",
        code: "PE-FST-0003",
        subCategoryName: "Self-Tapping Wood & Gypsum Screws",
        brandName: "Star Screws",
        baseUnit: "Piece",
        costPrice: 0.8,
        sellPrice: 1.5,
        wholesalePrice: 1.1,
        initialStock: 2500,
        packaging: { packagingUnit: "Box", ratio: 500 },
        specs: {
          specType: "ACCESSORY",
          conductorMaterial: "Hardened Steel",
          warrantyMonths: 0,
        },
      },
    ],
  },

  // 10. Cable Lugs, Glands & Earthing
  {
    categoryName: "Cable Lugs, Glands & Earthing",
    subcategories: [
      "Copper & Aluminium Compression Lugs",
      "Brass Cable Glands & PG Glands",
      "Din-Rail Terminal Blocks & Busbar Strips",
      "Heat Shrink Sleeves & Insulation Tapes",
      "Pure Copper Earthing Rods & Clamps",
      "Bentonite Compound & Earth Pit Covers",
    ],
    sampleProducts: [
      {
        name: "Pure Copper Cable Lug 70 RM (M12 Hole)",
        code: "PE-EAR-0001",
        subCategoryName: "Copper & Aluminium Compression Lugs",
        brandName: "BICC Components",
        baseUnit: "Pcs",
        costPrice: 48,
        sellPrice: 70,
        wholesalePrice: 58,
        initialStock: 300,
        packaging: { packagingUnit: "Packet", ratio: 50 },
        specs: {
          specType: "ACCESSORY",
          conductorMaterial: "Copper",
          cableSize: "70 RM",
          warrantyMonths: 24,
        },
      },
      {
        name: "Brass Waterproof Cable Gland PG-21 (with Locknut)",
        code: "PE-EAR-0002",
        subCategoryName: "Brass Cable Glands & PG Glands",
        brandName: "BICC Components",
        baseUnit: "Pcs",
        costPrice: 65,
        sellPrice: 95,
        wholesalePrice: 80,
        initialStock: 180,
        packaging: { packagingUnit: "Packet", ratio: 20 },
        specs: {
          specType: "ACCESSORY",
          conduitDiameter: "21mm",
          warrantyMonths: 24,
        },
      },
      {
        name: "Pure Solid Copper Earthing Rod 10ft (5/8 Inch)",
        code: "PE-EAR-0003",
        subCategoryName: "Pure Copper Earthing Rods & Clamps",
        brandName: "BRB Earthing",
        baseUnit: "Piece",
        costPrice: 2850,
        sellPrice: 3450,
        wholesalePrice: 3100,
        initialStock: 25,
        specs: {
          specType: "ACCESSORY",
          conductorMaterial: "Copper",
          conduitDiameter: "16mm (5/8\")",
          warrantyMonths: 120,
        },
      },
    ],
  },

  // 11. Transformers, UPS, Solar & Inverters
  {
    categoryName: "Transformers, UPS & Solar",
    subcategories: [
      "Automatic Voltage Stabilizers (AC / Fridge)",
      "Offline & Online UPS Systems",
      "Sine Wave Inverters & IPS Units",
      "Deep Cycle Tubular & Solar Batteries",
      "Monocrystalline Solar PV Panels",
      "MPPT Solar Charge Controllers",
    ],
    sampleProducts: [
      {
        name: "Walton 1200VA Automatic Voltage Stabilizer",
        code: "PE-PWR-0001",
        subCategoryName: "Automatic Voltage Stabilizers (AC / Fridge)",
        brandName: "Walton",
        baseUnit: "Pcs",
        costPrice: 2400,
        sellPrice: 2950,
        wholesalePrice: 2700,
        initialStock: 16,
        specs: {
          specType: "GENERAL",
          voltageGrade: "140V-260V",
          wattage: "1200VA",
          warrantyMonths: 36,
        },
      },
      {
        name: "Prolink 650VA Offline Desktop UPS with Battery",
        code: "PE-PWR-0002",
        subCategoryName: "Offline & Online UPS Systems",
        brandName: "Prolink",
        baseUnit: "Pcs",
        costPrice: 2650,
        sellPrice: 3250,
        wholesalePrice: 2950,
        initialStock: 20,
        specs: {
          specType: "GENERAL",
          wattage: "360W / 650VA",
          voltageGrade: "220V",
          warrantyMonths: 24,
        },
      },
      {
        name: "Luminous Zelio+ 1100 Pure Sine Wave IPS Inverter",
        code: "PE-PWR-0003",
        subCategoryName: "Sine Wave Inverters & IPS Units",
        brandName: "Luminous",
        baseUnit: "Pcs",
        costPrice: 11200,
        sellPrice: 13200,
        wholesalePrice: 12200,
        initialStock: 7,
        specs: {
          specType: "GENERAL",
          wattage: "900VA / 756W",
          voltageGrade: "12V DC to 220V AC",
          warrantyMonths: 24,
        },
      },
    ],
  },

  // 12. Testing Instruments, Tools & Safety
  {
    categoryName: "Testing Instruments & Tools",
    subcategories: [
      "Digital Multimeters & Clamp Meters",
      "Insulation Resistance Testers (Megger)",
      "Non-Contact AC Voltage Detectors",
      "Electrician Pliers, Cutters & Screwdriver Sets",
      "Heavy Ratchet Cable Cutters & Lug Crimpers",
      "High Voltage Insulated Safety Gloves & Boots",
    ],
    sampleProducts: [
      {
        name: "Uni-T UT33D+ Digital Pocket Multimeter",
        code: "PE-TST-0001",
        subCategoryName: "Digital Multimeters & Clamp Meters",
        brandName: "Uni-T",
        baseUnit: "Pcs",
        costPrice: 850,
        sellPrice: 1100,
        wholesalePrice: 970,
        initialStock: 25,
        specs: {
          specType: "GENERAL",
          voltageGrade: "600V CAT II",
          warrantyMonths: 12,
        },
      },
      {
        name: "Uni-T UT202A+ 600A AC Digital Clamp Meter",
        code: "PE-TST-0002",
        subCategoryName: "Digital Multimeters & Clamp Meters",
        brandName: "Uni-T",
        baseUnit: "Pcs",
        costPrice: 2100,
        sellPrice: 2650,
        wholesalePrice: 2350,
        initialStock: 15,
        specs: {
          specType: "GENERAL",
          currentRating: "600A AC",
          voltageGrade: "600V",
          warrantyMonths: 12,
        },
      },
      {
        name: "Knipex 8-Inch Insulated Electrician Combination Pliers 1000V",
        code: "PE-TST-0003",
        subCategoryName: "Electrician Pliers, Cutters & Screwdriver Sets",
        brandName: "Knipex",
        baseUnit: "Pcs",
        costPrice: 1650,
        sellPrice: 2100,
        wholesalePrice: 1880,
        initialStock: 20,
        specs: {
          specType: "ACCESSORY",
          voltageGrade: "1000V Insulated",
          warrantyMonths: 60,
        },
      },
    ],
  },

  // 13. Plumbing & General Industrial Supplies
  {
    categoryName: "Plumbing & Industrial Supplies",
    subcategories: [
      "PVC Water Supply Pipes & Fittings",
      "Brass Ball Valves, Gate Valves & Taps",
      "Deep Groove Ball Bearings (6200-6300 Series)",
      "V-Belts & Transmission Pulleys",
      "Industrial Teflon Tapes & Pipe Sealants",
      "Welding Electrodes & Industrial Solvents",
    ],
    sampleProducts: [
      {
        name: "Gazi Brass Ball Valve 1.0 Inch (Heavy Duty)",
        code: "PE-PLM-0001",
        subCategoryName: "Brass Ball Valves, Gate Valves & Taps",
        brandName: "Gazi",
        baseUnit: "Pcs",
        costPrice: 380,
        sellPrice: 480,
        wholesalePrice: 425,
        initialStock: 60,
        packaging: { packagingUnit: "Box", ratio: 10 },
        specs: {
          specType: "ACCESSORY",
          conduitDiameter: "1.0 Inch",
          warrantyMonths: 24,
        },
      },
      {
        name: "SKF 6204 Deep Groove Ball Bearing (Rubber Shielded)",
        code: "PE-PLM-0002",
        subCategoryName: "Deep Groove Ball Bearings (6200-6300 Series)",
        brandName: "SKF",
        baseUnit: "Pcs",
        costPrice: 195,
        sellPrice: 260,
        wholesalePrice: 225,
        initialStock: 90,
        packaging: { packagingUnit: "Box", ratio: 10 },
        specs: {
          specType: "ACCESSORY",
          warrantyMonths: 12,
        },
      },
      {
        name: "Esab 6013 Mild Steel Welding Electrodes 3.2mm (5kg Pack)",
        code: "PE-PLM-0003",
        subCategoryName: "Welding Electrodes & Industrial Solvents",
        brandName: "Esab",
        baseUnit: "Pack",
        costPrice: 1050,
        sellPrice: 1250,
        wholesalePrice: 1140,
        initialStock: 40,
        specs: {
          specType: "GENERAL",
          warrantyMonths: 0,
        },
      },
    ],
  },

  // 14. Consumables & Replacement Parts
  {
    categoryName: "Consumables & Replacement Parts",
    subcategories: [
      "PVC Electrical Insulation Tape (7 Colors)",
      "Power Tool Carbon Brushes (Hitachi/Makita)",
      "Soldering Wire & Rosin Flux",
      "Nylon Cable Ties (4, 8, 12 Inch)",
      "Indicator Bulbs & Miniature Pilot Lamps",
      "Replacement Fuse Links & Terminal Strips",
    ],
    sampleProducts: [
      {
        name: "Super Star High-Adhesive PVC Insulation Tape (Black)",
        code: "PE-CON-0001",
        subCategoryName: "PVC Electrical Insulation Tape (7 Colors)",
        brandName: "Super Star Group",
        baseUnit: "Pcs",
        costPrice: 16,
        sellPrice: 25,
        wholesalePrice: 20,
        initialStock: 500,
        packaging: { packagingUnit: "Pack", ratio: 10 },
        specs: {
          specType: "ACCESSORY",
          voltageGrade: "600V",
          warrantyMonths: 0,
        },
      },
      {
        name: "Self-Locking Nylon Cable Ties 8-Inch (100 Pcs/Pack)",
        code: "PE-CON-0002",
        subCategoryName: "Nylon Cable Ties (4, 8, 12 Inch)",
        brandName: "Crown Fasteners",
        baseUnit: "Pack",
        costPrice: 75,
        sellPrice: 110,
        wholesalePrice: 90,
        initialStock: 200,
        packaging: { packagingUnit: "Bag", ratio: 10 },
        specs: {
          specType: "ACCESSORY",
          warrantyMonths: 0,
        },
      },
      {
        name: "60/40 Tin-Lead Rosin Core Soldering Wire Reel (100g)",
        code: "PE-CON-0003",
        subCategoryName: "Soldering Wire & Rosin Flux",
        brandName: "General Electric",
        baseUnit: "Reel",
        costPrice: 240,
        sellPrice: 320,
        wholesalePrice: 280,
        initialStock: 75,
        specs: {
          specType: "ACCESSORY",
          warrantyMonths: 0,
        },
      },
    ],
  },
];

/**
 * Execute master seed idempotent sync
 */
export async function seedMasterCatalog(adminUserId: number = 1) {
  console.log("[MasterCatalogSeed] Starting A-Z catalog configuration check...");

  let categoriesCreated = 0;
  let subcategoriesCreated = 0;
  let productsCreated = 0;

  for (const group of MASTER_14_CATALOG_GROUPS) {
    // 1. Ensure Category exists
    let cat = await prisma.categories.findFirst({
      where: { category_name: group.categoryName },
    });

    if (!cat) {
      cat = await prisma.categories.create({
        data: {
          category_name: group.categoryName,
          status: "active",
          user_id: BigInt(adminUserId),
        },
      });
      categoriesCreated++;
    }

    const catId = cat.id;

    // 2. Ensure Subcategories exist
    const subCatMap = new Map<string, bigint>();
    for (const subName of group.subcategories) {
      let sub = await prisma.sub_categories.findFirst({
        where: {
          category_id: catId,
          sub_category_name: subName,
        },
      });

      if (!sub) {
        sub = await prisma.sub_categories.create({
          data: {
            category_id: catId,
            sub_category_name: subName,
            status: "active",
            user_id: BigInt(adminUserId),
          },
        });
        subcategoriesCreated++;
      }
      subCatMap.set(subName, sub.id);
    }

    // 3. Ensure Sample Products exist
    for (const prod of group.sampleProducts) {
      // Check if product code already exists
      const existing = await prisma.$queryRawUnsafe<any[]>(
        "SELECT id FROM products WHERE product_code LIKE ? LIMIT 1",
        `%${prod.code}%`
      );

      if (existing && existing.length > 0) {
        continue; // Already seeded, preserve existing record
      }

      // Ensure Brand exists
      let brand = await prisma.brands.findFirst({
        where: { name: prod.brandName },
      });
      if (!brand) {
        brand = await prisma.brands.create({
          data: {
            name: prod.brandName,
            status: "active",
            user_id: BigInt(adminUserId),
          },
        });
      }

      // Ensure Unit exists
      let unit = await prisma.units.findFirst({
        where: { unit_name: prod.baseUnit },
      });
      if (!unit) {
        unit = await prisma.units.create({
          data: {
            unit_name: prod.baseUnit,
            status: "active",
            user_id: BigInt(adminUserId),
          },
        });
      }

      const subId = subCatMap.get(prod.subCategoryName) || null;

      // Create Product in atomic transaction
      await prisma.$transaction(async (tx) => {
        const newProd = await tx.products.create({
          data: {
            product_name: prod.name,
            product_code: JSON.stringify([prod.code]),
            category_id: catId,
            sub_category_id: subId,
            brand_id: brand.id,
            unit_id: unit.id,
            user_id: BigInt(adminUserId),
            cost_price: String(prod.costPrice),
            sell_price: String(prod.sellPrice),
            wholesale_price: String(prod.wholesalePrice),
            quantity: String(prod.initialStock),
            status: "active",
          },
        });

        // Electrical specifications
        if (prod.specs) {
          await tx.electrical_specifications.create({
            data: {
              product_id: newProd.id,
              spec_type: prod.specs.specType || "GENERAL",
              conductor_material: prod.specs.conductorMaterial || null,
              cable_size: prod.specs.cableSize || null,
              core_count: prod.specs.coreCount || 1,
              voltage_grade: prod.specs.voltageGrade || null,
              current_rating: prod.specs.currentRating || null,
              pole_type: prod.specs.poleType || null,
              breaking_capacity: prod.specs.breakingCapacity || null,
              tripping_curve: prod.specs.trippingCurve || null,
              gang_module: prod.specs.gangModule || null,
              conduit_diameter: prod.specs.conduitDiameter || null,
              wattage: prod.specs.wattage || null,
              color_temperature: prod.specs.colorTemperature || null,
              warranty_months: prod.specs.warrantyMonths || 0,
            },
          });
        }

        // Packaging conversion
        if (prod.packaging && prod.packaging.ratio > 1) {
          await tx.packaging_conversions.create({
            data: {
              product_id: newProd.id,
              packaging_unit: prod.packaging.packagingUnit,
              base_unit: prod.baseUnit,
              conversion_ratio: String(prod.packaging.ratio),
              is_default: true,
            },
          });
        }

        // Opening stock movement ledger
        if (prod.initialStock > 0) {
          await tx.stock_movements.create({
            data: {
              product_id: newProd.id,
              movement_type: "OPENING_STOCK",
              quantity: String(prod.initialStock),
              unit_price: String(prod.costPrice),
              total_value: String(prod.initialStock * prod.costPrice),
              reference_type: "OPENING_STOCK",
              reference_no: `SEED-${prod.code}`,
              stock_after: String(prod.initialStock),
              note: `Initial Master Catalog Setup (${prod.initialStock} ${prod.baseUnit})`,
              user_id: BigInt(adminUserId),
            },
          });
        }

        productsCreated++;
      });
    }
  }

  console.log(
    `[MasterCatalogSeed] Completed! Created: ${categoriesCreated} categories, ${subcategoriesCreated} subcategories, ${productsCreated} products.`
  );

  return {
    categoriesCreated,
    subcategoriesCreated,
    productsCreated,
  };
}
