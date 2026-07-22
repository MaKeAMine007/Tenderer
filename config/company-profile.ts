export interface BudgetRange {
  minINR?: number
  maxINR?: number
  preferredMinINR?: number
  preferredMaxINR?: number
}

export interface TeamCapability {
  role: string
  count: number
  expertise: string[]
}

export interface CompanyProfile {
  name: string
  shortName: string
  description: string
  website?: string

  coreServices: string[]
  technologies: string[]
  industriesServed: string[]

  preferredProjectCategories: string[]
  preferredStates: string[]
  excludedStates: string[]

  budgetRange: BudgetRange

  teamCapabilities: TeamCapability[]
  certifications: string[]

  keywords: string[]
  exclusionKeywords: string[]

  idealClients: string[]
  typicalDeliverables: string[]

  governmentEntryContext: {
    yearsInBusiness: number
    govExperience: boolean
    msmeRegistered: boolean
    startupIndia: boolean
    note: string
  }

  notes?: string
}

export const MAM_COMPANY_PROFILE: CompanyProfile = {
  name: 'Make A Mine',
  shortName: 'MAM',
  description:
    'Make A Mine (MAM) is a technology and digital services company specialising in website development, web applications, custom software, ERP/CRM systems, AI solutions, digital marketing, branding, and automation for government and enterprise clients across India.',

  coreServices: [
    'Website Development',
    'Web Portal Development',
    'Web Application Development',
    'Mobile App Development (iOS / Android)',
    'Custom Software Development',
    'SaaS Product Development',
    'ERP System Implementation',
    'CRM System Development',
    'Automation Solutions',
    'AI and Machine Learning Solutions',
    'Search Engine Optimisation (SEO)',
    'Performance Marketing (Google Ads, Meta Ads)',
    'Branding and Visual Identity',
    'Graphic Design',
    'UI/UX Design',
    'Video Production and Motion Graphics',
    'Content Marketing',
    'Landing Page Development',
    'Digital Transformation Consulting',
    'IT Consulting',
  ],

  technologies: [
    'React / Next.js',
    'Node.js',
    'Python / Django / FastAPI',
    'PostgreSQL / MySQL',
    'MongoDB',
    'REST APIs and GraphQL',
    'Flutter (mobile)',
    'Cloud (AWS, Azure, GCP)',
    'WordPress / Drupal',
    'Figma (UI/UX design)',
    'Adobe Creative Suite',
    'Google Workspace integrations',
    'SEO tools (Semrush, Ahrefs, Search Console)',
    'Meta Business Suite',
    'Google Ads / DV360',
  ],

  industriesServed: [
    'Government and Public Sector',
    'Education and EdTech',
    'Healthcare IT',
    'Banking and Finance',
    'Real Estate',
    'Retail and E-commerce',
    'Manufacturing IT',
    'Smart City',
    'Tourism and Hospitality',
    'Legal and Compliance',
  ],

  preferredProjectCategories: [
    'Website Development',
    'Web Portal',
    'Software Development',
    'Mobile Application',
    'ERP Implementation',
    'CRM Development',
    'Digital Marketing',
    'Branding',
    'UI/UX Design',
    'IT Consulting',
    'Automation',
    'AI Solution',
    'Content Management System',
    'Data Analytics Dashboard',
    'E-Governance Portal',
    'Smart City Solution',
    'Digital Transformation',
  ],

  preferredStates: [
    'Delhi',
    'Maharashtra',
    'Karnataka',
    'Telangana',
    'Gujarat',
    'Rajasthan',
    'Uttar Pradesh',
    'Haryana',
    'Punjab',
    'Madhya Pradesh',
    'Tamil Nadu',
    'Kerala',
    'Andhra Pradesh',
    'West Bengal',
    'Odisha',
  ],

  excludedStates: [],

  budgetRange: {
    minINR: 300_000,         // ₹3 lakh — below this not worth bidding
    maxINR: 100_000_000,     // ₹10 crore — upper practical limit for current team
    preferredMinINR: 1_000_000,  // ₹10 lakh sweet spot start
    preferredMaxINR: 30_000_000, // ₹3 crore sweet spot end
  },

  teamCapabilities: [
    {
      role: 'Full Stack Developer',
      count: 6,
      expertise: ['React', 'Node.js', 'Next.js', 'PostgreSQL', 'REST APIs'],
    },
    {
      role: 'Mobile Developer',
      count: 2,
      expertise: ['Flutter', 'React Native', 'iOS', 'Android'],
    },
    {
      role: 'UI/UX Designer',
      count: 3,
      expertise: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    },
    {
      role: 'Digital Marketing Specialist',
      count: 4,
      expertise: ['SEO', 'Google Ads', 'Meta Ads', 'Content Strategy'],
    },
    {
      role: 'Graphic Designer / Video Editor',
      count: 3,
      expertise: ['Adobe Suite', 'Motion Graphics', 'Brand Identity', 'Social Media'],
    },
    {
      role: 'Project Manager / IT Consultant',
      count: 2,
      expertise: ['Agile', 'Scrum', 'Government IT projects', 'Client servicing'],
    },
  ],

  certifications: [
    'GST Registered',
    'PAN India Operations',
    'MSME Registered',
    'Startup India recognised',
    'ISO 9001:2015 Quality Management (pursuing)',
  ],

  keywords: [
    'website',
    'web portal',
    'portal',
    'software',
    'application',
    'app',
    'mobile app',
    'web application',
    'web development',
    'digital',
    'automation',
    'crm',
    'erp',
    'dashboard',
    'consulting',
    'seo',
    'branding',
    'marketing',
    'creative',
    'design',
    'content',
    'video',
    'ai',
    'analytics',
    'e-governance',
    'egovernance',
    'it solution',
    'it services',
    'information technology',
    'smart city',
    'digital transformation',
    'cloud',
    'database',
    'ui/ux',
    'mobile application',
    'saas',
    'helpdesk',
    'cms',
    'content management',
    'digital marketing',
    'social media',
    'landing page',
    'graphic design',
    'motion graphics',
  ],

  exclusionKeywords: [
    'road construction',
    'bridge construction',
    'building construction',
    'civil works',
    'cement supply',
    'construction of',
    'hospital equipment',
    'medical supply',
    'medical equipment',
    'pharmaceutical',
    'electrical transformer',
    'vehicle supply',
    'vehicle procurement',
    'tractor',
    'pipeline',
    'water pipeline',
    'furniture supply',
    'food supply',
    'catering',
    'hardware supply',
    'heavy machinery',
    'manufacturing',
    'mining',
    'quarry',
    'drilling',
    'excavation',
    'solar panel supply',
    'street light supply',
    'pumping machinery',
    'security services',
    'housekeeping',
    'manpower supply',
    'printing and stationery',
  ],

  idealClients: [
    'Ministry of Electronics and Information Technology (MeitY)',
    'National Informatics Centre (NIC)',
    'State IT Departments and IT Corporations',
    'Smart City SPVs',
    'Municipal Corporations (IT projects)',
    'State Tourism Boards',
    'Universities and Educational Institutions',
    'PSUs requiring digital transformation',
    'e-Governance Mission Mode Projects',
    'State E-Governance Agencies (e.g., UP IT Corporation, Delhi IT Dept)',
  ],

  typicalDeliverables: [
    'Responsive government website or portal',
    'Mobile application (iOS + Android)',
    'ERP / CRM system with training and support',
    'Digital marketing campaign + monthly reporting',
    'Brand identity package (logo, style guide, collateral)',
    'UI/UX design system + wireframes',
    'Video production (corporate / explainer / promotional)',
    'SEO audit + implementation + ranking report',
    'Custom software with documentation and source code',
    'Content strategy and monthly content calendar',
  ],

  governmentEntryContext: {
    yearsInBusiness: 3,
    govExperience: false,
    msmeRegistered: true,
    startupIndia: true,
    note: 'MAM is entering the government tender market. Target tenders that do not mandate prior government experience, favour MSMEs, or are digital/IT in nature where the market is more accessible.',
  },

  notes:
    'MAM avoids pure civil construction, infrastructure supply, manufacturing, and non-IT government work. Ideal tender is an IT, digital, branding, or creative services engagement for government, PSU, or urban body clients.',
}
