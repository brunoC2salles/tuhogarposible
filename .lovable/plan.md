

# Plano: endurecer regra de ahorros (mínimo 5.000€ ou "si/sí/yes") + garantir uso no Precio Máximo

## O que muda

Hoje o webhook qualifica o lead se:
- responder afirmativamente (`si`, `sí`, `yes`, `true`, `1`, `y`, `s`) **OU**
- declarar `monto_ahorros > 0`

Você quer endurecer para:
- responder afirmativamente **apenas com `si`, `sí`, `yes`** **OU**
- declarar `monto_ahorros >= 5.000€`

Se nenhum dos dois → lead **descualificado**.

## Arquivo único alterado

`supabase/functions/meta-lead-webhook/index.ts`

### Alteração 1 — função `qualificarLead` (Critério 7)

Substituir o bloco atual:
```ts
const respuestasAfirmativas = ['si', 'sí', 'yes', 'true', '1', 'y', 's'];
const tieneRespuestaAfirmativa = respuestasAfirmativas.includes(respuestaAhorros);
const tieneMontoValido = (montoAhorros ?? 0) > 0;

if (!tieneRespuestaAfirmativa && !tieneMontoValido) {
  return { cualificado: false, razon_no_cualificado: 'Sin ahorros declarados...' };
}
```

Pelo novo:
```ts
const AHORROS_MINIMO = 5000;
const respuestasAfirmativas = ['si', 'sí', 'yes'];
const tieneRespuestaAfirmativa = respuestasAfirmativas.includes(respuestaAhorros);
const tieneMontoSuficiente = (montoAhorros ?? 0) >= AHORROS_MINIMO;

if (!tieneRespuestaAfirmativa && !tieneMontoSuficiente) {
  return {
    cualificado: false,
    razon_no_cualificado: `Ahorros insuficientes (mínimo ${AHORROS_MINIMO}€ o respuesta afirmativa)`
  };
}
```

### Alteração 2 — confirmar fluxo do `montoAhorros` no Precio Máximo

Já está correto hoje (linha 829-834): `calcularPrecioMaximoInmuebleMeta({ ahorros: montoAhorros, ... })` aplica a fórmula que já validamos:

- **P1** (tope por ahorros): `CPmax = (15.000 + ahorros) / 2` → `PrecioMax_P1 = CPmax / %ITP_CCAA`
- **P2** (tope por ingresos): `montoMaxFinanciable / %financiación`
- **Precio recomendado** = `MIN(P1, P2)`

Vou apenas adicionar um log explícito para deixar visível no log do edge function que o `montoAhorros` usado é o mesmo valor que validou o lead (rastreabilidade).

### Alteração 3 — atualizar memória

Atualizar `mem://features/meta-ads-qualification-rules-2025` para refletir a nova regra (mínimo 5.000€, lista de afirmativas reduzida para `si/sí/yes`).

## O que NÃO muda

- Builder Bitrix (`_shared/bitrixPayload.ts`): intocado. `meta_monto_ahorros` continua chegando ao Make igual.
- Simulador front (`src/lib/simuladorUtils.ts`): mantém a regra dinâmica `valor_inmueble × %ITP CCAA` (mais rigorosa que 5k para imóveis caros).
- URLs do webhook: as mesmas.
- Cálculos de hipoteca e crédito pessoal: intocados.
- Banco de dados: nenhuma migração.

## Impacto esperado

- Leads com `monto_ahorros < 5.000€` **e sem resposta `si/sí/yes`** → automaticamente para `descualificados` e disparam o webhook de descualificados.
- Leads que dizem `si/sí/yes` continuam qualificados mesmo sem informar valor exato.
- O valor de `montoAhorros` (mesmo que < 5.000€, quando combinado com resposta afirmativa) continua entrando no cálculo de `precio_max_recomendado` via P1.

## Validação após deploy

1. Enviar payload de teste com `monto_ahorros: 3000` e `tiene_ahorros_impuestos: ""` → deve resultar em `descualificados` com razão "Ahorros insuficientes".
2. Enviar com `monto_ahorros: 0` e `tiene_ahorros_impuestos: "si"` → deve qualificar.
3. Enviar com `monto_ahorros: 8000` e `tiene_ahorros_impuestos: ""` → deve qualificar.
4. Conferir nos logs do edge function que `[CP]`, `Precio máximo inmueble` e `meta_monto_ahorros` no payload Bitrix usam o mesmo `montoAhorros`.

