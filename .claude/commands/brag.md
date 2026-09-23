# Command: /brag

Orquestra o fluxo completo de geração do Brag Document:
triagem de entregas via Jira + GitHub → revisão humana → publicação no Notion.

---

## Parâmetros

```
/brag $QUARTER [--sprint "Sprint 5"] [--publish] [--items 1,3,5] [--dry-run]
```

| Parâmetro   | Obrigatório | Descrição                                                        |
| ----------- | ----------- | ---------------------------------------------------------------- |
| `$QUARTER`  | sim         | Quarter de referência (ex: Q1/26)                                |
| `--sprint`  | não         | Sprint específica dentro do quarter (ex: `--sprint "Sprint 5"`)  |
| `--publish` | não         | Avança automaticamente para publicação após a triagem            |
| `--items`   | não         | Publica apenas itens específicos (ex: `--items 1,3,5`)           |
| `--dry-run` | não         | Simula triage + publicação sem criar nada no Notion              |

---

## Configuração: arquivo .brag-config

Antes de executar, leia o arquivo `.brag-config` na pasta atual.
Se o arquivo não existir, interrompa e exiba:

```
Arquivo .brag-config não encontrado na pasta atual.

Crie o arquivo com o seguinte conteúdo e rode novamente:

  NOTION_URL=https://www.notion.so/suaempresa/Documento-de-Impacto-xxx
  JIRA_USER=seu.email@empresa.com
  REPOS=empresa/admin-web,empresa/admin-api,empresa/app-mobile

Dica: você pode ter um .brag-config por projeto ou um único em ~/.brag-config.
```

Se o arquivo existir, carregue as seguintes chaves:

- `NOTION_URL` — link do Documento de Impacto do usuário no Notion
- `CAREER_URL` _(opcional)_ — link do documento de Gestão de Carreira no Notion
  - Se ausente, o fluxo segue normalmente, sem relacionar as entregas ao ciclo de carreira
- `JIRA_USER` — usuário ou e-mail no Jira
- `REPOS` — todos os repositórios GitHub, separados por vírgula
  - Se a chave não existir, interrompa e solicite ao usuário

---

## Mapeamento de quarters para datas

Converta `$QUARTER` automaticamente para `$PERIOD_START` e `$PERIOD_END`:

| Quarter | Início     | Fim        |
| ------- | ---------- | ---------- |
| Q1/26   | 2026-01-01 | 2026-03-31 |
| Q2/26   | 2026-04-01 | 2026-06-30 |
| Q3/26   | 2026-07-01 | 2026-09-30 |
| Q4/26   | 2026-10-01 | 2026-12-31 |
| Q1/27   | 2027-01-01 | 2027-03-31 |

> Se o quarter informado não estiver na tabela, informe o usuário e solicite as datas manualmente.

---

## Fluxo de execução

### Etapa 1 — Triagem

Invoque a skill `brag-triage` com os parâmetros resolvidos:

```
skill: brag-triage
  QUARTER:        $QUARTER
  PERIOD_START:   $PERIOD_START
  PERIOD_END:     $PERIOD_END
  REPOS:          $REPOS
  JIRA_USER:      $JIRA_USER
  CAREER_URL:     $CAREER_URL  (se definido no .brag-config)
  SPRINT:         $SPRINT  (se --sprint foi passado; caso contrário, a skill pergunta ao usuário)
```

Aguarde a conclusão. A skill criará o arquivo `triagens/{QUARTER}.md`
(com `/` substituído por `-`), dentro da pasta `triagens/` no root do projeto.

Se a skill falhar ou não encontrar nenhum card, interrompa e informe o usuário.

---

### Etapa 2 — Pausa para revisão

Após a triagem, exiba a seguinte mensagem e **aguarde input do usuário**:

```
════════════════════════════════════════════════════
TRIAGEM CONCLUÍDA — $QUARTER
════════════════════════════════════════════════════

Arquivo gerado: triagens/{QUARTER}.md

  X entregas elegíveis para o brag document
  X itens fora do escopo
  X cards sem PR vinculado

Ciclo de carreira: Ciclo AAAA.N (L3 → L4)   ← omitir se não houver CAREER_URL
  Focos com evidência: X de Y
  Focos sem evidência de peso alto: P1, T2

Revise o arquivo antes de continuar.
Edite livremente: ajuste textos, remova itens, mova entre seções.
Registre em "### Fora do Jira" o que não aparece em cards (mentorias, tech talks, reuniões com Produto).

Quando estiver pronto, escolha:
  [1] Publicar todos os itens elegíveis no Notion
  [2] Publicar apenas itens específicos (informe os números)
  [3] Encerrar — publicarei manualmente depois com /brag-publish

════════════════════════════════════════════════════
```

> Se `--publish` foi passado, pule a pausa e avance direto para a Etapa 3
> com todos os itens elegíveis, sem aguardar input.

---

### Etapa 3 — Publicação

Com base na escolha do usuário (ou no flag `--publish`/`--items`):

Invoque a skill `brag-publish` com os parâmetros:

```
skill: brag-publish
  NOTION_URL:   $NOTION_URL  (lido do .brag-config)
  QUARTER:      $QUARTER
  SPRINT:       $SPRINT  (se aplicável)
  --items:      [lista informada, se aplicável]
  --dry-run:    [repassar se foi passado no command]
```

Aguarde a conclusão e exiba o relatório final da skill.

---

## Comportamento em caso de erros

- **`.brag-config` ausente** → interrompa com instruções de criação (ver acima)
- **`REPOS` ausente** → interrompa e solicite o repositório antes de continuar
- **`NOTION_URL` ausente** → interrompa e solicite o link do Documento de Impacto
- **Triagem sem resultados** → informe e encerre sem avançar para publicação
- **Falha parcial na publicação** → exiba o relatório com os erros e os itens publicados com sucesso; não re-execute automaticamente

---

## Exemplos de uso

```bash
# Triagem + pausa para revisão + publicação manual depois
/brag Q1/26

# Filtrar por sprint específica
/brag Q1/26 --sprint "Sprint 5"

# Sprint específica + publicação automática
/brag Q1/26 --sprint "Sprint 5" --publish

# Triagem + publicação automática de tudo
/brag Q1/26 --publish

# Triagem + publicação de itens específicos
/brag Q1/26 --publish --items 1,3,5

# Simular tudo sem criar nada
/brag Q1/26 --dry-run

# Quarter anterior
/brag Q4/25 --publish
```
