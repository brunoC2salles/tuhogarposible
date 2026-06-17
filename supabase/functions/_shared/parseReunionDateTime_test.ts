import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseReunionDateTime } from "./parseReunionDateTime.ts";

// Quarta-feira, 17 de junho de 2026, 12:00 Madrid (~10:00 UTC)
const BASE = new Date('2026-06-17T10:00:00Z');

Deno.test("mañana por la tarde → +1 dia 15:00", () => {
  const r = parseReunionDateTime("mañana x la tarde", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "15:00:00");
  assertEquals(r.confidence, "medium");
});

Deno.test("lunes a las 16h → próxima segunda 16:00", () => {
  const r = parseReunionDateTime("lunes a las 16h", BASE);
  assertEquals(r.fecha, "2026-06-22");
  assertEquals(r.hora, "16:00:00");
  assertEquals(r.confidence, "high");
});

Deno.test("qualquier dia - 12h → próximo dia útil 12:00", () => {
  const r = parseReunionDateTime("qualquier dia - 12h", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "12:00:00");
  assertEquals(r.confidence, "medium");
});

Deno.test("25/06 10:30 → data explícita", () => {
  const r = parseReunionDateTime("25/06 10:30", BASE);
  assertEquals(r.fecha, "2026-06-25");
  assertEquals(r.hora, "10:30:00");
  assertEquals(r.confidence, "high");
});

Deno.test("vazio → próximo dia útil 10:00", () => {
  const r = parseReunionDateTime("", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "10:00:00");
  assertEquals(r.confidence, "low");
});

Deno.test("cuando puedan → próximo dia útil 10:00 low", () => {
  const r = parseReunionDateTime("cuando puedan", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "10:00:00");
  assertEquals(r.confidence, "low");
});

Deno.test("domingo 11h → empurra para segunda 10:00 (sem menção fim de semana)", () => {
  // domingo cai em 2026-06-21; mencionou "domingo" → mentionedWeekend=true, então respeita
  const r = parseReunionDateTime("domingo 11h", BASE);
  assertEquals(r.fecha, "2026-06-21");
  assertEquals(r.hora, "11:00:00");
});

Deno.test("4 de la tarde → 16:00", () => {
  const r = parseReunionDateTime("mañana 4 de la tarde", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "16:00:00");
});
