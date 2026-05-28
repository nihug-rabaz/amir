'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FacilityForm } from '@/components/facility/FacilityForm';
import { useAuth } from '@/lib/auth-context';
import type { Facility } from '@/lib/types';

export default function EditFacilityPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/facilities/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setFacility(j.facility);
      })
      .catch((e) => setError(String(e)));
  }, [id]);

  if (error) return <div className="card card-padded text-bad">שגיאה: {error}</div>;
  if (!facility) return <div className="card card-padded text-slate-500">טוען מתקן לעריכה…</div>;
  return <FacilityForm mode="edit" initial={facility} actor={user} />;
}
