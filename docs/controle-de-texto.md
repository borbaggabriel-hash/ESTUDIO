# Controle de Texto

## Visao Geral

O "Controle de Texto" define quem pode interagir com o roteiro sincronizado dentro da sala (Room). O objetivo e permitir que participantes naveguem livremente no texto (rolagem independente), enquanto um ou mais controladores possam clicar em falas e editar o texto para todos.

## Objetivos

- Permitir rolagem vertical livre do texto sem ser "puxado" pelo sincronismo.
- Desativar automaticamente o auto-follow durante rolagem manual.
- Restaurar o auto-follow quando o usuario der play ou selecionar uma fala.
- Implementar autorizacao de controle de texto para alunos/dubladores (multi-controller) com validacao no servidor.
- Exibir indicador visual da posicao atual no texto.

## Arquitetura

### Estados Principais (Client)

- `scriptAutoFollow`: controla se o texto acompanha automaticamente a fala atual.
- `textControllerUserIds`: conjunto de userIds autorizados a controlar o texto (recebido via WebSocket).
- `canTextControl`: `true` quando o usuario e privilegiado ou esta autorizado em `textControllerUserIds`.
- `lineEdits`: overrides locais do texto das falas (propagados via WebSocket).

### Estado Principal (Server)

- `textControllerSessions[sessionId]`: conjunto de userIds autorizados (Set) (ou vazio).

O estado do controlador e mantido em memoria e persiste em refresh do navegador enquanto o servidor estiver ativo.

## Eventos WebSocket

O canal WebSocket e `ws(s)://<host>/ws/video-sync?sessionId=...&userId=...&role=...&name=...`.

### Estado e Presenca

- `presence-sync`: lista de participantes conectados.
- `text-control:state`: estado das autorizacoes atuais.

Payload:

```json
{ "type": "text-control:state", "controllerUserIds": ["uuid-1", "uuid-2"] }
```

### Selecao de Autorizados

- `text-control:set-controllers` (somente usuario privilegiado)
- `text-control:grant-controller` (somente usuario privilegiado)
- `text-control:revoke-controller` (somente usuario privilegiado)
- `text-control:clear-controller` (somente usuario privilegiado)

### Edicao de Linha

- `text-control:update-line` (somente controlador ou usuario privilegiado)

Payload:

```json
{ "type": "text-control:update-line", "lineIndex": 12, "text": "Novo texto" }
```

O servidor valida permissao e retransmite para os demais clientes, que aplicam em `lineEdits`.

## Regras de Permissao

### Niveis

- Read-only: pode rolar o roteiro, sem clique e sem edicao.
- Autorizado: pode clicar em falas (seek do video com `lineIndex`) e editar texto.
- Privilegiado: pode autorizar/revogar e tambem pode controlar/editar sem autorizacao previa.

### Roles

- Aluno e Dublador: precisam estar autorizados em `textControllerUserIds` para controlar o texto.
- Demais roles (ex.: diretor, administrador, engenheiro, etc.): podem controlar o texto indefinidamente sem autorizacao.

### Validacao no Servidor

O servidor bloqueia:

- Mudanca de controlador por usuario nao privilegiado.
- Edicao de linha (`text-control:update-line`) por usuario nao controlador/privilegiado.
- `video-seek` com `lineIndex` por usuario nao controlador/privilegiado (evita bypass de clique via console).

### Edge Cases

- Se um autorizado desconectar, o servidor remove apenas aquele userId do conjunto e emite `text-control:state` atualizado.

## UX do Roteiro

- Ao iniciar rolagem manual (wheel/touch/pointer), o modo muda para rolagem livre e o auto-follow e desativado.
- Ao clicar em uma fala, o auto-follow e reativado e o scroll centraliza a fala clicada.
- Ao dar play, o auto-follow e reativado.
- Indicadores:
  - Botao `AUTO/SEGUIR` no topo do roteiro.
  - Banner sticky "Rolagem livre" com acao "Voltar ao atual".
  - Barra vertical indicando a posicao relativa da fala atual.

## Pontos de Integracao (Arquivos)

