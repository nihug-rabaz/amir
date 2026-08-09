'use client';
import { useState } from 'react';
import { Modal } from './Modal';
import { BrandMark } from './BrandMark';
import { PWA_INSTALL_LABEL, usePwaInstall } from '@/lib/pwa-install';

// Entry popup and shared install dialog for adding the PWA to the phone.
export function PwaInstallPrompt() {
  const { popupOpen, closePopup, install, isIos, canInstall } = usePwaInstall();
  const [busy, setBusy] = useState(false);
  const [manualHint, setManualHint] = useState(false);

  if (!canInstall) return null;

  const onInstall = async () => {
    setBusy(true);
    const outcome = await install();
    setBusy(false);
    if (outcome === 'accepted') {
      closePopup(false);
      return;
    }
    if (outcome === 'manual' || outcome === 'unavailable') {
      setManualHint(true);
      return;
    }
    closePopup(true);
  };

  return (
    <Modal
      open={popupOpen}
      title={PWA_INSTALL_LABEL}
      subtitle="הוסיפו את אמי״ר למסך הבית לגישה מהירה כמו אפליקציה"
      onClose={() => closePopup(true)}
      width="420px"
      footer={
        <div className="flex flex-wrap gap-2 w-full justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => closePopup(true)}>
            לא עכשיו
          </button>
          {!isIos && !manualHint && (
            <button type="button" className="btn btn-accent" disabled={busy} onClick={onInstall}>
              {busy ? 'פותח…' : PWA_INSTALL_LABEL}
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center text-center gap-3">
        <BrandMark size={72} />
        <p className="m-0 text-sm text-slate-600 leading-relaxed">
          התקינו את אמי״ר במכשיר לשימוש נוח מהמסך הראשי, גם במצב לא מקוון חלקי.
        </p>
        {(isIos || manualHint) && (
          <ol className="m-0 p-0 list-decimal list-inside text-sm text-slate-700 text-right w-full space-y-1.5">
            <li>לחצו על כפתור השיתוף בדפדפן</li>
            <li>בחרו &quot;הוסף למסך הבית&quot;</li>
            <li>אשרו את ההוספה</li>
          </ol>
        )}
      </div>
    </Modal>
  );
}
