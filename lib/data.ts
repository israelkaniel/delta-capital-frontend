export type Agent = {
  id: string; name: string; email: string; tier: string;
  active: boolean; deals: number; mtd: number; hue: number;
}
export type Funder = {
  id: string; name: string; type: string; ticket: string; avail: number; hue: number;
}
export type Client = {
  id: string; company: string; sector: string; since: string;
  openDeals: number; exposure: number; rating: string;
}
export type Contact = {
  id: string; name: string; role: string; company: string;
  email: string; phone: string; clientId: string;
}
export type Deal = {
  id: string; client: string; clientId: string; amount: number; rate: number;
  term: number; funder: string; funderId: string; status: string; stage: string;
  closed: string; maturity: string; agents: string[]; productType: string; industry: string;
}
export type Split = { agentId: string; pct: number }
export type Commission = {
  id: string; dealId: string; amount: number; pct: number; value: number;
  source: string; status: string; period: string; splits: Split[];
  paidOn: string | null; notes?: string;
}
export type Monthly = {
  month: string; volume: number; commissions: number;
  deals: number; paid: number; pending: number;
}
export type Notification = { id: string; title: string; sub: string; when: string; unread: boolean }
export type Task = { id: string; title: string; due: string; owner: string; priority: string }

export const agents: Agent[] = [
  { id: 'AG-01', name: 'Noam Harel',     email: 'noam@delta.cap',    tier: 'Senior',  active: true,  deals: 34, mtd: 182400, hue: 268 },
  { id: 'AG-02', name: 'Rena Vasquez',   email: 'rena@delta.cap',    tier: 'Senior',  active: true,  deals: 28, mtd: 148750, hue: 20  },
  { id: 'AG-03', name: 'Ari Segal',      email: 'ari@delta.cap',     tier: 'Mid',     active: true,  deals: 22, mtd: 98200,  hue: 150 },
  { id: 'AG-04', name: 'Daniela Croft',  email: 'daniela@delta.cap', tier: 'Mid',     active: true,  deals: 19, mtd: 76450,  hue: 210 },
  { id: 'AG-05', name: 'Omer Bashir',    email: 'omer@delta.cap',    tier: 'Junior',  active: true,  deals: 14, mtd: 41800,  hue: 320 },
  { id: 'AG-06', name: 'Tali Rosen',     email: 'tali@delta.cap',    tier: 'Partner', active: true,  deals: 12, mtd: 312000, hue: 45  },
  { id: 'AG-07', name: 'Yoni Mekel',     email: 'yoni@delta.cap',    tier: 'Junior',  active: false, deals: 5,  mtd: 12400,  hue: 110 },
]

export const funders: Funder[] = [
  { id: 'FN-01', name: 'Meridian Structured Credit', type: 'Institutional', ticket: '2M–50M',   avail: 42500000, hue: 220 },
  { id: 'FN-02', name: 'Harbor Lane Partners',       type: 'Private Fund',  ticket: '500K–10M', avail: 18200000, hue: 268 },
  { id: 'FN-03', name: 'Oakstone Family Office',     type: 'Family Office', ticket: '250K–5M',  avail: 7400000,  hue: 150 },
  { id: 'FN-04', name: 'Delta Capital Book',         type: 'In-house',      ticket: 'Any',      avail: 28000000, hue: 20  },
  { id: 'FN-05', name: 'North Ridge Credit',         type: 'Institutional', ticket: '5M–100M',  avail: 64000000, hue: 45  },
  { id: 'FN-06', name: 'Prism Bridge Fund',          type: 'Private Fund',  ticket: '1M–15M',   avail: 11250000, hue: 330 },
]

