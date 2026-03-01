"use client"

import { useEffect, useState } from "react"

export default function TicketThread({ params }: any) {
  const [data, setData] = useState<any>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch(`/api/tickets/${params.id}`)
      .then(res => res.json())
      .then(setData)
  }, [])

  if (!data) return <p>Loading...</p>

  const sendReply = async () => {
    await fetch(`/api/tickets/${params.id}/reply`, {
      method: "POST",
      body: JSON.stringify({
        user: "Manager",
        role: "manager",
        message
      })
    })
    location.reload()
  }

  const closeTicket = async () => {
    await fetch(`/api/tickets/${params.id}/close`, {
      method: "POST"
    })
    location.reload()
  }

  return (
    <div>
      <h1>{data.ticket.title}</h1>
      <p>{data.ticket.description}</p>
      <p>Status: {data.ticket.status}</p>

      <button onClick={closeTicket}>Close Ticket</button>

      <hr />

      {data.replies.map((r:any)=>(
        <div key={r.id} style={{marginTop:10}}>
          <strong>{r.user_name} ({r.role})</strong>
          <p>{r.message}</p>
        </div>
      ))}

      <textarea
        value={message}
        onChange={e=>setMessage(e.target.value)}
      />

      <button onClick={sendReply}>Reply</button>
    </div>
  )
}