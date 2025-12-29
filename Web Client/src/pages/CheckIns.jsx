import PageHeader from '../ui/PageHeader.jsx'
import EmptyPanel from '../ui/EmptyPanel.jsx'

export default function CheckIns() {
  return (
    <div>
      <PageHeader
        eyebrow="Check-ins"
        title="Member attendance"
        description="Validate active subscriptions and log entry times."
        actions={<button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">New check-in</button>}
      />
      <EmptyPanel title="No check-ins yet" body="Scan a member QR or select a member to check in." />
    </div>
  )
}
