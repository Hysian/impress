import { useState } from "react";
import { useTranslation } from "react-i18next";

interface SchedulePublishModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (date: string) => void;
  currentSchedule?: string | null;
}

export default function SchedulePublishModal({ open, onClose, onSchedule, currentSchedule }: SchedulePublishModalProps) {
  const [date, setDate] = useState(currentSchedule ?? "");
  const { t } = useTranslation();

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date) onSchedule(date);
  };

  const minDate = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">{t("schedule.title", "Schedule Publish")}</h3>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-600 mb-2">
            {t("schedule.datetime", "Publish Date & Time")}
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={minDate}
            className="w-full border rounded px-3 py-2 mb-4"
            required
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
              {t("common.cancel", "Cancel")}
            </button>
            {currentSchedule && (
              <button type="button" onClick={() => onSchedule("")} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded">
                {t("schedule.cancel_schedule", "Cancel Schedule")}
              </button>
            )}
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              {t("schedule.confirm", "Schedule")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
