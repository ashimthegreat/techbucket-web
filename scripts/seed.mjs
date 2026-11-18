// Seeds the database with Tech Bucket's starting content.
// Safe to re-run: it only inserts content into empty tables.
// Usage: node scripts/seed.mjs
import "./load-env.mjs";
import pg from "pg";

const { DATABASE_URL, DATABASE_SSL } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

async function isEmpty(table) {
  const r = await client.query(`select count(*)::int as n from ${table}`);
  return r.rows[0].n === 0;
}

async function insertMany(table, rows) {
  if (!(await isEmpty(table))) {
    console.log(`- ${table}: already has data, skipped`);
    return;
  }
  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = Object.values(row).map((v) =>
      v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v,
    );
    const params = cols.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `insert into ${table} (${cols.map((c) => `"${c}"`).join(", ")}) values (${params})`,
      vals,
    );
  }
  console.log(`+ ${table}: ${rows.length} rows`);
}

const settings = {
  id: 1,
  company_name: "Tech Bucket Pvt. Ltd.",
  tagline: "All tech needs in a single bucket.",
  hero_eyebrow: "IT consulting · Cybersecurity · Managed services",
  hero_title: "Technology that keeps Nepal running",
  hero_subtitle:
    "We plan, build, secure and run the systems that hospitals, public institutions and enterprises cannot afford to lose.",
  about_statement:
    "Tech Bucket is an IT consulting, cybersecurity and infrastructure firm built in Nepal.",
  about_statement_muted:
    "Since 2019 we have helped hospitals, development partners, public institutions and enterprises invest in the right technology — and keep it working, 24 hours a day.",
  about_body:
    "Tech Bucket was founded to give entrepreneurs, small businesses and enterprises the technical expertise, guidance and support they need to run efficiently and grow. Our engineers specialise in networking, systems and security, hardware and software solutions.\n\nWe are vendor-independent. Rather than pushing a product, we start with your needs, prioritise what really has to be done, and plan IT investment that fits your budget — then deliver, document and support it.",
  mission:
    "To meet the technology needs of individuals and organisations in an integrated way, through efficient and strategic implementation of information technology.",
  vision:
    "To be Nepal's most trusted partner for integrated IT solutions and infrastructure — known for perseverance, the ability to adapt, and innovation.",
  values: ["Customer satisfaction", "Research & development", "Innovation, not imitation"],
  address: "Balaju-16, Kathmandu",
  address_locality: "Kathmandu",
  address_region: "Bagmati Province",
  phone_primary: "01-4543897",
  phone_secondary: "9801151658",
  email: "info@techbucket.com.np",
  lead_notify_email: "info@techbucket.com.np",
  vat_number: "609605497",
  founded_year: 2019,
  socials: {},
  default_seo_title: "Tech Bucket | IT Consulting, Cybersecurity & Managed Services in Nepal",
  default_seo_description:
    "Tech Bucket Pvt. Ltd. is a Kathmandu-based IT consulting, cybersecurity, network, cloud and managed services firm trusted by hospitals, development partners, public institutions and enterprises across Nepal.",
};