export const clients: Client[] = [
  { id: 'CL-1042', company: 'Aperture Robotics',      sector: 'Manufacturing', since: '2023-04-11', openDeals: 2, exposure: 3400000,  rating: 'A-' },
  { id: 'CL-1043', company: 'Northwind Logistics',    sector: 'Logistics',     since: '2022-11-02', openDeals: 1, exposure: 1850000,  rating: 'B+' },
  { id: 'CL-1044', company: 'Maple & Oak Catering',   sector: 'Food & Bev',   since: '2024-01-18', openDeals: 1, exposure: 420000,   rating: 'B'  },
  { id: 'CL-1045', company: 'Solaris Imaging',        sector: 'Healthcare',    since: '2023-08-30', openDeals: 3, exposure: 6200000,  rating: 'A'  },
  { id: 'CL-1046', company: 'Brightline Apparel',     sector: 'Retail',        since: '2024-06-07', openDeals: 1, exposure: 780000,   rating: 'B-' },
  { id: 'CL-1047', company: 'Redwood Constr. Group',  sector: 'Construction',  since: '2021-09-14', openDeals: 4, exposure: 9400000,  rating: 'A-' },
  { id: 'CL-1048', company: 'Vantage Studios',        sector: 'Media',         since: '2024-09-22', openDeals: 1, exposure: 320000,   rating: 'C+' },
  { id: 'CL-1049', company: 'Kite Aviation Services', sector: 'Aerospace',     since: '2023-02-05', openDeals: 2, exposure: 5100000,  rating: 'A'  },
]

export const contacts: Contact[] = [
  { id: 'CT-01', name: 'Samira Ghosh',    role: 'CFO',         company: 'Aperture Robotics',    email: 'samira@aperture.io',   phone: '+1 415 555 0188', clientId: 'CL-1042' },
  { id: 'CT-02', name: 'David Okafor',    role: 'COO',         company: 'Northwind Logistics',  email: 'david.o@northwind.co', phone: '+1 646 555 0123', clientId: 'CL-1043' },
  { id: 'CT-03', name: 'Lucía Fernandez', role: 'Owner',       company: 'Maple & Oak Catering', email: 'lucia@mapleoak.com',   phone: '+1 212 555 0199', clientId: 'CL-1044' },
  { id: 'CT-04', name: 'Kenji Tanaka',    role: 'Controller',  company: 'Solaris Imaging',      email: 'k.tanaka@solaris.md',  phone: '+1 917 555 0145', clientId: 'CL-1045' },
  { id: 'CT-05', name: 'Priya Venkatesh', role: 'Founder',     company: 'Brightline Apparel',   email: 'priya@brightline.co',  phone: '+1 332 555 0167', clientId: 'CL-1046' },
  { id: 'CT-06', name: 'Marcus Bell',     role: 'CEO',         company: 'Redwood Constr.',      email: 'marcus@redwoodcg.com', phone: '+1 718 555 0132', clientId: 'CL-1047' },
  { id: 'CT-07', name: 'Jonah Weiss',     role: 'Head of Ops', company: 'Vantage Studios',      email: 'jw@vantagestudios.tv', phone: '+1 929 555 0170', clientId: 'CL-1048' },
  { id: 'CT-08', name: 'Elena Moretti',   role: 'CFO',         company: 'Kite Aviation',        email: 'elena.m@kiteav.com',   phone: '+1 310 555 0155', clientId: 'CL-1049' },
]

