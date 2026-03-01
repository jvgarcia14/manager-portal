"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/tickets")
      .then(res => res.json())
      .then(setTickets)
  }, [])

  return (
    <div>
      <h1>Ticket System</h1>

      <Link href="/dashboard/tickets/new">
        <button>Create Ticket</button>
      </Link>

      {tickets.map(ticket => (
        <div key={ticket.id} style={{border:"1px solid #333", padding:10, marginTop:10}}>
          <Link href={`/dashboard/tickets/${ticket.id}`}>
            <h3>{ticket.title}</h3>
          </Link>
          <p>Status: {ticket.status}</p>
          <small>{ticket.created_by}</small>
        </div>
      ))}
    </div>
  )
}