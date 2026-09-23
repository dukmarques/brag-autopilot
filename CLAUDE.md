# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com este repositório.

## O que é este projeto

Automação para gerar o **Documento de Impacto** (Brag Document) usando skills do Claude Code + MCPs. Coleta cards do Jira e PRs do GitHub, classifica entregas por impacto e publica em um database do Notion. Toda documentação e saída são em **português brasileiro**.

Não há codebase tradicional aqui — sem build, lint ou testes. O projeto é composto inteiramente por commands e skills do Claude Code (arquivos markdown de prompt).

## Arquitetura

O fluxo é um pipeline de três etapas orquestrado por um único command:

```
/brag Q1/26 [--sprint "Sprint 5"] [--publish] [--items 1,3,5] [--dry-run]
  │
  ├── skill brag-triage
  │     Usa: MCP Jira (busca de cards) + GitHub CLI (gh pr list/view/diff)
  │     Pergunta: quarter inteiro ou sprint específica (se --sprint não foi passado)
  │     Saída: arquivo triagens/{QUARTER}.md agrupado por sprint (ex: triagens/Q1-26.md)
  │
  ├── Pausa para revisão humana (pulada com --publish)
  │
  └── skill brag-publish
        Usa: MCP Notion (fetch do database, criação de páginas, atualização de conteúdo)
        Entrada: arquivo de triagem .md + estrutura do database no Notion
        Preenche propriedade Sprint em cada página do database
```

### Arquivos principais

- `.claude/commands/brag.md` — Command orquestrador. Lê o `.brag-config`, resolve datas do quarter, invoca as skills em sequência e gerencia a pausa de revisão entre triagem e publicação.
- `.claude/skills/brag-triage/SKILL.md` — Skill de triagem. Pergunta ao usuário se quer quarter inteiro ou sprint específica, consulta cards no Jira (por datas ou por sprint), cruza com PRs no GitHub, analisa impacto/contexto/colaboração, classifica elegibilidade e gera um arquivo markdown agrupado por sprint.
- `.claude/skills/brag-publish/SKILL.md` — Skill de publicação. Faz fetch da estrutura do database no Notion (propriedades, templates, Data Source ID) a partir da `NOTION_URL`, lê o arquivo de triagem (agrupado por sprint), verifica duplicatas, cria páginas usando o template correto por categoria, preenche a propriedade Sprint e atualiza o conteúdo substituindo os placeholders do template.

### Configuração

`.brag-config` (formato key=value, parseado pelo command):
- `NOTION_URL` — URL da página do Documento de Impacto no Notion
- `JIRA_USER` — e-mail/usuário no Jira para consulta de cards atribuídos
- `REPOS` — todos os repositórios GitHub, separados por vírgula (ex: `REPOS=org/repo1,org/repo2`). Não há separação por time: o Jira é consultado por todos os cards atribuídos ao `JIRA_USER`, e os PRs são buscados pela chave do card em todos os repositórios
- `QUARTER_{Q}_{YY}` — override opcional de datas de quarter customizadas

### Dependências externas

As três precisam estar conectadas antes de executar:
- **MCP Atlassian** — busca e leitura de cards no Jira
- **MCP Notion** — descoberta do database, criação de páginas, atualização de conteúdo
- **GitHub CLI (`gh`)** — busca, visualização e diff de PRs (não é MCP, roda via shell)

## Categorias do Brag Document

Filtro de elegibilidade: *"Isso gerou impacto além da minha tarefa individual?"*

Cinco categorias no campo `Escopo` do Notion: Contribuições de Impacto, Colaboração e influência, Aprendizados aplicados, Feedbacks recebidos, Mentoria e desenvolvimento de pessoas. Uma entrega pode pertencer a múltiplas categorias.

## Convenção do arquivo de triagem

Arquivos de saída ficam na pasta `triagens/` (no root) e seguem o padrão `{QUARTER}.md` com `/` substituído por `-` (ex: `triagens/Q1-26.md`). São gerados pela `brag-triage` e tratados como **somente leitura** pela `brag-publish`. O usuário os edita entre as duas etapas.

O arquivo é **agrupado por sprint**: seção "Elegíveis" usa `### Sprint X` (H3) como delimitador de grupo e `#### [N]` (H4) para cada item. A numeração é sequencial global.