export const deals: Deal[] = [
  { id: 'DL-2781', client: 'Aperture Robotics',     clientId: 'CL-1042', amount: 2400000, rate: 11.5, term: 36, funder: 'Meridian Structured Credit', funderId: 'FN-01', status: 'Active',   stage: 'Funded',        closed: '2026-03-18', maturity: '2029-03-18', agents: ['AG-01','AG-03'],      productType: 'Term Loan',   industry: 'Manufacturing' },
  { id: 'DL-2782', client: 'Northwind Logistics',   clientId: 'CL-1043', amount: 850000,  rate: 13.2, term: 24, funder: 'Harbor Lane Partners',       funderId: 'FN-02', status: 'Active',   stage: 'Funded',        closed: '2026-02-27', maturity: '2028-02-27', agents: ['AG-02'],              productType: 'Revolving',   industry: 'Logistics' },
  { id: 'DL-2783', client: 'Maple & Oak Catering',  clientId: 'CL-1044', amount: 180000,  rate: 14.8, term: 18, funder: 'Delta Capital Book',         funderId: 'FN-04', status: 'Active',   stage: 'Funded',        closed: '2026-04-02', maturity: '2027-10-02', agents: ['AG-05'],              productType: 'Working Cap', industry: 'Food & Bev' },
  { id: 'DL-2784', client: 'Solaris Imaging',       clientId: 'CL-1045', amount: 4200000, rate: 10.25,term: 60, funder: 'North Ridge Credit',         funderId: 'FN-05', status: 'Active',   stage: 'Funded',        closed: '2026-01-15', maturity: '2031-01-15', agents: ['AG-01','AG-06'],      productType: 'Equipment',   industry: 'Healthcare' },
  { id: 'DL-2785', client: 'Brightline Apparel',    clientId: 'CL-1046', amount: 320000,  rate: 15.1, term: 12, funder: 'Oakstone Family Office',     funderId: 'FN-03', status: 'Closing',  stage: 'Docs Signed',   closed: '2026-04-16', maturity: '2027-04-16', agents: ['AG-04'],              productType: 'Working Cap', industry: 'Retail' },
  { id: 'DL-2786', client: 'Redwood Constr. Group', clientId: 'CL-1047', amount: 6800000, rate: 11.0, term: 48, funder: 'Meridian Structured Credit', funderId: 'FN-01', status: 'Closing',  stage: 'Underwriting',  closed: '2026-04-22', maturity: '2030-04-22', agents: ['AG-06','AG-02'],      productType: 'Term Loan',   industry: 'Construction' },
  { id: 'DL-2787', client: 'Vantage Studios',       clientId: 'CL-1048', amount: 240000,  rate: 16.5, term: 12, funder: 'Prism Bridge Fund',          funderId: 'FN-06', status: 'Pending',  stage: 'Term Sheet',    closed: '—',          maturity: '—',          agents: ['AG-05'],              productType: 'Bridge',      industry: 'Media' },
  { id: 'DL-2788', client: 'Kite Aviation Services',clientId: 'CL-1049', amount: 3100000, rate: 10.8, term: 48, funder: 'North Ridge Credit',         funderId: 'FN-05', status: 'Active',   stage: 'Funded',        closed: '2026-03-05', maturity: '2030-03-05', agents: ['AG-01','AG-04'],      productType: 'Equipment',   industry: 'Aerospace' },
  { id: 'DL-2789', client: 'Aperture Robotics',     clientId: 'CL-1042', amount: 1000000, rate: 12.2, term: 24, funder: 'Harbor Lane Partners',       funderId: 'FN-02', status: 'Active',   stage: 'Funded',        closed: '2025-11-20', maturity: '2027-11-20', agents: ['AG-03'],              productType: 'Revolving',   industry: 'Manufacturing' },
  { id: 'DL-2790', client: 'Solaris Imaging',       clientId: 'CL-1045', amount: 2000000, rate: 11.8, term: 36, funder: 'Delta Capital Book',         funderId: 'FN-04', status: 'Active',   stage: 'Funded',        closed: '2025-12-12', maturity: '2028-12-12', agents: ['AG-06'],              productType: 'Term Loan',   industry: 'Healthcare' },
  { id: 'DL-2791', client: 'Redwood Constr. Group', clientId: 'CL-1047', amount: 1500000, rate: 12.6, term: 24, funder: 'Prism Bridge Fund',          funderId: 'FN-06', status: 'Pending',  stage: 'Application',   closed: '—',          maturity: '—',          agents: ['AG-02'],              productType: 'Bridge',      industry: 'Construction' },
  { id: 'DL-2792', client: 'Northwind Logistics',   clientId: 'CL-1043', amount: 600000,  rate: 13.9, term: 18, funder: 'Oakstone Family Office',     funderId: 'FN-03', status: 'Declined', stage: 'Credit Review', closed: '—',          maturity: '—',          agents: ['AG-07'],              productType: 'Working Cap', industry: 'Logistics' },
]

