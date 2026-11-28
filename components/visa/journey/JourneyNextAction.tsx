"use client";

import { useState } from "react";
import type { JourneyNextActionView } from "@/lib/analytics/types";
import MilestoneQuickEditModal from "./MilestoneQuickEditModal";

export default function JourneyNextAction({
  action,
  onMilestoneSaved,
}: {
  action: JourneyNextActionView;
  onMilestoneSaved?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        data-testid="journey-next-action"
        className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-900">{action.title}</p>
          <p className="mt-0.5 text-[12px] text-mute">{action.description}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onMilestoneSaved) setModalOpen(true);
          }}
          className="btn-secondary min-h-[40px] w-full shrink-0 text-xs font-medium sm:min-h-[34px] sm:w-auto"
        >
          {action.buttonLabel}
        </button>
      </div>

      {onMilestoneSaved && (
        <MilestoneQuickEditModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          milestone={action.milestoneField}
          label={action.milestoneLabel}
          initialDate={action.currentDateValue}
          onSaved={onMilestoneSaved}
        />
      )}
    </>
  );
}
