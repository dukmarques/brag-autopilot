# Discord como fonte do "Fora do Jira"

Boa parte do trabalho de direcionamento técnico (suporte a agências, diagnóstico de incidentes com parceiros,
orientação em comunidade) acontece no Discord e nunca vira card no Jira. Este guia mostra como exportar essas
conversas para que a triagem possa usá-las como evidência na seção `### Fora do Jira`.

> Dúvidas ou problemas com o caminho abaixo: fale com **Henrique Rocha** ([@henriqueroch4](https://github.com/henriqueroch4)),
> que montou e testou esse fluxo.

---

## Visão geral

```
Bot do Discord (só leitura)
   │
   ├── scripts/discord-export.mjs --category "Agências" --start ... --end ...
   │     └── discord-export/<canal>.json + <canal>.txt
   │
   └── Claude Code lê os .txt, filtra suas mensagens e escreve itens em "### Fora do Jira"
         └── /brag-publish Q3/26 --items N
```

O export é feito por um script, e não pelo plugin `discord` do Claude Code, por dois motivos:

- A ferramenta de leitura do plugin (`fetch_messages`) traz só as **últimas 100 mensagens** de cada canal e não
  pagina para trás. Um quarter de conversa normalmente não cabe nisso.
- O Discord não libera a API de busca para bots, então a única forma de cobrir um período é percorrer o histórico.

O plugin continua útil para conversar com o Claude pelo Discord (veja [Plugin do Claude Code](#opcional-plugin-do-claude-code)).

---

## 1. Criar o bot

1. Acesse o [Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Em **Bot**, clique em **Reset Token** e copie o token. Ele aparece uma única vez.
3. Ainda em **Bot**, em **Privileged Gateway Intents**, ative **Message Content Intent** e clique em
   **Save Changes** (a barra verde no rodapé). Sem esse intent, as mensagens chegam sem texto.

Salve o token no mesmo arquivo que o plugin usa, com permissão restrita:

```bash
mkdir -p ~/.claude/channels/discord
printf 'DISCORD_BOT_TOKEN=%s\n' 'SEU_TOKEN' > ~/.claude/channels/discord/.env
chmod 600 ~/.claude/channels/discord/.env
```

> Não cole o token no chat do Claude Code: o histórico da sessão fica salvo em disco. Se isso acontecer,
> gere um novo token em **Reset Token**.

## 2. Colocar o bot no servidor

1. Em **OAuth2 → URL Generator**, marque o scope `bot` e as permissões **View Channels** e **Read Message History**.
2. Abra a URL gerada e escolha o servidor. É preciso ter **Gerenciar servidor** nele (ou pedir a quem administra).

## 3. Liberar os canais privados

Canais privados não herdam o acesso do servidor. Na categoria que você quer exportar (ex: **AGÊNCIAS**):

1. Botão direito → **Editar categoria → Permissões**.
2. **+** → adicione o bot → ✅ **Ver canais** e ✅ **Ler histórico de mensagens**.
3. Se algum canal tiver permissões próprias, repita nele ou use **Sincronizar com a categoria**.

## 4. Exportar

Requer [Bun](https://bun.sh) ou Node 18+. O script não tem dependências.

```bash
bun scripts/discord-export.mjs --category "Agências" --start 2026-07-01 --end 2026-09-30
```

| Opção        | Descrição                                                        |
| ------------ | ---------------------------------------------------------------- |
| `--category` | Nome da categoria de canais (sem diferenciar acento ou maiúscula) |
| `--start`    | Início do período (`AAAA-MM-DD`)                                 |
| `--end`      | Fim do período (`AAAA-MM-DD`, inclusivo)                         |
| `--out`      | Pasta de saída (padrão: `discord-export/`, ignorada pelo git)    |
| `--guild`    | Nome ou ID do servidor, se o bot estiver em mais de um           |

Saída esperada:

```
[Comunidade Dev] AGÊNCIAS
  #agencia-a: 48 mensagens
  #agencia-b: 418 mensagens, 1 sem texto
  #agencia-c: 0 mensagens (403 Missing Access)
```

Cada canal gera um `.json` (dados completos) e um `.txt` (transcrição compacta, uma mensagem por linha, com threads).

## 5. Levar para a triagem

Com o export feito, peça ao Claude Code algo como:

> Lê os arquivos em `discord-export/` e registra em `### Fora do Jira` do `triagens/Q3-26.md` as conversas
> de direcionamento que fazem sentido para o brag, agrupadas por tema ou por agência.

Depois de revisar o arquivo, publique só esses itens:

```bash
/brag-publish Q3/26 --items 10,11
```

Exemplo de resultado:

```
Fora do Jira:
  ✓ [10] Suporte técnico contínuo a uma agência parceira em 8 lojas
        Categorias: Colaboração e influência · Mentoria e desenvolvimento de pessoas · Feedbacks recebidos
        Dimensões: Sistema · Pessoas

  ✓ [11] Direcionamento técnico a uma agência na implementação de uma loja
        Categorias: Colaboração e influência
        Dimensões: Sistema · Tecnologia
```

> Os arquivos exportados têm mensagens de outras pessoas. Não versione a pasta de saída nem compartilhe os arquivos.

---

## Problemas comuns

| Sintoma                                          | Causa e solução                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `403 Missing Access` em um canal                 | Canal privado sem permissão para o bot. Refaça o [passo 3](#3-liberar-os-canais-privados) nesse canal. |
| Mensagens contadas como "sem texto"              | **Message Content Intent** desligado ou não salvo. Ative, clique em **Save Changes** e recarregue a página para conferir. |
| `threads arquivadas: 403 Missing Access`         | Falta **Ler histórico de mensagens** no canal pai, ou a thread é privada.                               |
| Nenhuma categoria listada                        | O nome em `--category` não bate, ou o bot não está no servidor. Confira com `--guild`.                   |
| `DISCORD_BOT_TOKEN não encontrado`               | Salve o token como no [passo 1](#1-criar-o-bot) ou exporte a variável no shell.                          |

---

## Opcional: plugin do Claude Code

O plugin oficial `discord` permite falar com o Claude por DM ou em canais liberados. Ele não substitui o export.

1. `/plugin` → Discover → **discord** → instalar. Depois, `/discord:configure <token>`.
2. O servidor do plugin roda com **Bun**. Se o `/mcp` mostrar `Executable not found in $PATH: bun`, instale
   (`curl -fsSL https://bun.sh/install | bash`) e **reinicie o Claude Code num terminal novo**. O `/reload-plugins`
   não recarrega o PATH.
3. No `/mcp`, o servidor aparece como `plugin:discord:discord`, e não como `discord`.
4. Mande uma DM para o bot (é preciso estar num servidor em comum com ele), aprove o código com
   `/discord:access pair <código>` e feche o acesso com `/discord:access policy allowlist`.

> Se a sua organização desativar canais nas configurações gerenciadas do Claude Code, o log do MCP mostra
> `channels not enabled by org policy`. Nesse caso, as mensagens enviadas ao bot não chegam à sessão, mas o
> export deste guia funciona normalmente, porque não depende do plugin.
