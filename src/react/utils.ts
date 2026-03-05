import type { MirrorSchedule } from "../mirror";
import type { ScheduleExecutionState } from "../scheduled";

/**
 * Derives a schedule execution state from Mirror Node schedule payload.
 */
export function deriveScheduleState(schedule: MirrorSchedule): ScheduleExecutionState {
  if (schedule.executed_timestamp) {
    return "Executed";
  }

  if (schedule.deleted) {
    return "Failed";
  }

  if (schedule.expiration_time) {
    const expiresAt = Date.parse(schedule.expiration_time);
    if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      return "Expired";
    }
  }

  return "Pending";
}
