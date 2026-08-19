import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseReunionDateTime } from "./parseReunionDateTime.ts";

// Quarta-feira, 17 de junho de 2026, 12:00 Madrid (~10:00 UTC)
const BASE = new Date('2026-06-17T10:00:00Z');
// Segunda-feira, 3 de agosto de 2026, 10:00 Madrid (08:00 UTC)
const AGO = new Date('2026-08-03T08:00:00Z');

Deno.test("mañana por la tarde → +1 dia, hora a definir", () => {
  const r = parseReunionDateTime("mañana x la tarde", BASE);
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
});

Deno.test("vazio → tudo a definir", () => {
  const r = parseReunionDateTime("", BASE);
  assertEquals(r.fecha, null);
  assertEquals(r.hora, null);
  assertEquals(r.confidence, "pending");
});

Deno.test("cualquier día → próximo dia útil 11:00", () => {
  const r = parseReunionDateTime("cualquier día", BASE);
  assertEquals(r.fecha, "2026-06-18");
  assertEquals(r.hora, "11:00:00");
});

// --- casos reais que geravam horas de madrugada ---

Deno.test("3/8 → 03/08 sem hora (não vira 03:00)", () => {
  const r = parseReunionDateTime("3/8", AGO);
  assertEquals(r.fecha, "2026-08-03");
  assertEquals(r.hora, null);
});

Deno.test("05/08/2026 → 05/08 sem hora", () => {
  const r = parseReunionDateTime("05/08/2026", AGO);
  assertEquals(r.fecha, "2026-08-05");
  assertEquals(r.hora, null);
});

Deno.test("Lunes 3 8 hra 5 pm → 03/08 17:00", () => {
  const r = parseReunionDateTime("Lunes 3  8  hra 5 pm", AGO);
  assertEquals(r.fecha, "2026-08-03");
  assertEquals(r.hora, "17:00:00");
});

Deno.test("03 08 11 → 11:00 (empurrado p/ 04/08 pelo buffer de 2h)", () => {
  const r = parseReunionDateTime("03 08 11", AGO);
  assertEquals(r.fecha, "2026-08-04");
  assertEquals(r.hora, "11:00:00");
});

Deno.test("8 de agosto → 10/08 (sábado empurrado), hora a definir", () => {
  const r = parseReunionDateTime("8 de agosto", AGO);
  assertEquals(r.fecha, "2026-08-10");
  assertEquals(r.hora, null);
});

Deno.test("14 /08/26 → 14/08 sem hora", () => {
  const r = parseReunionDateTime("14 /08/26", AGO);
  assertEquals(r.fecha, "2026-08-14");
  assertEquals(r.hora, null);
});

Deno.test("18.3 → fora de horizonte, fallback próximo dia útil 11:00", () => {
  const r = parseReunionDateTime("18.3", AGO);
  assertEquals(r.fecha, "2026-08-04");
  assertEquals(r.hora, "11:00:00");
});

Deno.test("después de las 6 → 18:00", () => {
  const r = parseReunionDateTime("mandame wassap para atenderte despues de las 6", AGO);
  assertEquals(r.hora, "18:00:00");
});

Deno.test("El 10 de 09 ha las 2.30 P.M → 10/09 14:30", () => {
  const r = parseReunionDateTime("El  10 de 09 ha las 2.30 P.M 2026", AGO);
  assertEquals(r.fecha, "2026-09-10");
  assertEquals(r.hora, "14:30:00");
});

Deno.test("3 de agosto por la mañana sobre 12 → 03/08 12:00", () => {
  const r = parseReunionDateTime("3 de agosto por la mañana sobre 12", AGO);
  assertEquals(r.fecha, "2026-08-03");
  assertEquals(r.hora, "12:00:00");
});

Deno.test("nunca devolve hora fora de 08:00-20:00", () => {
  for (const t of ["a las 3", "a las 23", "0:30", "05/08/2026", "3/8", "22h"]) {
    const r = parseReunionDateTime(t, AGO);
    if (r.hora) {
      const h = parseInt(r.hora.slice(0, 2), 10);
      assertEquals(h >= 8 && h <= 20, true, `hora inválida ${r.hora} para "${t}"`);
    }
  }
});

Deno.test("19082026 (compacto) → 19/08 sem hora", () => {
  const r = parseReunionDateTime("19082026", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.fecha, "2026-08-19");
});

Deno.test("2408 (compacto ddmm) → 24/08", () => {
  const r = parseReunionDateTime("2408", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.fecha, "2026-08-24");
});

Deno.test("24 (só o dia) → 24/08 sem hora", () => {
  const r = parseReunionDateTime("24", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.fecha, "2026-08-24");
  assertEquals(r.hora, null);
});

Deno.test("15.12.2026 → data longínqua aceite", () => {
  const r = parseReunionDateTime("15.12.2026", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.fecha, "2026-12-15");
});

Deno.test("21/08 11/12 → franja, 11:00", () => {
  const r = parseReunionDateTime("21/08 11/12", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.fecha, "2026-08-21");
  assertEquals(r.hora, "11:00:00");
});

Deno.test("20/08 16/30 → hora exacta 16:30", () => {
  const r = parseReunionDateTime("20/08 16/30", new Date("2026-08-19T06:00:00Z"));
  assertEquals(r.hora, "16:30:00");
});

Deno.test("Canárias → +1h para hora peninsular", () => {
  const r = parseReunionDateTime("18/08,2026 ,12h Canarias", new Date("2026-08-17T06:00:00Z"));
  assertEquals(r.fecha, "2026-08-18");
  assertEquals(r.hora, "13:00:00");
});
