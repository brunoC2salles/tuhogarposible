
# Plano: Atualização do Checkbox de Privacidade nos Simuladores

## Objetivo

Atualizar o checkbox de privacidade em ambos os simuladores (Crédito Personal e Crédito Hipotecario) para:
1. Exibir o texto: **"LECTURA IMPORTANTE AL CLIENTE: CONSENTIMIENTO PARA LA RECOLECCIÓN Y TRATAMIENTO DE DOCUMENTACIÓN HIPOTECARIA"**
2. Ao clicar no link, abrir o documento PDF de consentimento para visualização

---

## Análise do Estado Atual

### Simulador de Crédito Personal (`SimuladorCreditoPersonal.tsx`)
- Linhas 262-279: Checkbox com link para `https://tuhogarposible.com/politica-de-privacidad`
- Texto atual: "Acepto la Política de Privacidad y el tratamiento de mis datos conforme al RGPD"

### Simulador de Crédito Hipotecario (`SimuladorCreditoHipotecario.tsx`)
- Linhas 910-927: Checkbox com link para `https://tuhogarposible.com/politica-de-privacidad`
- Texto atual: Idêntico ao do simulador personal

### Documento PDF Enviado
- Título: "CONSENTIMIENTO PARA LA RECOLECCIÓN Y TRATAMIENTO DE DOCUMENTACIÓN HIPOTECARIA"
- Conteúdo: 8 seções cobrindo dados do titular, intermediário, objeto do consentimento, documentação autorizada, uso e transferência, proteção de dados, vigência e declaração final
- 2 páginas com campos para assinatura

---

## Solução Proposta

### Abordagem Simples e Leve

1. **Copiar o PDF** para a pasta `public/docs/`
2. **Modificar apenas as linhas do checkbox** em ambos os simuladores
3. O link abrirá o PDF diretamente em uma nova aba (comportamento nativo do navegador)

Essa abordagem:
- Não cria novos componentes
- Não adiciona peso à aplicação
- Aproveita o comportamento nativo do navegador para PDFs
- É a mais simples e eficiente

---

## Alterações Necessárias

### 1. Copiar o PDF para o projeto

**Ação**: Copiar o arquivo PDF enviado para `public/docs/consentimiento-hipotecario.pdf`

**Motivo**: Arquivos na pasta `public` são servidos diretamente e podem ser acessados via URL

---

### 2. Modificar `SimuladorCreditoPersonal.tsx`

**Localização**: Linhas 262-279

**Antes**:
```tsx
<div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
  <Checkbox 
    id="aceptaPrivacidad" 
    checked={watchAceptaPrivacidad}
    onCheckedChange={(checked) => setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
  />
  <div className="grid gap-1.5 leading-none">
    <label htmlFor="aceptaPrivacidad" className="text-sm font-medium cursor-pointer">
      Acepto la <a href="https://tuhogarposible.com/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Política de Privacidad</a> y el tratamiento de mis datos conforme al RGPD *
    </label>
  </div>
</div>
```

**Depois**:
```tsx
<div className="flex items-start space-x-3 p-4 border-2 border-amber-500/50 rounded-lg bg-amber-50/50">
  <Checkbox 
    id="aceptaPrivacidad" 
    checked={watchAceptaPrivacidad}
    onCheckedChange={(checked) => setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
  />
  <div className="grid gap-1.5 leading-none">
    <label htmlFor="aceptaPrivacidad" className="text-sm font-medium cursor-pointer">
      <span className="font-bold text-amber-700 block mb-1">LECTURA IMPORTANTE AL CLIENTE:</span>
      <a 
        href="/docs/consentimiento-hipotecario.pdf" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary underline hover:text-primary/80"
      >
        CONSENTIMIENTO PARA LA RECOLECCIÓN Y TRATAMIENTO DE DOCUMENTACIÓN HIPOTECARIA
      </a>
      <span className="block mt-1 text-xs text-muted-foreground">
        Al marcar esta casilla, declaro haber leído y aceptar el documento de consentimiento *
      </span>
    </label>
  </div>
</div>
```

---

### 3. Modificar `SimuladorCreditoHipotecario.tsx`

**Localização**: Linhas 910-927

**Antes**:
```tsx
<div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/30">
  <Checkbox 
    id="aceptaPrivacidadHipoteca" 
    checked={watchAceptaPrivacidad}
    onCheckedChange={(checked) => form.setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
  />
  <div className="grid gap-1.5 leading-none">
    <label htmlFor="aceptaPrivacidadHipoteca" className="text-sm font-medium cursor-pointer">
      Acepto la <a href="https://tuhogarposible.com/politica-de-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Política de Privacidad</a> y el tratamiento de mis datos conforme al RGPD *
    </label>
  </div>
</div>
```

**Depois**:
```tsx
<div className="flex items-start space-x-3 p-4 border-2 border-amber-500/50 rounded-lg bg-amber-50/50">
  <Checkbox 
    id="aceptaPrivacidadHipoteca" 
    checked={watchAceptaPrivacidad}
    onCheckedChange={(checked) => form.setValue("aceptaPrivacidad", checked === true, { shouldValidate: true })}
  />
  <div className="grid gap-1.5 leading-none">
    <label htmlFor="aceptaPrivacidadHipoteca" className="text-sm font-medium cursor-pointer">
      <span className="font-bold text-amber-700 block mb-1">LECTURA IMPORTANTE AL CLIENTE:</span>
      <a 
        href="/docs/consentimiento-hipotecario.pdf" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-primary underline hover:text-primary/80"
      >
        CONSENTIMIENTO PARA LA RECOLECCIÓN Y TRATAMIENTO DE DOCUMENTACIÓN HIPOTECARIA
      </a>
      <span className="block mt-1 text-xs text-muted-foreground">
        Al marcar esta casilla, declaro haber leído y aceptar el documento de consentimiento *
      </span>
    </label>
  </div>
</div>
```

---

## Resumo das Mudanças

| Arquivo | Ação | Linhas Afetadas |
|---------|------|-----------------|
| `public/docs/consentimiento-hipotecario.pdf` | Criar (copiar do upload) | N/A |
| `SimuladorCreditoPersonal.tsx` | Modificar checkbox | 264-274 |
| `SimuladorCreditoHipotecario.tsx` | Modificar checkbox | 912-922 |

---

## Resultado Visual Esperado

O checkbox terá:
1. **Borda amarela** para destacar a importância
2. **Fundo levemente amarelo** para chamar atenção
3. **Título em negrito** "LECTURA IMPORTANTE AL CLIENTE:"
4. **Link clicável** que abre o PDF em nova aba
5. **Texto auxiliar** explicando que marcar a casilla significa concordar

---

## O que NÃO será alterado

- Schema de validação (já funciona com `aceptaPrivacidad: boolean`)
- Lógica de cálculo dos simuladores
- Comportamento do formulário
- Outros componentes ou arquivos

---

## Seção Técnica

### Por que usar `public/docs/` em vez de `src/assets/`?

- PDFs na pasta `public` são servidos diretamente via URL (`/docs/arquivo.pdf`)
- Não precisam de import em JavaScript
- O navegador abre PDFs nativamente, sem necessidade de biblioteca adicional
- É a abordagem mais simples e leve para servir documentos estáticos

### Por que não criar um modal de preview?

- Adiciona complexidade desnecessária
- Requer bibliotecas como `react-pdf` ou iframes
- O comportamento nativo do navegador (abrir PDF em nova aba) é mais robusto
- Permite que o usuário baixe/imprima facilmente

