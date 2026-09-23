# brag-documents

Automação do fluxo de geração do **Documento de Impacto** (_Brag Document_) usando Claude Code com MCP do Jira e GitHub CLI.

A ideia central é simples: ao fim de cada sprint ou quarter, você roda um command que vasculha seus cards no Jira e PRs no GitHub, classifica as entregas com base no impacto real e publica automaticamente no seu Documento de Impacto no Notion — sem precisar lembrar o que fez meses atrás.

> **Pergunta-filtro do documento:** _"Isso gerou impacto além da minha tarefa individual?"_

---

## Como funciona

O fluxo é composto por um command orquestrador e duas skills especializadas:

```
/brag Q1/26
     │
     ├── skill: brag-triage
     │     ├── Busca cards no Jira (assignee + quarter)
     │     ├── Cruza com PRs no GitHub (link no card ou título do PR)
     │     ├── Analisa contexto, impacto, complexidade e aprendizados
     │     ├── Classifica por categoria do Documento de Impacto
     │     └── Gera arquivo triagens/Q1-26.md para revisão
     │
     ├── [pausa para você revisar e editar o arquivo]
     │
     └── skill: brag-publish
           ├── Lê seu Documento de Impacto no Notion
           ├── Verifica duplicatas
           ├── Cria páginas com o template correto por categoria
           └── Preenche os campos narrativos com os dados da triagem
```

### Categorias do Documento de Impacto

| Categoria                             | Quando usar                                                 |
| ------------------------------------- | ----------------------------------------------------------- |
| Contribuições de Impacto              | Entregas técnicas com impacto claro no produto ou time      |
| Colaboração e influência              | Momentos em que você influenciou além do seu escopo direto  |
| Aprendizados aplicados                | Conhecimentos novos colocados em prática de forma relevante |
| Feedbacks recebidos                   | Feedbacks positivos de clientes, stakeholders ou liderança  |
| Mentoria e desenvolvimento de pessoas | Apoio a colegas, onboarding, disseminação de conhecimento   |

---

## Pré-requisitos

- [Claude Code](https://claude.ai/code) instalado
- Plugin **GitHub** instalado no Claude Code (`/plugin` → Discover → github)
- MCP **Atlassian** conectado (Jira)
- MCP **Notion** conectado
- **GitHub CLI** (`gh`) instalado e autenticado

---

## Instalação

### 1. Clone ou crie a pasta do projeto

```bash
mkdir ~/Documents/brag-documents
cd ~/Documents/brag-documents
```

### 2. Configure o `.brag-config`

Copie o template e preencha com seus dados:

```bash
cp .brag-config.example .brag-config
```

```bash
# .brag-config

NOTION_URL=https://www.notion.so/suaempresa/Documento-de-Impacto-xxx
JIRA_USER=seu.email@empresa.com
REPOS=suaempresa/admin-web,suaempresa/admin-api,suaempresa/app-mobile
```

> O `.brag-config` é pessoal — não versione se os repositórios forem privados.

---

## Uso

### Fluxo completo (recomendado)

```bash
# Abre o Claude Code na pasta do projeto
claude

# Roda a triagem + pausa para revisão + publicação manual
/brag Q1/26
```

Após a triagem, o Claude gera o arquivo `triagens/Q1-26.md` e aguarda sua revisão antes de publicar.

### Flags disponíveis

```bash
# Publicação automática após triagem, sem pausa
/brag Q1/26 --publish

# Publicar apenas itens específicos (pelos números da triagem)
/brag Q1/26 --publish --items 1,3,5

# Simular tudo sem criar nada no Notion
/brag Q1/26 --dry-run
```

### Publicação manual (caso queira separar as etapas)

```bash
# Só triagem
/brag-triage Q1/26 2026-01-01 2026-03-31 suaempresa/admin-web,suaempresa/app-mobile

# Só publicação (após revisar o arquivo gerado)
/brag-publish https://notion.so/... Q1/26
/brag-publish https://notion.so/... Q1/26 --items 2,4
/brag-publish https://notion.so/... Q1/26 --dry-run
```

---

## Arquivo de triagem

A triagem gera um arquivo `{QUARTER}.md` na pasta `triagens/` do projeto. Exemplo: `triagens/Q1-26.md`.

Você pode editar livremente antes de publicar:

- Ajustar textos gerados pela análise
- Remover entregas que não fazem sentido no documento
- Mover itens de "Fora do escopo" para "Elegíveis" se discordar da classificação
- Alterar categorias ou complexidade

O arquivo é somente leitura para a skill `brag-publish` — suas edições são preservadas.

---

## Mapeamento de quarters

| Quarter | Período                 |
| ------- | ----------------------- |
| Q1/26   | 01/01/2026 — 31/03/2026 |
| Q2/26   | 01/04/2026 — 30/06/2026 |
| Q3/26   | 01/07/2026 — 30/09/2026 |
| Q4/26   | 01/10/2026 — 31/12/2026 |

Para quarters com datas customizadas (calendário fiscal diferente), adicione ao `.brag-config`:

```bash
QUARTER_Q1_26=2026-02-01,2026-04-30
```

---

## Estrutura de arquivos

```
brag-documents/
├── .brag-config               # Suas configurações pessoais (não versionar)
├── .brag-config.example       # Template de configuração
├── README.md                  # Este arquivo
├── triagens/                  # Arquivos gerados pela triagem
│   ├── Q1-26.md               # (Q1/26)
│   └── Q2-26.md               # (Q2/26)
└── .claude/
    ├── commands/
    │   └── brag.md            # Command orquestrador
    └── skills/
        ├── brag-triage/
        │   └── SKILL.md       # Skill de triagem (Jira + GitHub)
        └── brag-publish/
            └── SKILL.md       # Skill de publicação (Notion)
```

---

## Inspiração

Baseado no conceito de _Brag Document_ descrito por [Ingrid Machado](https://ingridmachado.net/articles/2023-03/brag-document) e adaptado para automação com Claude Code + MCPs de Jira, GitHub e Notion.
