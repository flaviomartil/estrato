# Arquitetura do CLI

O caminho principal é `JSON → validação → layout → SVG → documento HTML → gravação transacional`. A análise de negócio fica com o autor ou agente que usa a skill; o runtime não chama um modelo.

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `bin/estrato.mjs` | Argumentos, comandos, códigos de saída e recibos de terminal |
| `src/io.mjs` | Leitura limitada, caminhos seguros, hashes e transação de diretório |
| `src/validate.mjs` | Contrato, identificadores, referências, linhas e versão das evidências |
| `src/layout.mjs` | Camadas, componentes fortemente conectados, rotas ortogonais e sequência |
| `src/svg.mjs` | Cartões, conectores, limites, rótulos e SVG autossuficiente |
| `src/themes.mjs` | Tokens de papel, pedra e carvão |
| `src/markdown.mjs` | Subconjunto de Markdown escapado e guias exportáveis |
| `src/render.mjs` | Documento completo, conteúdo estruturado, impressão e política de conteúdo |
| `src/viewer/` | Interface offline e interações no navegador |
| `src/build.mjs` | Coordenação da compilação, bundle e checagem de integridade |
| `src/scan.mjs` | Inventário estrutural local, sem execução da aplicação |
| `src/import.mjs` | Adaptador explícito para arquitetura v1 da ferramenta de referência |
| `src/diff.mjs` | Diferença entre fontes estruturadas, não entre ambientes vivos |
| `src/server.mjs` | Prévia loopback, atualização do JSON e última versão válida |
| `skills/estrato/` | Processo de análise de código e autoria das evidências |

## Contratos relevantes

O schema de entrada tem versão explícita. O núcleo recebe objetos e retorna recibos ou erro com diagnósticos. A CLI converte falhas em código de saída 2 e pode produzir JSON legível por agentes.

A fonte de entrada nunca é substituída pelo build. A saída deve ser uma pasta dedicada. O novo bundle é preparado em um diretório temporário e só substitui uma saída anterior gerenciada depois da compilação. Backups intermediários permitem restaurar a versão anterior se a troca falhar.

As referências são caminhos relativos à raiz escolhida por `--repo`. A resolução por caminho real impede escape por symlink. O SHA-256 pertence ao arquivo inteiro; o intervalo identifica as linhas documentadas, sem certificar a veracidade da interpretação.

No navegador, a representação autoral é uma fotografia do documento. Busca, alcance e caminhos percorrem apenas essas relações. A interface não observa tráfego, não faz análise de impacto em produção e não executa o repositório.

## Extensões seguras

Um novo importador deve adaptar sua entrada ao contrato interno e avisar sobre perda de campos. Um novo tipo de layout deve manter identificadores, rotas e recibos, com casos negativos de teste. Temas não devem introduzir recursos externos. Uma futura integração de modelo deve ser opt-in, fora do renderer, com controle explícito dos dados enviados.
