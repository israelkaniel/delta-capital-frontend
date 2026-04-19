'use client'
import { useState } from 'react'
import { Icons } from '@/lib/icons'
import { Pill } from '@/components/ui/pill'

type Rule = {
  id: string; name: string; type: string; condition: string;
  rate: string; active: boolean; priority: number
}

const DEFAULT_RULES: Rule[] = [
  { id: 'R-01', name: 'Standard Funder Fee',      type: 'Funder',   condition: 'All deals',                   rate: '2.00%', active: true,  priority: 1 },
  { id: 'R-02', name: 'Meridian Tiered Bonus',    type: 'Funder',   condition: 'Meridian · deal > $2M',       rate: '+0.25%',active: true,  priority: 2 },
  { id: 'R-03', name: 'Senior Agent Split',       type: 'Split',    condition: 'Senior tier agents',          rate: '60/40', active: true,  priority: 3 },
  { id: 'R-04', name: 'Partner Override',         type: 'Override', condition: 'Partner tier agents',         rate: 'Flat 3.0%', active: true, priority: 4 },
  { id: 'R-05', name: 'Borrower Origination Fee', type: 'Borrower', condition: 'In-house funded deals',       rate: '3.00%', active: true,  priority: 5 },
  { id: 'R-06', name: 'Bridge Deal Uplift',       type: 'Funder',   condition: 'Product: Bridge',             rate: '+0.50%',active: false, priority: 6 },
  { id: 'R-07', name: 'Junior Agent Cap',         type: 'Cap',      condition: 'Junior tier · max monthly',  rate: '$25K',  active: true,  priority: 7 },
]

const typeTone = (t: string) => t === 'Funder' ? 'accent' : t === 'Split' ? 'info' : t === 'Override' ? 'warn' : t === 'Cap' ? 'neg' : 'default'

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES)
  const [editing, setEditing] = useState<string | null>(null)

  const toggle = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  return (
    <div className="page" style={{ padding: '20px 28px 80px' }}>
      <div className="page-head">
        <div>
          <h1>Rules</h1>
          <p>Commission calculation rules · applied in priority order</p>
        </div>
        <div className="actions">
          <button className="btn"><Icons.Download /> Export</button>
          <button className="btn primary"><Icons.Plus /> Add rule</button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div><h3>Active ruleset</h3><div className="sub">{rules.filter(r => r.active).length} of {rules.length} rules active</div></div>
          <div className="actions">
            <button className="btn sm ghost">Reset to defaults</button>
            <button className="btn sm">Save version</button>
          </div>
        </div>
        <div className="card-body flush">
          {rules.map((r, i) => (
            <div
              key={r.id}
              style={{
                padding: '14px 18px',
                borderBottom: i < rules.length - 1 ? '1px solid var(--line)' : 'none',
                display: 'flex', alignItems: 'center', gap: 14,
                opacity: r.active ? 1 : 0.45,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 20, textAlign: 'center', cursor: 'grab' }}>
                <Icons.Drag style={{ width: 14, height: 14 }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', width: 16 }}>{r.priority}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{r.name}</span>
                  <Pill tone={typeTone(r.type)}>{r.type}</Pill>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.condition}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', minWidth: 64, textAlign: 'right' }}>{r.rate}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn sm ghost" onClick={() => setEditing(r.id)}>Edit</button>
                <label className="toggle" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                  <input type="checkbox" checked={r.active} onChange={() => toggle(r.id)} style={{ display: 'none' }} />
                  <div style={{
                    width: 32, height: 18, borderRadius: 9, background: r.active ? 'var(--accent)' : 'var(--ink-5)',
                    transition: 'background 0.2s', position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, left: r.active ? 16 : 3, width: 12, height: 12,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Rule history</h3></div>
        <div className="card-body" style={{ color: 'var(--ink-4)', fontSize: 13, padding: '20px 18px' }}>
          Version history and audit log coming soon.
        </div>
      </div>
    </div>
  )
}