const services = [
  {
    slug: "it-consultancy",
    title: "IT strategy & consultancy",
    summary: "Vendor-neutral advice to plan technology investment around your goals and budget.",
    highlights: ["Free initial assessment", "Prioritised IT roadmap", "Budget-fit recommendations", "Procurement & tender support"],
    body: "Every vendor will tell you their product is the one you need. We start from the other end: your business, your constraints and your budget.\n\n## How we work\n\n1. **Assess** what you already have — network, servers, software, security and support arrangements.\n2. **Prioritise** what has to be done now, what can wait, and what you don't need at all.\n3. **Plan** an investment roadmap that fits your budget, with clear options at each step.\n\n## What you get\n\n- A written assessment of your current IT environment\n- A prioritised checklist of work, with indicative costs\n- Independent advice on vendors and products — we are not tied to any one brand\n- Support preparing specifications for tenders and quotations",
  },
  {
    slug: "network-management",
    title: "Network design & management",
    summary: "Managed wireless, managed LAN and multi-site WAN — designed, built and run by our engineers.",
    highlights: ["Managed Wi-Fi & LAN", "Multi-location WAN", "Wi-Fi heat-mapping", "24/7 monitoring"],
    body: "Day-to-day business now depends on the network. A few minutes of downtime can disrupt operations and damage your reputation.\n\n## Our network services\n\n- **Managed wireless** — survey, heat-mapping, design and installation of enterprise Wi-Fi\n- **Managed LAN** — structured cabling, switching, VLAN design and documentation\n- **Multi-location WAN** — secure site-to-site connectivity for branches and campuses\n- **Ongoing management** — monitoring, firmware, change management and support\n\nOur engineers determine your needs, prepare a prioritised checklist and recommend the best possible solution for your budget.",
  },
  {
    slug: "cybersecurity",
    title: "Cybersecurity",
    summary: "Next-generation firewalls, UTM, IPS, MFA, email and endpoint protection, plus physical perimeter security.",
    highlights: ["Firewalls, UTM & IPS", "MFA & access management", "Email & endpoint protection", "CCTV & access control"],
    body: "Firewalls and passwords alone are no longer enough. We secure every layer of your IT environment.\n\n## Layers we protect\n\n- **Network & system security** — next-generation firewalls, UTM, intrusion prevention, VPN gateways and command-and-control detection\n- **Data & application security** — web application firewalls, data monitoring, database replication and secure VPN\n- **MFA & access management** — OTP, biometric and PKI-based authentication with full audit trails, for modern and legacy applications\n- **Email security** — protection against phishing, malware and data leakage, with policy and compliance controls\n- **Endpoint protection** — behaviour-based detection that stops malware and zero-day threats\n- **Perimeter & physical security** — CCTV surveillance, visitor management, fire alarm and IP door access control\n\nWe are not tied to one vendor, so the solution fits your environment and budget.",
  },
  {
    slug: "servers-storage",
    title: "Servers & storage",
    summary: "NAS, SAN, tower, rack and blade servers, sized to your workload and backed by warranty plans.",
    highlights: ["Capacity & performance sizing", "NAS & SAN", "Rack, tower & blade servers", "Rollback-planned deployment"],
    body: "We assess the state of your infrastructure and its requirements for reliability, capacity, performance and type — then recommend the right servers or storage with a warranty service plan.\n\n## Deployment done properly\n\n- The right equipment, sized for your workload\n- Deployment with a documented rollback plan\n- Joint testing of key functionality with your team\n- Handover documentation and support\n\nWe supply Network Attached Storage, Storage Area Networks, tower, rack and blade servers and file servers at competitive prices.",
  },
  {
    slug: "software-applications",
    title: "Software & applications",
    summary: "Cross-platform and cloud applications, UX/UI, and ready-made visitor and asset management systems.",
    highlights: ["Custom web & mobile apps", "Cloud applications", "UX/UI design", "Visitor & asset management"],
    body: "Our application team builds compatible, scalable and flexible software for organisations of every kind.\n\n## What we build\n\n- Cross-platform web and mobile applications\n- Cloud-native application development\n- UX/UI design and development\n- Ready-made **Visitor Management** and **Asset Management** systems\n- Healthcare information systems, including patient-record systems",
  },
  {
    slug: "backup-monitoring",
    title: "Backup, recovery & monitoring",
    summary: "Enterprise backup, off-site disaster recovery, network monitoring and SIEM.",
    highlights: ["Enterprise backup", "Off-site disaster recovery", "Network monitoring", "SIEM"],
    body: "The question is not *if* something will go wrong, but *when*. Data breaches, hardware failure and cyber attacks are all costly — planning for them is not.\n\n## Backup & recovery\n\nOur enterprise backup solutions are flexible and adaptable, with off-site backup and full disaster recovery so your data is always accounted for and accessible.\n\n## Monitoring\n\nYou can't call a system safe without monitoring it. We deliver network, application and database monitoring, plus Security Information and Event Management (SIEM).",
  },
  {
    slug: "virtualization-cloud",
    title: "Virtualization & cloud",
    summary: "Virtual desktop infrastructure, private cloud and pay-per-use public cloud.",
    highlights: ["Virtual desktop infrastructure", "Private cloud", "Public cloud", "Zero-trust access"],
    body: "## Virtual desktop infrastructure\n\nCentralised management of apps, devices and virtual desktops, with zero-trust secure access to business applications.\n\n## Private cloud\n\nSelf-service, scalable and elastic computing on dedicated infrastructure, on-premises or hosted, with the control and customisation of your own environment.\n\n## Public cloud\n\nOn-demand infrastructure where you pay only for the CPU, storage and bandwidth you use. We plan and complete the deployment and remain available for support afterwards.",
  },
  {
    slug: "managed-services",
    title: "Managed services & AMC",
    summary: "Annual maintenance contracts and help desk, delivered on site, remotely, by phone and email.",
    highlights: ["24/7 support line", "Weekly on-site follow-ups", "Monthly health reports", "On-call visits"],
    body: "One place to call for every technology problem.\n\nOur technology partnership and Annual Maintenance Contracts cover networking appliances, cameras, printers, applications and IT help desk.\n\n## Included\n\n- **24/7 support** by phone and email\n- **Weekly follow-up visits** on site\n- **Monthly reports** on the health of your systems\n- **On-call visits** whenever you need them\n- Remote support for fast resolution",
  },
].map((s, i) => ({ ...s, sort_order: i + 1, published: true }));