export const commissions: Commission[] = [
  { id: 'CM-10021', dealId: 'DL-2781', amount: 2400000, pct: 2.25, value: 54000,  source: 'Funder',   status: 'Paid',     period: '2026-03', splits: [{agentId:'AG-01',pct:60},{agentId:'AG-03',pct:40}], paidOn: '2026-04-05', notes: 'Meridian tiered bonus applied (+0.25%)' },
  { id: 'CM-10022', dealId: 'DL-2782', amount: 850000,  pct: 2.0,  value: 17000,  source: 'Funder',   status: 'Approved', period: '2026-03', splits: [{agentId:'AG-02',pct:100}], paidOn: null },
  { id: 'CM-10023', dealId: 'DL-2783', amount: 180000,  pct: 3.5,  value: 6300,   source: 'Borrower', status: 'Approved', period: '2026-04', splits: [{agentId:'AG-05',pct:100}], paidOn: null },
  { id: 'CM-10024', dealId: 'DL-2784', amount: 4200000, pct: 1.75, value: 73500,  source: 'Funder',   status: 'Paid',     period: '2026-02', splits: [{agentId:'AG-01',pct:55},{agentId:'AG-06',pct:45}], paidOn: '2026-03-02' },
  { id: 'CM-10025', dealId: 'DL-2785', amount: 320000,  pct: 2.5,  value: 8000,   source: 'Funder',   status: 'Pending',  period: '2026-04', splits: [{agentId:'AG-04',pct:100}], paidOn: null },
  { id: 'CM-10026', dealId: 'DL-2786', amount: 6800000, pct: 2.0,  value: 136000, source: 'Funder',   status: 'Pending',  period: '2026-04', splits: [{agentId:'AG-06',pct:65},{agentId:'AG-02',pct:35}], paidOn: null, notes: 'Awaiting funder confirmation of final fee' },
  { id: 'CM-10027', dealId: 'DL-2788', amount: 3100000, pct: 1.85, value: 57350,  source: 'Funder',   status: 'Approved', period: '2026-03', splits: [{agentId:'AG-01',pct:50},{agentId:'AG-04',pct:50}], paidOn: null },
  { id: 'CM-10028', dealId: 'DL-2789', amount: 1000000, pct: 2.25, value: 22500,  source: 'Funder',   status: 'Paid',     period: '2025-11', splits: [{agentId:'AG-03',pct:100}], paidOn: '2025-12-06' },
  { id: 'CM-10029', dealId: 'DL-2790', amount: 2000000, pct: 3.0,  value: 60000,  source: 'Borrower', status: 'Paid',     period: '2025-12', splits: [{agentId:'AG-06',pct:100}], paidOn: '2026-01-10', notes: 'In-house origination — borrower-paid' },
  { id: 'CM-10030', dealId: 'DL-2791', amount: 1500000, pct: 2.4,  value: 36000,  source: 'Funder',   status: 'Pending',  period: '2026-04', splits: [{agentId:'AG-02',pct:100}], paidOn: null },
]

export const monthly: Monthly[] = [
  { month: '2025-11', volume: 4800000,  commissions: 106400, deals: 7,  paid: 98400,  pending: 8000  },
  { month: '2025-12', volume: 5900000,  commissions: 138750, deals: 8,  paid: 138750, pending: 0     },
  { month: '2026-01', volume: 7200000,  commissions: 168200, deals: 9,  paid: 161200, pending: 7000  },
  { month: '2026-02', volume: 6100000,  commissions: 147500, deals: 8,  paid: 128500, pending: 19000 },
  { month: '2026-03', volume: 8400000,  commissions: 198650, deals: 11, paid: 120900, pending: 77750 },
  { month: '2026-04', volume: 10900000, commissions: 186300, deals: 4,  paid: 0,      pending: 186300},
]

export const notifications: Notification[] = [
  { id: 'N1', title: 'CM-10026 pending approval', sub: 'Redwood · $136,000',   when: '2m ago',  unread: true  },
  { id: 'N2', title: 'DL-2786 moved to Underwriting', sub: 'Meridian · $6.8M', when: '1h ago',  unread: true  },
  { id: 'N3', title: 'Payout file ready for March',   sub: '8 commissions',    when: '3h ago',  unread: true  },
  { id: 'N4', title: 'Tali Rosen hit Partner quota',  sub: '$312K MTD',        when: 'Yesterday',unread: false },
  { id: 'N5', title: 'DL-2784 maturity in 5 years',   sub: 'Solaris · $4.2M', when: 'Yesterday',unread: false },
]

export const tasks: Task[] = [
  { id: 'T1', title: 'Collect UCC filing — Redwood',    due: 'Apr 22', owner: 'AG-01', priority: 'High' },
  { id: 'T2', title: 'Send term sheet — Vantage Studios',due: 'Apr 20', owner: 'AG-05', priority: 'High' },
  { id: 'T3', title: 'Approve CM-10022 & CM-10023',     due: 'Apr 21', owner: 'AG-01', priority: 'Med'  },
  { id: 'T4', title: 'Update commission rules v13',     due: 'Apr 25', owner: 'AG-06', priority: 'Low'  },
  { id: 'T5', title: 'Monthly summary — March close',   due: 'Apr 30', owner: 'AG-01', priority: 'Med'  },
]

export const agentById = (id: string) => agents.find(a => a.id === id)
export const dealById  = (id: string) => deals.find(d => d.id === id)
export const funderById = (id: string) => funders.find(f => f.id === id)
export const clientById = (id: string) => clients.find(c => c.id === id)
