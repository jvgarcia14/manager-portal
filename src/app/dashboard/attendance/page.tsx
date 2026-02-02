"use client";

import { useEffect, useState } from "react";

type AttendanceResponse = {
  day: string;
  data: Record<string, Record<string, {
    users: { name: string; time: string }[];
    covers: { name: string; time: string }[];
    late: { name: string; time: string; isCover: boolean }[];
  }>>;
};

export default function AttendancePage() {
  const [day, setDay] = useState("");
  const [att, setAtt] = useState<AttendanceResponse | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/attendance")
      .then(r => r.json())
      .then(d => {
        setAtt(d);
        setDay(d.day);
      });
  }, []);

  useEffect(() => {
    if (!day) return;
    fetch(`/api/dashboard/attendance?day=${encodeURIComponent(day)}`)
      .then(r => r.json())
      .then(setAtt);
  }, [day]);

  const shifts = ["prime", "midshift", "closing"] as const;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <input
          type="date"
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
      </div>

      {shifts.map((shift) => {
        const pages = att?.data?.[shift] ?? {};
        const pageKeys = Object.keys(pages);

        return (
          <div key={shift} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="font-medium capitalize mb-3">{shift} shift</h2>

            {pageKeys.length === 0 ? (
              <div className="opacity-70 text-sm">No clock-ins recorded.</div>
            ) : (
              <div className="space-y-3">
                {pageKeys.map((pk) => {
                  const item = pages[pk];
                  return (
                    <div key={pk} className="rounded-xl border border-white/10 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">#{pk}</div>
                        <div className="text-sm opacity-70">
                          Users: {item.users.length} • Covers: {item.covers.length} • Late: {item.late.length}
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <List title="Clocked in" items={item.users.map(u => `${u.name} (${u.time})`)} />
                        <List title="Covers" items={item.covers.map(u => `${u.name} (${u.time})`)} />
                        <List title="Late" items={item.late.map(u => `${u.name} (${u.time})${u.isCover ? " [cover]" : ""}`)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 p-2">
      <div className="opacity-70 mb-1">{title}</div>
      {items.length === 0 ? <div className="opacity-50">—</div> : (
        <ul className="list-disc pl-5 space-y-1">
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}
