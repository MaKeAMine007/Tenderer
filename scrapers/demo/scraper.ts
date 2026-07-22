/**
 * Demo scraper — generates realistic seed data for development and presentations.
 * Contains IT, digital, branding, and software tenders relevant to MAM's profile.
 * Remove or disable in production once real portals return live data.
 */
import { ParsedTender } from '@/types'

const DEMO_TENDERS: Omit<ParsedTender, 'rawHtml'>[] = [
  {
    portal: 'CPPP',
    tenderNumber: 'CPPP/MeitY/2025-26/WD/00142',
    title: 'Design and Development of Government Services Web Portal — MeitY',
    department: 'Ministry of Electronics and Information Technology',
    state: 'Central',
    publishedDate: new Date('2025-11-01'),
    closingDate: new Date('2025-12-20'),
    budget: '₹85,00,000',
    emd: '₹1,70,000',
    description:
      'Design, development, deployment and maintenance of a responsive web portal for citizen-facing government services. Scope includes UI/UX design, CMS integration, API development, mobile responsiveness and 2-year AMC. MSME firms preferred. No prior government experience mandatory.',
    sourceUrl: 'https://eprocure.gov.in/eprocure/app',
  },
  {
    portal: 'Haryana',
    tenderNumber: 'HSIIDC/IT/2025-26/ERP/441',
    title: 'ERP System Implementation for State PSUs — Finance, HR, Procurement Modules',
    department: 'Haryana State Industrial and Infrastructure Development Corporation',
    state: 'Haryana',
    publishedDate: new Date('2025-11-10'),
    closingDate: new Date('2026-01-10'),
    budget: '₹1,20,00,000',
    emd: '₹2,40,000',
    description:
      'Design, development, implementation and 3-year maintenance of an integrated ERP system covering Finance, HR, Procurement and Inventory modules for 8 state PSUs. Startups and MSMEs registered under Startup India / MSME schemes are eligible to bid.',
    sourceUrl: 'https://haryanaeprocurement.gov.in',
  },
  {
    portal: 'Haryana',
    tenderNumber: 'HRERA/2025/IT/007',
    title: 'Development of Integrated Real Estate Regulatory Authority Portal with Mobile App',
    department: 'Haryana Real Estate Regulatory Authority',
    state: 'Haryana',
    publishedDate: new Date('2025-11-22'),
    closingDate: new Date('2026-01-30'),
    budget: '₹32,00,000',
    emd: '₹64,000',
    description:
      'Design, development, hosting and maintenance of a web portal and mobile applications (iOS/Android) for project registration, complaint management and public information disclosure under HRERA. Open to all eligible technology firms including MSMEs.',
    sourceUrl: 'https://haryanaeprocurement.gov.in',
  },
  {
    portal: 'Delhi',
    tenderNumber: 'GNCTD/IT/2025/MOB-014',
    title: 'Mobile Application Development for Delhi Citizen Services — Smart Delhi Initiative',
    department: 'Department of Information Technology, GNCTD',
    state: 'Delhi',
    publishedDate: new Date('2025-11-08'),
    closingDate: new Date('2025-12-28'),
    budget: '₹45,00,000',
    emd: '₹90,000',
    description:
      'Development of a unified mobile application (Android and iOS) for Delhi citizens to access government services including grievance redressal, utility bill payment, appointment booking and notifications. Minimum turnover ₹20 lakh in last two years.',
    sourceUrl: 'https://govtprocurement.delhi.gov.in/nicgep/app',
  },
  {
    portal: 'UP',
    tenderNumber: 'UP/UPCL/IT/2025/DASH-122',
    title: 'Custom Analytics Dashboard and Reporting Software for Power Sector',
    department: 'Uttar Pradesh Power Corporation Limited',
    state: 'Uttar Pradesh',
    publishedDate: new Date('2025-11-18'),
    closingDate: new Date('2026-01-15'),
    budget: '₹60,00,000',
    emd: '₹1,20,000',
    description:
      'Development and implementation of a real-time analytics dashboard for monitoring power distribution KPIs across UP districts. Includes data visualisation, automated reporting, role-based access control, and integration with existing SCADA data feeds.',
    sourceUrl: 'https://etender.up.nic.in/nicgep/app',
  },
  {
    portal: 'CPPP',
    tenderNumber: 'CPPP/TOURISM/2025-26/BRAND/0089',
    title: 'Branding and Digital Marketing Campaign for Incredible India — Tourism Board',
    department: 'Ministry of Tourism, Government of India',
    state: 'Central',
    publishedDate: new Date('2025-10-25'),
    closingDate: new Date('2025-12-10'),
    budget: '₹1,50,00,000',
    emd: '₹3,00,000',
    description:
      'Comprehensive branding and digital marketing campaign for promoting Indian tourism domestically and internationally. Scope includes brand identity refresh, social media strategy, content creation (video, graphics, copy), SEO, Google Ads, Meta Ads, and quarterly performance reports. Open to creative agencies and digital marketing firms.',
    sourceUrl: 'https://eprocure.gov.in/eprocure/app',
  },
  {
    portal: 'Delhi',
    tenderNumber: 'MCD/IT/2025/CRM-031',
    title: 'Citizen Relationship Management (CRM) System for Municipal Services',
    department: 'Municipal Corporation of Delhi',
    state: 'Delhi',
    publishedDate: new Date('2025-11-05'),
    closingDate: new Date('2026-01-05'),
    budget: '₹75,00,000',
    emd: '₹1,50,000',
    description:
      'Design, development and implementation of a CRM platform for managing citizen complaints, service requests and grievances across MCD zones. Includes web portal, mobile app, automated ticket routing, escalation workflows and management dashboards. MSME preference applicable.',
    sourceUrl: 'https://govtprocurement.delhi.gov.in/nicgep/app',
  },
  {
    portal: 'UP',
    tenderNumber: 'UP/UPICA/2025/SEO-089',
    title: 'Search Engine Optimisation and Digital Presence Enhancement — State Tourism Portal',
    department: 'Uttar Pradesh Tourism Department',
    state: 'Uttar Pradesh',
    publishedDate: new Date('2025-11-15'),
    closingDate: new Date('2026-01-20'),
    budget: '₹18,00,000',
    emd: '₹36,000',
    description:
      'Comprehensive SEO audit, technical optimisation, content strategy, backlink building and Google My Business management for the UP Tourism official web portal. 12-month engagement with monthly performance reports. Open to digital marketing agencies; no prior government project mandatory.',
    sourceUrl: 'https://etender.up.nic.in/nicgep/app',
  },
  {
    portal: 'CPPP',
    tenderNumber: 'CPPP/NCRTC/IT/2025/0156',
    title: 'Construction of Elevated Viaduct and Stations — Delhi-Meerut RRTS Corridor',
    department: 'National Capital Region Transport Corporation',
    state: 'Central',
    publishedDate: new Date('2025-10-18'),
    closingDate: new Date('2025-11-25'),
    budget: '₹1,24,60,00,000',
    emd: '₹2,49,20,000',
    description:
      'Design and construction of 18.3 km elevated viaduct, 4 stations, and associated civil structures for Package-7 of the Delhi-Meerut Regional Rapid Transit System.',
    sourceUrl: 'https://eprocure.gov.in/eprocure/app',
  },
  {
    portal: 'UP',
    tenderNumber: 'UP/PWD/2025-26/0981',
    title: 'Construction of Four-Lane Highway NH-58 Extension Ghaziabad to Meerut Bypass',
    department: 'Public Works Department, UP',
    state: 'Uttar Pradesh',
    publishedDate: new Date('2025-11-05'),
    closingDate: new Date('2025-12-20'),
    budget: '₹38,72,00,000',
    emd: '₹77,44,000',
    description:
      'Design, build and operate 34 km four-lane divided carriageway with grade separators, underpasses, and service roads along NH-58 extension.',
    sourceUrl: 'https://etender.up.nic.in/nicgep/app',
  },
  {
    portal: 'CPPP',
    tenderNumber: 'CPPP/EDU/2025/LMS-078',
    title: 'Learning Management System (LMS) Development for Central University Network',
    department: 'Ministry of Education — UGC Division',
    state: 'Central',
    publishedDate: new Date('2025-11-20'),
    closingDate: new Date('2026-02-01'),
    budget: '₹2,20,00,000',
    emd: '₹4,40,000',
    description:
      'Design, development and deployment of a cloud-based Learning Management System (LMS) for 15 central universities. Features include course management, live classes, assessments, certificates, analytics and mobile apps. Technology firms including startups and MSMEs are eligible.',
    sourceUrl: 'https://eprocure.gov.in/eprocure/app',
  },
  {
    portal: 'Haryana',
    tenderNumber: 'DHBVN/IT/2025/UI/018',
    title: 'UI/UX Redesign and Digital Marketing for State Power Distribution Website',
    department: 'Dakshin Haryana Bijli Vitran Nigam',
    state: 'Haryana',
    publishedDate: new Date('2025-11-15'),
    closingDate: new Date('2026-01-20'),
    budget: '₹22,00,000',
    emd: '₹44,000',
    description:
      'Redesign and optimisation of the DHBVN official website including UI/UX overhaul, mobile responsiveness, SEO implementation, content update, and a 6-month digital marketing retainer for social media management. Open to design and digital agencies.',
    sourceUrl: 'https://haryanaeprocurement.gov.in',
  },
]

export async function scrape(): Promise<ParsedTender[]> {
  return DEMO_TENDERS.map((t) => ({ ...t, rawHtml: '<demo>' }))
}
