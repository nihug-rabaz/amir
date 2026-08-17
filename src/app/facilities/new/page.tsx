'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FacilityForm } from '@/components/facility/FacilityForm';
import { useAuth } from '@/lib/auth-context';
import { canCreateFacility } from '@/lib/permissions';

export default function NewFacilityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const allowed = canCreateFacility(user);

  useEffect(() => {
    if (user && !allowed) router.replace('/facilities');
  }, [user, allowed, router]);

  if (!allowed) return <div className="card card-padded text-slate-500">אין הרשאה להוספת מתקן</div>;
  return <FacilityForm mode="new" actor={user} />;
}