const industries = [
  {
    slug: "healthcare",
    title: "Healthcare",
    summary: "Hospital networks, patient-record and lab systems, data protection and round-the-clock support for clinical environments.",
    clients_text: "Chitwan Medical College, CMC Chure Hill Hospital, Bharatpur Hospital, Gaidakot Municipal Hospital, Gaidakot Basic Hospital, Ichhakamana Basic Hospital, Khwopa Hospital, Nuwakot Hospital, Pearl Dental Care, Mediisha",
    body: "Hospitals never close, and neither can their systems. We have delivered networks, surveillance, servers and software for hospitals across Bagmati and Gandaki provinces.\n\n## What we deliver for healthcare\n\n- Hospital-wide wired and wireless networks\n- Patient-record and laboratory information systems\n- Data protection, backup and disaster recovery for clinical data\n- CCTV and access control for wards, pharmacies and records rooms\n- Annual maintenance with 24/7 support",
  },
  {
    slug: "development-partners",
    title: "Development partners",
    summary: "Project-based IT delivery for donor-funded programmes, with the documentation and reporting they require.",
    clients_text: "GIZ, LDC Watch",
    body: "Donor-funded programmes need a technology partner who delivers on time and documents everything. We work to programme reporting, timesheet and invoicing requirements.\n\n## What we deliver\n\n- Software and information systems for programme delivery\n- IT infrastructure for project offices\n- Progress reporting aligned with donor requirements",
  },
  {
    slug: "public-sector-education",
    title: "Public sector & education",
    summary: "Secure, auditable infrastructure for utilities, state enterprises and universities, through transparent procurement.",
    clients_text: "Nepal Electricity Authority, Nepal Oil Corporation, Tribhuvan University",
    body: "We work with public institutions through transparent, compliant procurement — sealed quotations and tenders — and deliver infrastructure that stands up to audit.\n\n## What we deliver\n\n- Campus and office networks\n- CCTV surveillance and access control\n- Servers, storage and backup\n- Annual maintenance contracts",
  },
  {
    slug: "enterprise-hospitality",
    title: "Enterprise & hospitality",
    summary: "Networks, security and managed IT for manufacturers, retailers, hotels and media companies.",
    clients_text: "Golyan Group, Goldstar Shoes, Jagadamba Motors, City Hotel & Suites, Paradise Garden, Kreate Media",
    body: "From factory floors to hotel corridors, we keep businesses connected and secure.\n\n## What we deliver\n\n- Guest and staff Wi-Fi with heat-mapped coverage\n- Firewalls, endpoint and email security\n- Servers, backup and monitoring\n- Managed IT and help desk",
  },
].map((s, i) => ({ ...s, sort_order: i + 1, published: true }));

