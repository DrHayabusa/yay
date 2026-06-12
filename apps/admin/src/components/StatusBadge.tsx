/**
 * Case status with a 6-segment stage rail: recovery → garage → approval →
 * parts → repair → delivery. The rail shows journey progress at a glance,
 * colour-coded by the active stage.
 */
const STAGES: { color: string; statuses: string[] }[] = [
  {
    color: 'var(--amber)',
    statuses: [
      'REQUEST_CREATED',
      'AWAITING_RECOVERY_ASSIGNMENT',
      'RECOVERY_ASSIGNED',
      'RECOVERY_EN_ROUTE',
      'RECOVERY_ARRIVED',
      'VEHICLE_COLLECTED',
      'VEHICLE_IN_TRANSIT',
    ],
  },
  { color: 'var(--blue)', statuses: ['VEHICLE_AT_GARAGE', 'INSPECTION_IN_PROGRESS', 'DIAGNOSIS_SUBMITTED'] },
  { color: 'var(--bone)', statuses: ['AWAITING_CUSTOMER_APPROVAL'] },
  { color: 'var(--violet)', statuses: ['PARTS_SELECTION_REQUIRED', 'PARTS_ORDERED', 'PARTS_DISPATCHED', 'PARTS_DELIVERED'] },
  { color: 'var(--green)', statuses: ['REPAIR_IN_PROGRESS', 'QUALITY_CHECK_IN_PROGRESS', 'REPAIR_COMPLETED'] },
  { color: 'var(--green)', statuses: ['DELIVERY_SCHEDULED', 'VEHICLE_OUT_FOR_DELIVERY', 'VEHICLE_DELIVERED', 'CASE_CLOSED'] },
];

const FROZEN: Record<string, string> = { CANCELLED: 'var(--muted)', DISPUTED: 'var(--red)' };

export function StatusBadge({ status }: { status: string }) {
  const frozen = FROZEN[status];
  const stageIdx = STAGES.findIndex((s) => s.statuses.includes(status));
  const color = frozen ?? STAGES[stageIdx]?.color ?? 'var(--muted)';

  return (
    <span className="sb" style={{ color }}>
      <span className="sb__label">{status.replaceAll('_', ' ').toLowerCase()}</span>
      <span className="sb__rail">
        {STAGES.map((_, i) => (
          <span
            key={i}
            className={`sb__seg${!frozen && stageIdx >= 0 && i <= stageIdx ? ' sb__seg--on' : ''}`}
          />
        ))}
      </span>
    </span>
  );
}
