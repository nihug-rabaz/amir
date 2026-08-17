'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FacilityForm } from '@/components/facility/FacilityForm';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { offlineJson } from '@/lib/offline/api';
import type { Facility } from '@/lib/types';

export default function EditFacilityPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    offlineJson<{ facility?: Facility; error?: string }>(`/api/facilities/${id}`)
      .then((j) => {
        if (j.data.error) { setError(j.data.error); return; }
        setFacility(j.data.facility || null);
        if (j.fromCache) toast.warning('מצב לא מקוון', 'מוצגים נתונים שמורים מקומית');
      })
      .catch((e) => setError(String(e)));
  }, [id, toast]);

  if (error) return <div className="card card-padded text-bad">שגיאה: {error}</div>;
  if (!facility) return <div className="card card-padded text-slate-500">טוען מתקן לעריכה…</div>;
  return <FacilityForm mode="edit" initial={facility} actor={user} />;
}
