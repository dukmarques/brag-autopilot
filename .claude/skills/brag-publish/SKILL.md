# Skill: brag-publish

Você é um agente especializado em publicar entregas no Documento de Impacto (Brag Document) no Notion.
Seu papel é ler o arquivo de triagem gerado pela skill `brag-triage`, criar as páginas no Notion
usando os templates corretos e confirmar o que foi publicado.

---

## Contexto do Notion

### 1. Leitura do documento de impacto

O primeiro parâmetro obrigatório é `$NOTION_URL` — o link do Documento de Impacto do usuário.

Ao receber a URL, execute os seguintes passos antes de qualquer publicação:

**a)** Faça fetch da página principal para localizar o database inline:

```
notion fetch $NOTION_URL
```

**b)** A partir do database encontrado, faça fetch do database para obter:

- O **Database ID**
- O **Data Source ID** (no formato `collection://...`)
- As **propriedades** com seus nomes exatos, tipos e valores aceitos (multi_select options)
- Os **templates** disponíveis com seus IDs e nomes

**c)** Faça fetch de cada template para entender sua estrutura de conteúdo.

**d)** Armazene todos esses dados em memória — eles serão usados nas etapas seguintes.

> Se a URL não contiver um database com templates reconhecíveis como brag document,
> interrompa e informe o usuário com uma mensagem clara.

### Mapeamento esperado (estrutura de referência)

A skill espera encontrar no database as seguintes estruturas — mas sempre use os valores
reais retornados pelo fetch, nunca assuma nomes ou IDs fixos:

| O que buscar          | Exemplo do que pode encontrar                 |
| --------------------- | --------------------------------------------- |
| Propriedade título    | `Contribuição`                                |
| Propriedade período   | `Período` com opções de quarter (ex: `Q1/26`) |
| Propriedade escopo    | `Escopo` com categorias em multi_select       |
| Propriedade sprint    | `Sprint` (select ou text)                     |
| Templates             | Um por categoria de escopo                    |

### Prioridade de template

Quando uma entrega tiver múltiplas categorias, use o template cuja categoria aparecer
primeiro na lista de opções do campo `Escopo` retornada pelo fetch.
As demais categorias são adicionadas apenas como valores da propriedade `Escopo`.

---

## Parâmetros de entrada

- `$NOTION_URL` — link do Documento de Impacto do usuário (obrigatório, usado para descobrir o contexto)
- `$QUARTER` — ex: Q1/26
- `$SPRINT` _(opcional)_ — nome da sprint (ex: Sprint 5). Quando presente, filtra os itens do arquivo de triagem pela sprint informada.
- `--items` _(opcional)_ — lista de números separados por vírgula para publicar apenas itens específicos (ex: `--items 1,3,5`)
- `--dry-run` _(opcional)_ — simula a publicação sem criar nada no Notion, útil para validar

---

## Etapas de execução

### 1. Leitura do documento de impacto no Notion

Execute o fetch da `$NOTION_URL` conforme descrito na seção **Contexto do Notion**.
Certifique-se de ter em memória: Data Source ID, nomes exatos das propriedades,
opções válidas de `Período`, `Escopo` e `Sprint`, e IDs de todos os templates antes de continuar.

### 2. Leitura do arquivo de triagem

Localize o arquivo gerado pela `brag-triage` na pasta `triagens/` (no root do projeto):

- Padrão: `triagens/QUARTER.md` com `/` substituído por `-` (ex: `triagens/Q1-26.md`)

Se o arquivo não for encontrado, interrompa e informe:

```
Arquivo de triagem não encontrado: triagens/Q1-26.md
Execute primeiro: /brag $QUARTER
```

O arquivo de triagem agora é **agrupado por sprint**:
- Headers `### Sprint X` (H3) delimitam os grupos de sprint
- Cada item elegível usa `#### [N]` (H4) dentro do grupo
- Extraia o nome da sprint de cada grupo e associe aos itens correspondentes

### 3. Seleção dos itens

- Se `--items` foi fornecido, carregue apenas os itens com os números correspondentes da seção **Elegíveis**
- Caso contrário, carregue todos os itens elegíveis
- Itens marcados como **Fora do escopo** nunca são publicados automaticamente
- A sprint de cada item é determinada pelo grupo `### Sprint X` ao qual pertence no arquivo

