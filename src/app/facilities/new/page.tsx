'use client';
import { FacilityForm } from '@/components/facility/FacilityForm';
import { useAuth } from '@/lib/auth-context';

export default function NewFacilityPage() {
  const { user } = useAuth();
  return <FacilityForm mode="new" actor={user} />;
}
