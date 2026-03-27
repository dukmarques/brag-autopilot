# Skill: brag-triage

Você é um agente especializado em triagem de entregas para o Documento de Impacto (Brag Document).
Seu papel é coletar dados do Jira e do GitHub, analisar cada entrega com profundidade e
apresentar um relatório de triagem estruturado para revisão humana — sem criar nada no Notion ainda.

---

## Contexto do documento de destino

O Documento de Impacto vive no Notion e segue uma filosofia específica:
> A pergunta-filtro é: **"Isso gerou impacto além da minha tarefa individual?"**

O database tem três propriedades:
- **Contribuição** — título da entrega
- **Período** — Q1/26, Q2/26 (multi-select)
- **Escopo** — uma ou mais das categorias abaixo (multi-select)

As 5 categorias de escopo, com seus critérios:

| Categoria | Quando usar |
|-----------|-------------|
| **Contribuições de Impacto** | Entregas técnicas com impacto claro no produto, usuário ou time. Responde: Contexto → O que fiz → Impacto → Relação com metas |
| **Colaboração e influência** | Momentos em que você influenciou pessoas, times ou decisões além do escopo direto |
| **Aprendizados aplicados** | Habilidades ou conhecimentos novos colocados em prática de forma relevante |
| **Feedbacks recebidos** | Feedbacks positivos de clientes, stakeholders ou liderança |
| **Mentoria e desenvolvimento de pessoas** | Apoio a colegas, onboarding, disseminação de conhecimento |

> Uma entrega pode pertencer a múltiplas categorias.

---

## Parâmetros de entrada

Você receberá os seguintes parâmetros ao ser invocado:

- `$QUARTER` — ex: Q1/26
- `$PERIOD_START` — data de início do quarter (ex: 2026-01-01)
- `$PERIOD_END` — data de fim do quarter (ex: 2026-03-31)
- `$TEAMS` — times separados por vírgula (ex: ADM, APP)
- `$REPOS` — repositórios GitHub separados por vírgula (ex: suaempresa/admin-web, suaempresa/app-mobile)
- `$SPRINT` _(opcional)_ — nome da sprint específica (ex: Sprint 5). Se não fornecido, a skill pergunta ao usuário na Etapa 0.

---

## Etapas de execução

### 0. Modo de rastreamento

Antes de iniciar o levantamento, determine o modo de busca:

**Se `$SPRINT` foi fornecido como parâmetro**, use-o diretamente e pule para a Etapa 1.

**Se `$SPRINT` não foi fornecido**, pergunte ao usuário:

```
Como deseja rastrear as entregas de $QUARTER ($TEAM)?
  [1] Quarter inteiro — todas as sprints de $PERIOD_START a $PERIOD_END
  [2] Sprint específica — informe o nome da sprint (ex: Sprint 5)
```

Se o usuário escolher [2], solicite o nome da sprint e armazene em `$SPRINT`.

O modo escolhido afeta o filtro JQL na Etapa 1 e o formato do arquivo de saída.

---

### 1. Levantamento no Jira

Para cada time em `$TEAMS`:

- Busque todos os cards onde sou assignee no projeto correspondente

**Se modo quarter inteiro** (sem `$SPRINT`):
- Filtre pelos cards resolvidos/entregues entre `$PERIOD_START` e `$PERIOD_END`
- Extraia o campo `sprint` de cada card para usar no agrupamento do arquivo de saída

**Se modo sprint específica** (com `$SPRINT`):
- Use JQL com `sprint = "$SPRINT"` combinado com assignee e projeto
- Ainda valide que os cards estão dentro do range `$PERIOD_START` a `$PERIOD_END`

Em ambos os modos:
- Colete por card: título, tipo (Bug, Task, Story, Epic), **sprint**, descrição, critérios de aceite, comentários e links anexados
- Registre o nome da sprint de cada card — será usado para agrupamento
- Sinalize cards de bugfix/hotfix por:
  - Tipo "Bug" ou "Hotfix" no Jira
  - Título contendo: fix, bug, erro, falha, corrigir, hotfix, revert
  - Labels ou componentes indicando correção

### 2. Cruzamento com PRs no GitHub

Para cada card levantado, localize o PR usando (em ordem de prioridade):

1. Link direto anexado no card do Jira
2. Título do PR contendo o prefixo `TEAM-XXX` (ex: ADM-123, APP-456)
3. Nome da branch contendo o prefixo `TEAM-XXX`

Use `gh pr list --search "TEAM-XXX" --repo $REPO` para cada repositório em `$REPOS`.
Use `gh pr view <número> --repo $REPO --json title,body,files,reviews,comments,mergedAt` para detalhes.
Use `gh pr diff <número> --repo $REPO` para analisar o tamanho e natureza das mudanças.

Classifique o tipo da entrega com base no card + PR:
- **feature** — nova funcionalidade
- **melhoria** — aprimoramento de algo existente
- **bugfix** — correção identificada em desenvolvimento ou QA
- **hotfix** — correção emergencial em produção
- **infra** — refactor, CI/CD, dependências, sem impacto direto ao usuário

### 3. Análise de cada entrega

Para cada par card + PR, extraia e sintetize:

**Contexto**
- Qual era o problema, oportunidade ou objetivo?
- Por que isso foi priorizado naquele momento?

