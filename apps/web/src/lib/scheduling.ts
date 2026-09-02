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
