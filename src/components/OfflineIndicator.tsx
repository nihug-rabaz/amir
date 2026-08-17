'use client';
import { useOffline } from '@/lib/offline/context';
import { IconAlert, IconCheck } from '@/components/Icon';

export function OfflineIndicator() {
  const { online, pending, syncing, syncNow } = useOffline();
  const show = !online || pending > 0 || syncing;
  if (!show) return null;

  const offline = !online;
  const tone = offline ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-sky-50 border-sky-200 text-sky-950';

  return (
    <div className={`border-b px-3 sm:px-4 md:px-6 py-2 text-sm ${tone}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {offline ? <IconAlert size={16} className="shrink-0" /> : <IconCheck size={16} className="shrink-0" />}
          <div className="min-w-0">
            <div className="font-bold leading-tight">
              {syncing ? 'מסנכרן שינויים…' : offline ? 'אין חיבור לרשת' : 'יש שינויים ממתינים לסנכרון'}
            </div>
            <div className="text-xs opacity-80 leading-tight mt-0.5">
              {offline
                ? 'השינויים נשמרים מקומית ויישלחו לשרת כשהחיבור יחזור'
                : `${pending} שינויים ממתינים`}
            </div>
          </div>
        </div>
        {online && pending > 0 && !syncing && (
          <button type="button" onClick={syncNow} className="btn btn-sm btn-ghost shrink-0">
            סנכרן עכשיו
          </button>
        )}
      </div>
    </div>
  );
}