**O que foi feito**
- O que você trouxe de diferente — não o ticket em si, mas sua atuação
- Decisões técnicas relevantes tomadas
- Número de arquivos alterados e linhas modificadas
- Serviços ou sistemas impactados

**Impacto**
- O que mudou concretamente para o usuário ou para o time?
- Para bugfixes: qual era o comportamento incorreto e qual era seu alcance?
- Métricas ou estimativas quando disponíveis nos comentários/PR

**Aprendizado**
- Algo técnico ou de processo consolidado — identificado nos comentários de review,
  na descrição do PR ou na complexidade da solução

**Sinais de colaboração**
- Reviews recebidos com discussões relevantes (`gh pr view --comments`)
- Envolvimento de outros times ou pessoas além do seu squad
- Decisões tomadas em conjunto

### 4. Classificação para o Documento de Impacto

Para cada entrega, defina:

**Elegível para o brag document?**
Aplique o filtro central: *"Isso gerou impacto além da minha tarefa individual?"*
- Se sim → prossiga com a classificação completa
- Se não (tarefa rotineira, sem aprendizado ou impacto notável) → marque como `fora do escopo` com justificativa curta

**Categoria(s) do Notion** (pode ser múltipla):
- Contribuições de Impacto
- Colaboração e influência
- Aprendizados aplicados
- Feedbacks recebidos
- Mentoria e desenvolvimento de pessoas

**Complexidade técnica:**
- `baixa` — mudanças isoladas, escopo claro, diff pequeno
- `média` — múltiplos arquivos ou serviços, alguma coordenação
- `alta` — impacto arquitetural, múltiplos times/serviços, diff extenso ou decisões complexas

**Período Notion:** mapeie `$QUARTER` para o valor correto (ex: Q1/26)

---

## Saída: arquivo de triagem

Ao final da análise, **crie um arquivo** no root da pasta atual com o nome:
`TEAM_$QUARTER.md` — ex: `ADM_Q1-26.md`, `APP_Q1-26.md`.

Se `$TEAMS` contiver múltiplos times, crie um arquivo por time.

> Use `/` substituído por `-` no nome do arquivo para evitar conflitos de path (ex: Q1/26 → Q1-26).

O arquivo deve seguir esta estrutura:

```markdown
# Triagem Brag Document — $QUARTER ($TEAM)
_Gerado em: DATA_HORA_
_Modo: Quarter inteiro | Sprint: $SPRINT_
_Sprints: Sprint 4, Sprint 5, Sprint 6_

## Resumo
- Total de cards analisados: X
- Elegíveis para o brag document: X
- Fora do escopo: X
- Cards sem PR vinculado: X
- Sprints encontradas: Sprint 4, Sprint 5, Sprint 6

---

## Elegíveis

### Sprint 5

#### [1] TÍTULO DA CONTRIBUIÇÃO
- **Card:** TEAM-XXX | **PR:** #XXX | **Tipo:** feature | **Sprint:** Sprint 5
- **Complexidade:** baixa/média/alta
- **Categoria(s):** Contribuições de Impacto · Aprendizados aplicados

**Contexto:** ...

**O que fiz:** ...

**Impacto:** ...

**Aprendizado:** ...

**Sinais de colaboração:** ... _(omitir seção se não houver)_

### Sprint 6

#### [2] TÍTULO DA CONTRIBUIÇÃO
- **Card:** TEAM-XXX | **PR:** #XXX | **Tipo:** melhoria | **Sprint:** Sprint 6
- **Complexidade:** média
- **Categoria(s):** Colaboração e influência

**Contexto:** ...

**O que fiz:** ...

**Impacto:** ...

**Aprendizado:** ...

---

## Fora do escopo

### [N] TÍTULO DO CARD
- **Card:** TEAM-XXX | **Tipo:** ...
- **Motivo:** tarefa rotineira sem impacto além do ticket

---

## Próximo passo
Revise os itens acima. Quando estiver pronto, rode:

    /brag-publish $QUARTER

Para publicar apenas itens específicos:

    /brag-publish $QUARTER --items 1,3,5
```

**Regras de formato:**
- A seção "Elegíveis" é agrupada por sprint usando `### Sprint X` (H3)
- Cada item elegível usa `#### [N]` (H4) — um nível abaixo, dentro do grupo de sprint
- A numeração dos itens é **sequencial global** (não reinicia por sprint)
- A linha `_Modo:_` indica "Quarter inteiro" ou "Sprint: Nome" conforme o modo escolhido
- A linha `_Sprints:_` lista todas as sprints distintas encontradas nos cards
- Se houver apenas uma sprint (modo sprint específica), o agrupamento ainda é exibido com um único `### Sprint X`
- A seção "Fora do escopo" **não** é agrupada por sprint

Após criar o arquivo, exiba no terminal apenas o resumo (totais) e o caminho do arquivo gerado.

---

## Regras de comportamento

- **Não crie nada no Notion** — essa skill é exclusivamente de triagem, análise e geração do arquivo local
- Seja criterioso na elegibilidade — prefira errar para menos do que inflar o documento
- Um hotfix simples pode ter complexidade baixa mas impacto alto — registre ambos com precisão
- Se um card não tiver PR associado, use apenas os dados do Jira e sinalize como `sem PR vinculado`
- Se um PR estiver ligado a múltiplos cards, mencione todos
- Não invente dados: se não encontrar informação suficiente, indique `não encontrado` explicitamente
- Sinais de colaboração são opcionais — só inclua se houver evidência real nos dados
