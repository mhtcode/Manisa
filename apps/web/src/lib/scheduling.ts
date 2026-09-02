export function appointmentsOverlap(
  firstStart: Date,
  firstDurationMinutes: number,
  secondStart: Date,
  secondDurationMinutes: number,
) {
  const minute = 60_000;
  const firstEnd = new Date(firstStart.getTime() + firstDurationMinutes * minute);
  const secondEnd = new Date(secondStart.getTime() + secondDurationMinutes * minute);

  return firstStart < secondEnd && firstEnd > secondStart;
}

export function appointmentExpectedEnd(startAt: Date, expectedDurationMinutes: number) {
  return new Date(startAt.getTime() + expectedDurationMinutes * 60_000);
}

export function canFinalizeAppointment(status: string, startAt: Date, expectedDurationMinutes: number, now = new Date()) {
  return status === "CONFIRMED" && appointmentExpectedEnd(startAt, expectedDurationMinutes) <= now;
}
