import { ReactNode } from 'react'

type Tone = 'default' | 'pos' | 'neg' | 'warn' | 'info' | 'accent'

export function Pill({ children, tone = 'default', dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return (
    <span className={`pill${tone !== 'default' ? ' ' + tone : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}

const statusMap: Record<string, Tone> = {
  Paid: 'pos', Approved: 'accent', Pending: 'warn', Declined: 'neg',
  Active: 'pos', Closing: 'accent', 'Docs Signed': 'accent',
  Funded: 'pos', Underwriting: 'warn', 'Term Sheet': 'info',
  Application: 'info', 'Credit Review': 'warn',
}

export function StatusPill({ status }: { status: string }) {
  return <Pill tone={statusMap[status] ?? 'default'} dot>{status}</Pill>
}
