import { describe, expect, it } from "vitest";
import { calculateWorkMetrics } from "./metrics";
describe("calculateWorkMetrics",()=>{ it("uses final completed values and actual duration",()=>{ expect(calculateWorkMetrics([{finalPrice:"120.00",actualDurationMinutes:60},{finalPrice:"90.00",actualDurationMinutes:30}])).toEqual({revenue:210,minutes:90,hours:1.5,hourlyIncome:140}); }); it("avoids division by zero",()=>{ expect(calculateWorkMetrics([]).hourlyIncome).toBe(0); }); });