const homeClients = [
  "GIZ",
  "Nepal Electricity Authority",
  "Nepal Oil Corporation",
  "Tribhuvan University",
  "Chitwan Medical College",
  "Bharatpur Hospital",
  "Golyan Group",
  "Jagadamba Motors",
];
const clients = [
  ["GIZ", "Development partner"],
  ["Nepal Electricity Authority", "Public utility"],
  ["Nepal Oil Corporation", "State enterprise"],
  ["Tribhuvan University", "Education"],
  ["Chitwan Medical College", "Healthcare"],
  ["CMC Chure Hill Hospital", "Healthcare"],
  ["Bharatpur Hospital", "Healthcare"],
  ["Gaidakot Municipal Hospital", "Healthcare"],
  ["Gaidakot Basic Hospital", "Healthcare"],
  ["Ichhakamana Basic Hospital", "Healthcare"],
  ["Khwopa Hospital", "Healthcare"],
  ["Nuwakot Hospital", "Healthcare"],
  ["Pearl Dental Care", "Healthcare"],
  ["Mediisha", "Health-tech"],
  ["LDC Watch", "International NGO"],
  ["Golyan Group", "Conglomerate"],
  ["Goldstar Shoes", "Manufacturing"],
  ["Jagadamba Motors", "Automotive"],
  ["City Hotel & Suites", "Hospitality"],
  ["Paradise Garden & Restaurant", "Hospitality"],
  ["Kreate Media Pvt. Ltd.", "Media"],
].map(([name, sector], i) => ({
  name,
  sector,
  show_on_home: homeClients.includes(name),
  sort_order: i + 1,
  published: true,
}));

const partners = [
  "Cisco", "Juniper Networks", "Hewlett Packard Enterprise", "Lenovo", "Sophos", "Veeam",
  "Elastic", "Accops", "Hikvision", "Cambium Networks", "UniFi", "Edgecore Networks",
].map((name, i) => ({ name, sort_order: i + 1, published: true }));

const stats = [
  { value: "2019", suffix: "", label: "Founded in Kathmandu" },
  { value: "50", suffix: "+", label: "Projects delivered" },
  { value: "20", suffix: "+", label: "Institutional clients" },
  { value: "24/7", suffix: "", label: "Support, 365 days a year" },
].map((s, i) => ({ ...s, sort_order: i + 1, published: true }));

const featured = [
  {
    kicker: "Partnership",
    title: "Tech Bucket onboarded by GIZ to deliver IT for two development programmes in Nepal",
    cta_label: "See our work",
    href: "/industries/development-partners",
    theme: "light",
  },
  {
    kicker: "Cybersecurity",
    title: "How safe is your hospital network? Get a layered security assessment",
    cta_label: "Request an assessment",
    href: "/contact?service=Cybersecurity",
    theme: "light",
  },
  {
    kicker: "Managed services",
    title: "24/7 support, weekly on-site follow-ups and monthly health reports",
    cta_label: "Explore AMC plans",
    href: "/services/managed-services",
    theme: "dark",
  },
].map((s, i) => ({ ...s, sort_order: i + 1, published: true }));

const draftPosts = [
  {
    type: "insight",
    slug: "hospital-network-security-checklist",
    title: "A security checklist for Nepali hospitals",
    excerpt: "Draft — replace with your article.",
    body: "Write your article here in Markdown.",
    category: "Cybersecurity",
    cover_headline: "Secure every ward.",
    status: "draft",
  },
  {
    type: "insight",
    slug: "disaster-recovery-on-a-budget",
    title: "Disaster recovery planning on a Nepali budget",
    excerpt: "Draft — replace with your article.",
    body: "Write your article here in Markdown.",
    category: "Resilience",
    cover_headline: "Backup. Recover.",
    status: "draft",
  },
  {
    type: "case_study",
    slug: "giz-programme-it-delivery",
    title: "GIZ: IT delivery for two development programmes",
    excerpt: "Draft — publish only after GIZ approves the content.",
    body: "## The challenge\n\n## What we delivered\n\n## The result\n",
    category: "Development partners",
    client_name: "GIZ",
    cover_headline: "Brief to go-live.",
    status: "draft",
  },
];

try {
  await client.connect();
  const s = await client.query("select count(*)::int as n from site_settings");
  if (s.rows[0].n === 0) {
    await insertMany("site_settings", [settings]);
  } else console.log("- site_settings: already set, skipped");
  await insertMany("services", services);
  await insertMany("industries", industries);
  await insertMany("clients", clients);
  await insertMany("partners", partners);
  await insertMany("stats", stats);
  await insertMany("featured_items", featured);
  await insertMany("posts", draftPosts);
  console.log("Seed complete.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