- Room (App principal):
  - `client/src/studio/pages/room.tsx`
  - `server/video-sync.ts`
- Room (HUBDUB-STUDIO):
  - `HUBDUB-STUDIO/client/src/pages/room.tsx`
  - `HUBDUB-STUDIO/server/video-sync.ts`
- Room (HUB-ALIGN):
  - `HUB-ALIGN/client/src/pages/room.tsx`
  - `HUB-ALIGN/server/video-sync.ts`

## Importacao de JSON e Sincronizacao por Tempo

### Problema

O campo de tempo recebido na importacao pode vir em formatos diferentes (ex.: `HH:MM:SS`, SMPTE `HH:MM:SS:FF`, SMPTE DF `HH:MM:SS;FF`, `MM:SS`, `SS.mmm`). Comparacoes baseadas no texto do timecode podem gerar inconsistencias entre estudios e quebrar a sincronizacao com o video.

### Solucao

- Durante a importacao (colar JSON / upload), cada linha recebe:
  - `tempo`: valor original recebido (string), preservado para auditoria e referencia.
  - `tempoEmSegundos`: valor convertido (number) para segundos absolutos com 3 casas decimais.
- Durante a reproducao na Room, a sincronizacao do teleprompter utiliza exclusivamente `tempoEmSegundos` (e faz fallback de conversao apenas para roteiros antigos que ainda nao possuem o campo).

### Funcao de Conversao

`parseUniversalTimecodeToSeconds(timeString, fps = 24)`:

- Detecta automaticamente os formatos suportados via Regex.
- Converte para segundos (float) com precisao de 3 casas decimais.
- Valida entradas invalidas e sinaliza erro (para bloquear importacao quando houver falha).

### Fluxo (alto nivel)

1. Usuario abre "Colar JSON" ou faz upload do arquivo no gerenciamento de producao.
2. O sistema valida/normaliza as chaves (`personagem`/`fala`/`tempo` e aliases).
3. Para cada linha, converte o `tempo` para `tempoEmSegundos`; se alguma linha falhar, a importacao e interrompida.
4. O roteiro e salvo com `tempo` + `tempoEmSegundos` para garantir retrocompatibilidade e reproducao consistente.
5. Na Room, o teleprompter usa `tempoEmSegundos` para comparar com `currentTime` do video (tolerancia operacional de ate ±0.1s depende apenas do update loop do player, nao do formato do timecode).

## Testes Manuais (Checklist)

### Modal e Lista de Participantes

- Abrir/fechar o modal de Controle de Texto.
- Confirmar que a lista reflete usuarios conectados (presence-sync).
- Selecionar um ou mais autorizados e validar destaque "Autorizado".
- Recarregar a pagina e confirmar persistencia das autorizacoes.

### Permissoes

- Usuario read-only:
  - Rolar o roteiro (mouse/touch) funciona.
  - Clique em fala nao busca o video.
  - Nao aparece botao de editar fala.
- Usuario autorizado:
  - Clique em fala faz seek do video e centraliza o scroll.
  - Edicao de fala aparece e propaga para outros usuarios.
- Tentativa de bypass:
  - Enviar `text-control:update-line` via console como read-only nao altera para outros usuarios.
  - Enviar `video-seek` com `lineIndex` via console como read-only nao afeta outros usuarios.

### Edge Cases

- Controlador desconecta e o sistema remove o controlador atual.
- Mudanca de controlador enquanto outros usuarios editam/rolam.

## Evidencias

Gravacoes de video devem ser capturadas no ambiente real (browser), pois o ambiente de execucao automatizado nao grava tela.

## Troubleshooting

- Lista de usuarios vazia:
  - Verifique se o WebSocket conecta em `/ws/video-sync` e se chega `presence-sync`.
- Nao atualiza controlador:
  - Verifique se o usuario tem role privilegiada (ex.: `studio_admin`, `diretor`, `engenheiro_audio`).
  - Verifique no Network que `text-control:state` chega apos selecao.
- Edicao nao propaga:
  - Verifique se o usuario e controlador.
  - Verifique se chega `text-control:update-line` nos outros clientes via WebSocket.
