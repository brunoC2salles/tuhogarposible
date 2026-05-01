## Feed XML público do inventário

Criar uma edge function pública que retorna em tempo real um XML com **todos os 12.375 imóveis** do inventário, pronto para ser consumido por portais ou ferramentas externas.

### Endpoint
```
GET https://tnzgpzablwfptagfbnvb.supabase.co/functions/v1/inventory-xml
```

Parâmetros opcionais (querystring):
- `disponible=true` — filtra só os disponíveis
- `proveedor=Hipoges` — filtra por fornecedor
- `limit=N` — limita quantidade (default: todos)

Resposta: `Content-Type: application/xml; charset=utf-8`, com cache de 10 minutos (`Cache-Control: public, max-age=600`).

### Estrutura XML gerada

```xml
<?xml version="1.0" encoding="UTF-8"?>
<inmuebles generated_at="2026-05-01T12:00:00Z" total="12375">
  <inmueble>
    <id>uuid</id>
    <codigo_inventario>HIP-12345</codigo_inventario>
    <titulo><![CDATA[Piso reformado en centro]]></titulo>
    <tipo>apartamento</tipo>
    <precio currency="EUR">125000</precio>
    <disponible>true</disponible>
    <ubicacion>
      <ciudad><![CDATA[Madrid]]></ciudad>
      <region><![CDATA[Comunidad de Madrid]]></region>
      <direccion><![CDATA[Calle Mayor 12]]></direccion>
    </ubicacion>
    <caracteristicas>
      <quartos>3</quartos>
      <banheiros>2</banheiros>
      <area_m2>85</area_m2>
    </caracteristicas>
    <proveedor><![CDATA[Hipoges]]></proveedor>
    <url_externa>https://...</url_externa>
    <imagen_principal>https://...</imagen_principal>
    <imagenes>
      <imagen>https://...</imagen>
      <imagen>https://...</imagen>
    </imagenes>
    <fechas>
      <created_at>2026-04-15T10:00:00Z</created_at>
      <updated_at>2026-04-30T08:00:00Z</updated_at>
    </fechas>
  </inmueble>
  ...
</inmuebles>
```

Todos os campos texto vão envolvidos em `<![CDATA[...]]>` para evitar erros com caracteres especiais (`&`, `<`, acentos).

### Detalhes técnicos

1. **Nova edge function** `supabase/functions/inventory-xml/index.ts`:
   - Pública (sem JWT) — necessário para portais externos consumirem.
   - Usa `SUPABASE_SERVICE_ROLE_KEY` internamente para ignorar RLS e ler todos os imóveis.
   - Pagina internamente em lotes de 1000 (limite padrão Supabase) para extrair os 12k+ registros.
   - Constrói o XML em streaming (string builder) e retorna como `application/xml`.
   - CORS habilitado para `*`.

2. **Sem alterações no banco** — apenas leitura.

3. **Sem alterações no frontend** — é um endpoint puro. Opcionalmente posso adicionar um botão "Copiar URL do feed XML" em `/admin/inventario` (avise se quer).

### O que será criado/editado
- `supabase/functions/inventory-xml/index.ts` (novo)
- `supabase/config.toml` — registrar a função com `verify_jwt = false`

### Após implantar
Vou testar o endpoint com `curl`, validar o XML retornado e te passar a URL pronta para uso.