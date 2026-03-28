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
  const start = new Date(event.startDate)
  start.setDate(start.getDate() + day - 1)
  return start.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()
}

const TicketDocument = forwardRef<HTMLDivElement, TicketProps>(({ order, event }, ref) => {
  const ticketCards: {
    day: number
    dayDate: string
    slot: string
    optionName: string
    quantity: number
    qrCode?: string
  }[] = []

  order.mealSelections?.forEach((sel) => {
    sel.meals.forEach((meal) => {
      const qr = order.qrCodes?.find(
        (q) => q.type === 'meal' && q.day === sel.day && q.mealType === meal.slot
      )
      ticketCards.push({
        day: sel.day,
        dayDate: getDayDate(event, sel.day),
        slot: meal.slot,
        optionName: meal.optionName,
        quantity: meal.quantity,
        qrCode: qr?.code,
      })
    })
  })

  return (
    <div ref={ref} style={{ fontFamily: 'sans-serif', width: '600px', backgroundColor: '#fff' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d1b2a', padding: '28px 32px', textAlign: 'center' }}>
        <div style={{ color: 'white', fontSize: '22px', fontWeight: 'bold', fontStyle: 'italic', marginBottom: '4px' }}>
          ╱GSWMI
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '20px' }}>
          Gbenga Samuel-Wemimo Ministry International
        </div>
        <div style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>Meal Ticket</div>
      </div>

      {/* Info section */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Event name: </span>
          <span style={{ fontSize: '13px', color: '#3b5bdb', fontWeight: '600' }}>{event.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Date of Purchase: <strong style={{ color: '#111' }}>{formatDateTime(order.paidAt ?? order.createdAt)}</strong>
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            Amount paid: <strong style={{ color: '#111' }}>₦{order.totalAmount?.toLocaleString()}</strong>
          </span>
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#3b5bdb', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Attendee
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>First name: <strong style={{ color: '#111' }}>{order.guest.firstName}</strong></span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Last name: <strong style={{ color: '#111' }}>{order.guest.lastName}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Email address: <strong style={{ color: '#111' }}>{order.guest.email}</strong></span>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Phone number: <strong style={{ color: '#111' }}>{order.guest.phone}</strong></span>
          </div>
        </div>
      </div>

      {/* Ticket cards */}
      {ticketCards.map((ticket, i) => (
        <div key={i} style={{ padding: '24px 32px', borderBottom: i < ticketCards.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#3b5bdb', marginBottom: '16px' }}>
                DAY {ticket.day} – {ticket.dayDate}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Meal slot:</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111', textTransform: 'capitalize' }}>{ticket.slot}</div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>Meal option:</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>{ticket.optionName}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>No. of packs:</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#111' }}>{ticket.quantity}</div>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic', maxWidth: '280px' }}>
                Note: You are only allowed to redeem tickets at designated meal times as announced by the GSWMI logistic team
              </div>
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ width: '120px', height: '120px', border: '3px solid #111', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', backgroundColor: '#fff' }}>
                {ticket.qrCode
                  ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ticket.qrCode)}`} alt="QR" width="114" height="114" />
                  : <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px' }}>QR Code</span>
                }
              </div>
              <div style={{ backgroundColor: '#111', color: 'white', fontSize: '11px', fontWeight: '700', padding: '4px 12px', borderRadius: '2px', letterSpacing: '1px' }}>
                SCAN ME
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

TicketDocument.displayName = 'TicketDocument'
export default TicketDocument