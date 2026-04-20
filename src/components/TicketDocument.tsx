import { forwardRef } from 'react'
import type { OrderData, EventData } from '../services/api'

interface TicketProps {
  order: OrderData
  event: EventData
}

function formatDateTime(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function getDayDate(event: EventData, day: number): string {
  if (!day || !event.startDate) return ''
  const start = new Date(event.startDate)
  start.setDate(start.getDate() + day - 1)
  return start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

function capitalize(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function getPurchaseDate(order: OrderData): string {
  const raw = order.paidAt ?? order.paid_at ?? order.createdAt ?? order.created_at ?? ''
  return raw ? formatDateTime(raw) : formatDateTime(new Date().toISOString())
}

const TicketDocument = forwardRef<HTMLDivElement, TicketProps>(({ order, event }, ref) => {
  const qrCodes = order.qrCodes ?? []

  return (
    <div ref={ref} style={{ fontFamily: 'sans-serif', width: '600px', backgroundColor: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: '#0d1b2a', padding: '28px 32px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '4px' }}>
          ╱GSWMI
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '20px' }}>
          Gbenga Samuel-Wemimo Ministry International
        </div>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>Event Ticket</div>
      </div>

      {/* ── Attendee info ── */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb' }}>

        {/* Event name */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Event: </span>
          <span style={{ fontSize: '13px', color: '#3b5bdb', fontWeight: '600' }}>{event.name}</span>
        </div>

        {/* Order + Amount */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Order #: <strong style={{ color: '#111' }}>{order.orderNumber}</strong>
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Amount paid: <strong style={{ color: '#111' }}>₦{order.totalAmount?.toLocaleString()}</strong>
          </span>
        </div>

        {/* Date of purchase */}
        <div style={{ marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Date of purchase: <strong style={{ color: '#111' }}>{getPurchaseDate(order)}</strong>
          </span>
        </div>

        {/* Accommodation type */}
        {(() => {
          const accQr = qrCodes.find((q) => q.type === 'accommodation')
          return accQr?.accommodationName ? (
            <div style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Accommodation: <strong style={{ color: '#111' }}>{accQr.accommodationName}</strong>
              </span>
            </div>
          ) : null
        })()}

        {/* Pickup location */}
        {(() => {
          const transportQr = qrCodes.find((q) => q.type === 'transport')
          return transportQr?.pickupLocation ? (
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Pickup location: <strong style={{ color: '#111' }}>{transportQr.pickupLocation}</strong>
              </span>
            </div>
          ) : null
        })()}

        {/* Attendee details */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b5bdb', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Attendee
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Name: <strong style={{ color: '#111' }}>{order.guest.firstName} {order.guest.lastName}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Email: <strong style={{ color: '#111' }}>{order.guest.email}</strong>
            </span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Phone: <strong style={{ color: '#111' }}>{order.guest.phone}</strong>
            </span>
          </div>
        </div>

      </div>{/* end attendee info */}

      {/* ── One card per QR code ── */}
      {qrCodes.map((qr, i) => {
        const isMeal = qr.type === 'meal'
        const isTransport = qr.type === 'transport'
        const isAccommodation = qr.type === 'accommodation'

        const cardTitle = isMeal
          ? `MEAL TICKET — DAY ${qr.day}${qr.day && event.startDate ? ` (${getDayDate(event, qr.day)})` : ''}`
          : isTransport
            ? 'TRANSPORTATION TICKET'
            : isAccommodation
              ? 'ACCOMMODATION TICKET'
              : qr.type.toUpperCase()

        const headerColor = isMeal ? '#3b5bdb' : isTransport ? '#0d9488' : '#7c3aed'

        return (
          <div key={i} style={{
            margin: i === 0 ? '24px 32px 16px' : '0 32px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>

            {/* Card header */}
            <div style={{ backgroundColor: headerColor, padding: '10px 16px' }}>
              <div style={{ color: 'white', fontSize: '12px', fontWeight: '700', letterSpacing: '1.5px' }}>
                {cardTitle}
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

              {/* Left: details */}
              <div style={{ flex: 1, paddingRight: '16px' }}>

                {isMeal && (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Meal slot</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', textTransform: 'capitalize' }}>{qr.mealType}</div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Meal option</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{qr.optionName}</div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Quantity</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{qr.quantity} pack{(qr.quantity ?? 1) > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '260px', lineHeight: '1.5' }}>
                      Redeem at designated meal times as announced by the GSWMI logistics team.
                    </div>
                  </>
                )}

                {isTransport && (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Direction</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{capitalize(qr.direction ?? 'to venue')}</div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Quantity</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{qr.quantity} seat{(qr.quantity ?? 1) > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '260px', lineHeight: '1.5' }}>
                      Present this QR code to the GSWMI transport team at your pickup location.
                    </div>
                  </>
                )}

                {isAccommodation && (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Room type</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{qr.optionName ?? 'Accommodation'}</div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>Quantity</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>{qr.quantity} room{(qr.quantity ?? 1) > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '260px', lineHeight: '1.5' }}>
                      Present this QR code to the GSWMI accommodation team upon check-in.
                    </div>
                  </>
                )}

              </div>{/* end left details */}

              {/* Right: QR code */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ width: '110px', height: '110px', border: `3px solid ${headerColor}`, borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', backgroundColor: '#fff' }}>
                  {qr.qrImage
                    ? <img src={qr.qrImage} alt="QR" width="104" height="104" />
                    : qr.code
                      ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(qr.code)}`} alt="QR" width="104" height="104" />
                      : <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px' }}>QR Code</span>
                  }
                </div>
                <div style={{ backgroundColor: headerColor, color: 'white', fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '2px', letterSpacing: '1px' }}>
                  SCAN ME
                </div>
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px' }}>{qr.code}</div>
              </div>{/* end right QR */}

            </div>{/* end card body */}

          </div>/* end card */
        )
      })}

      {/* ── Footer ── */}
      <div style={{ padding: '16px 32px', marginTop: '8px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: '#9ca3af' }}>
          Generated on {getPurchaseDate(order)} · GSWMI Event Management
        </div>
      </div>

    </div>
  )
})

TicketDocument.displayName = 'TicketDocument'
export default TicketDocument