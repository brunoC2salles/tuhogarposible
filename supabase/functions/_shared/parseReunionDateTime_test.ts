import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseReunionDateTime } from "./parseReunionDateTime.ts";

// Quarta-feira, 17 de junho de 2026, 12:00 Madrid (~10:00 UTC)
const BASE = new Date('2026-06-17T10:00:00Z');

Deno.test("mañana por la tarde → +1 dia, hora a definir", () => {
  const r = parseReunionDateTime("mañana x la tarde", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending_time");
});

Deno.test("mañana sozinho → +1 dia, hora a definir", () => {
  const r = parseReunionDateTime("mañana", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending_time");
});

Deno.test("lunes (só dia da semana) → próxima segunda, hora a definir", () => {
  const r = parseReunionDateTime("lunes", BASE);
  assertEquals(r.fecha, "2026-06-22");
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending_time");
});

Deno.test("lunes a las 16h → próxima segunda 16:00", () => {
  const r = parseReunionDateTime("lunes a las 16h", BASE);
  assertEquals(r.fecha, "2026-06-22");
  assertEquals(r.hora, "16:00:00");
  assertEquals(r.confidence, "high");
});

Deno.test("25/06 10:30 → data explícita", () => {
  const r = parseReunionDateTime("25/06 10:30", BASE);
  assertEquals(r.fecha, "2026-06-25");
  assertEquals(r.hora, "10:30:00");
  assertEquals(r.confidence, "high");
});

Deno.test("vazio → tudo a definir", () => {
  const r = parseReunionDateTime("", BASE);
  assertEquals(r.fecha, null);
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending");
});

Deno.test("cualquier día → tudo a definir (sem fallback)", () => {
  const r = parseReunionDateTime("cualquier día", BASE);
  assertEquals(r.fecha, null);
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending");
});

Deno.test("qualquier dia - 12h → próximo dia útil 12:00", () => {
  const r = parseReunionDateTime("qualquier dia - 12h", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "12:00:00");
});

Deno.test("4 de la tarde com mañana → 16:00", () => {
  const r = parseReunionDateTime("mañana 4 de la tarde", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "16:00:00");
});