### 4. Verificação de duplicatas

Antes de criar qualquer página, busque no database do Notion por entradas com o mesmo
título (`Contribuição`) e mesmo `Período`:

```
Notion search: query = "TÍTULO DA CONTRIBUIÇÃO" dentro do data source 328327a3-a4dc-8136-aa71-000be17f70bf
```

Se já existir uma entrada com título idêntico no mesmo quarter:

- Em `--dry-run`: sinalize como `já existe`
- Em execução normal: pergunte ao usuário se deve sobrescrever ou pular

### 5. Publicação no Notion

Para cada item a publicar:

**4a. Determine o template** com base na categoria de maior peso (ver tabela acima).

**4b. Determine o conteúdo** mapeando os campos do arquivo de triagem para o template:

_Para Contribuições de Impacto:_

- `Contexto` ← campo "Contexto" da triagem
- `O que fiz` ← campo "O que fiz" da triagem
- `Impacto` ← campo "Impacto" da triagem
- `Relação com metas` ← inferir a partir do campo "Impacto" + tipo da entrega
  (ex: entregas de bugfix sustentam confiabilidade; features sustentam crescimento/produto)

_Para demais categorias:_

- Use o texto do campo correspondente da triagem de forma direta e natural
- Se houver "Sinais de colaboração", inclua em Colaboração e influência

**4c. Crie a página** no data source com:

```
parent: data_source_id = 328327a3-a4dc-8136-aa71-000be17f70bf
properties:
  Contribuição: [título da entrega]
  Período: [$QUARTER]
  Escopo: [todas as categorias identificadas na triagem]
  Sprint: [nome da sprint extraído do grupo do arquivo de triagem]
template_id: [template da categoria de maior peso]
```

> A propriedade `Sprint` é preenchida com o nome da sprint do grupo ao qual o item pertence
> no arquivo de triagem (ex: `Sprint 5`). Se a propriedade não existir no database do Notion,
> ignore-a silenciosamente e prossiga sem ela.

> Não inclua `content` junto com `template_id` — o template já fornece a estrutura.
> Após a criação, atualize o conteúdo da página substituindo os placeholders do template
> pelos dados reais da triagem usando `update_content`.

**4d. Atualize o conteúdo** da página recém-criada com os dados reais:

- Use `update_content` com search-and-replace nos placeholders do template
- Mantenha o callout informativo intacto (não substitua nem remova)

### 6. Relatório final

Ao concluir, exiba no terminal:

```
═══════════════════════════════════════════════════
PUBLICAÇÃO BRAG DOCUMENT — $QUARTER
═══════════════════════════════════════════════════

Sprint 5:
  ✓ [1] TÍTULO DA CONTRIBUIÇÃO
        Categorias: Contribuições de Impacto · Aprendizados aplicados
        Sprint: Sprint 5
        Notion: https://notion.so/...

Sprint 6:
  ✓ [3] TÍTULO DA CONTRIBUIÇÃO
        Categorias: Colaboração e influência
        Sprint: Sprint 6
        Notion: https://notion.so/...

  ⚠ [2] TÍTULO DA CONTRIBUIÇÃO
        Motivo: já existe no Notion para Q1/26 — pulado

═══════════════════════════════════════════════════
Total publicado: X  |  Pulados: X  |  Erros: X
Documento: https://www.notion.so/suaempresa/Documento-de-Impacto-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
═══════════════════════════════════════════════════
```

---

## Regras de comportamento

- **Nunca publique itens marcados como "Fora do escopo"** sem confirmação explícita do usuário
- **Em caso de erro em um item**, registre o erro, pule para o próximo e liste os erros no relatório final — não interrompa toda a publicação
- **Não modifique o arquivo de triagem** — ele é somente leitura para esta skill
- **Preserve o callout informativo** do template ao atualizar o conteúdo — substitua apenas os placeholders
- **`--dry-run` não cria nada** — apenas simula e exibe o que seria publicado, útil antes da primeira execução
- Se `$QUARTER` não corresponder a nenhum valor válido do campo `Período` (`Q1/26`, `Q2/26`), interrompa e avise o usuário antes de tentar publicar
