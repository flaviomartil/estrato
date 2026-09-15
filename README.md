# Estrato

Documentação de arquitetura em um HTML autossuficiente. Mapas interativos, jornadas, guia técnico e evidências de código, com identidade visual sóbria e **sem marca do gerador no documento final**.

![Prévia real da documentação do exemplo Acervo](docs/preview.png)

## Começar

Requisito: **Node.js 20 ou superior**. Não requer dependências de runtime, Graphviz, serviço remoto, chave de API ou build de frontend.

A partir deste repositório extraído:

```bash
npm install -g .
estrato doctor
estrato build examples/plataforma.json --out demo
```

Abra `demo/index.html` no navegador. O exemplo Acervo é fictício e contém cinco tipos de mapa. Para rodar sem instalação global:

```bash
node bin/estrato.mjs build examples/plataforma.json --out demo --force
```

O pacote também pode ser instalado pelo arquivo `.tgz` da entrega:

```bash
npm install -g ./flaviomartil-estrato-0.1.0.tgz
```

**O pacote não foi publicado no npm.** Não use `npx @flaviomartil/estrato` presumindo que ele exista no registro.

## Documentar um repositório real

```bash
# 1. Inventariar sem executar o projeto
estrato scan /caminho/do/projeto --out .estrato

# 2. Instalar a skill no workspace do agente
estrato skill install --agent codex --project /caminho/do/projeto

# 3. Pedir ao agente a leitura e o preenchimento de .estrato/project.json
# Veja o prompt logo abaixo.

# 4. Conferir estrutura, geometria, linhas e hashes
estrato validate .estrato/project.json --repo /caminho/do/projeto --json

# 5. Gerar a documentação
estrato build .estrato/project.json --repo /caminho/do/projeto --out docs/architecture

# 6. Conferir a integridade do pacote gerado
estrato check docs/architecture --json
```

Peça ao agente:

> Use a skill Estrato para entender este repositório. Leia o inventário em `.estrato`, siga as jornadas no código e complete `project.json` com mapas, guia técnico e evidências. Separe implementação observada, inferências e propostas. Gere a documentação, inspecione cada vista no navegador e não inclua marca do gerador no resultado. Não execute serviços, migrações ou comandos de produção.

A etapa 3 é importante: **o scanner sozinho não explica as regras de negócio**. Ele reconhece arquivos, manifests, blocos Compose simples e candidatos sintáticos de rotas. A interpretação é feita pelo agente ou por uma pessoa revisora. Dependências instaladas não viram serviços automaticamente. As relações `depends_on` representam ordem de inicialização, não tráfego de rede.

A skill também pode ser instalada com `--agent claude`, `--agent cursor` ou `--agent portable`. Para instalação no diretório pessoal, use `--global` em vez de `--project`. O instalador copia a skill, mas não instala nem autentica agentes de terceiros. O executável `estrato` precisa estar disponível no PATH do agente.

## A documentação entregue

```text
architecture/
├── index.html           # Atlas completo, funciona offline
├── architecture.json    # Fonte editável, sem marca do gerador
├── GUIA.md              # Guia e roteiro dos mapas
├── EVIDENCIAS.md         # Arquivos, linhas, hashes e trechos opcionais
├── LEIA-ME.txt           # Instruções para a pessoa leitora
├── verificacao.json     # Recibo e hashes dos artefatos
└── diagramas/           # SVG de cada vista
```

A interface inclui busca por mapa e componente, leitura guiada, detalhes dos nós, referências, alcance dirigido a montante/jusante, caminho entre dois componentes, zoom, tela cheia, modo tabela e tema alternável. As exportações do navegador incluem SVG, PNG, JSON e Markdown. A impressão reúne mapas, guia, evidências e revisão; salvar como PDF depende da impressão do navegador e não é uma exportação PDF nativa do CLI.

A navegação e os dados ficam no próprio HTML. Não há CDN, Google Fonts, chamadas de IA, analytics, telemetria ou verificação automática de atualização. As conexões externas são bloqueadas por uma política de conteúdo. Links autorais HTTPS podem abrir outra página por decisão da pessoa leitora.

A fonte tipográfica é de sistema. Os temas são **paper**, **limestone** e **graphite**: papel, pedra e carvão, com acentos discretos de oliva e verde.

```bash
estrato build project.json --theme graphite --out docs/architecture --force
```

## Tipos de mapa

| Tipo | Uso |
|---|---|
| `architecture` | Componentes, dependências e limites explícitos |
| `workflow` | Etapas, ramificações e resultados |
| `sequence` | Participantes, linhas de vida e mensagens em ordem |
| `dataflow` | Fontes, transformações e destinos de dados |
| `lifecycle` | Estados, transições e repetição |

Workflow e dataflow usam o motor de grafos comum, não um interpretador BPMN/UML. Lifecycle usa nós arredondados; sequence tem layout próprio de participantes e mensagens. As relações precisam estar na fonte: o visualizador não inventa topologia para completar uma história.

## Comandos

| Comando | Responsabilidade |
|---|---|
| `init [arquivo]` | Cria um projeto mínimo, marcado como rascunho |
| `scan <pasta>` | Cria inventário, roteiro de leitura e rascunho estrutural |
| `validate <arquivo>` | Confere estrutura e layout; com `--repo`, verifica arquivos, linhas e hashes |
| `build <arquivo>` | Gera o atlas completo em uma pasta dedicada |
| `render <arquivo>` | Alias de `build` |
| `check <pasta>` | Confere os hashes dos artefatos contra o recibo |
| `import <arquivo>` | Converte o subconjunto de arquitetura v1 do formato de referência |
| `diff <antes> <depois>` | Compara os documentos por IDs e campos, com recibo JSON |
| `dev <arquivo>` | Prévia local com atualização e preservação da última versão válida |
| `serve <index.html>` | Serve somente o HTML selecionado em loopback |
| `skill print` | Mostra as instruções da skill |
| `skill install` | Instala a skill no destino escolhido |
| `doctor` | Verifica Node e arquivos essenciais do pacote |

Execute `estrato --help` para a sintaxe completa. `--json` retorna recibos estruturados; falhas terminam com código 2. `--strict` trata avisos como falhas. `--force` atualiza somente uma saída gerenciada ou o arquivo explicitamente selecionado; não permite apagar uma pasta arbitrária não vazia.

## Prévia e atualização

```bash
estrato dev project.json --port 4173
estrato diff before.json after.json --out delta.json
```

A prévia escuta em `127.0.0.1`, não na rede local. JSON incompleto ou inválido mantém o último documento válido e mostra o erro. O servidor não expõe o repositório, não oferece uploads e não modifica a aplicação. `Ctrl+C` encerra o processo. Mudanças no JSON disparam a atualização; mudanças apenas nos arquivos usados como evidência exigem nova validação ou novo salvamento do JSON.

O diff compara **documentos**, não execução nem impacto real no software. As diferenças são estruturadas em JSON; não há visualização gráfica before/after nesta versão.

## Fonte editável e evidências

O contrato detalhado está em [project-format.md](skills/estrato/references/project-format.md); o schema está em [project.schema.json](schemas/project.schema.json).

Uma referência contém caminho relativo, intervalo inclusivo de linhas e, opcionalmente, SHA-256 do arquivo completo. `--repo` resolve o caminho real, impede escape por `..` ou symlink, confere o intervalo e detecta arquivo alterado. Sem `--repo`, apenas a estrutura das referências é conferida. Sem hash, a identidade da versão não está fixada.

Trechos de código são opcionais e autorais. O scanner não os inclui automaticamente. O verificador não determina se uma afirmação é semanticamente verdadeira nem se o trecho autoral representa fielmente o arquivo. Revise o conteúdo e os segredos antes de distribuir.

O layout usa camadas determinísticas, condensação de ciclos e rotas ortogonais que evitam os retângulos dos nós. Sobreposições de componentes e rotas por dentro de componentes bloqueiam a geração. Congestionamento de rótulos gera aviso. A qualidade visual continua exigindo inspeção: não se promete ausência de toda ambiguidade de cruzamentos, equivalência a um editor profissional ou ótima disposição global.

## Relação com Archify

O fluxo de trabalho é inspirado no [Archify](https://github.com/tt-a1i/archify), mas **esta é uma implementação independente**, não uma cópia integral nem um fork que incorpora seu runtime. O foco adicional é um documento completo com múltiplos mapas, capítulos, evidências, decisões, identidade editorial própria e ausência de marca no resultado.

```bash
estrato import arquivo.architecture.json --out project.json
estrato validate project.json --json
estrato build project.json --out docs/architecture
```

A importação aceita `diagram_type: architecture`, `schema_version: 1`: componentes, relações, algumas posições, grupos, cartões e referências de origem. Campos não suportados são reportados. Rotas originais, presets, marcas, grade, animações, validação e receipts do upstream não são preservados. Importar outros tipos falha explicitamente; não há conversão silenciosa.

Não estão implementados nesta versão: WebM, share cards, edição WYSIWYG, parser Mermaid, linguagem natural sem agente externo, análise semântica autônoma, upload hospedado e equivalência completa das interações do upstream.

## Desenvolvimento e verificação

```bash
npm run check
npm test
npm run demo
npm pack
```

Os testes de Node não precisam instalar dependências. Cobrem validação, evidências, segurança de caminhos, layout, ciclos, XSS, exportação HTML, integridade do pacote, importação, diff, scanner, CLI e prévia last-good. O roteiro reproduzível de teste do navegador está em `scripts/qa_browser.py` e requer Python + Playwright + Chromium, apenas para desenvolvimento.

O workflow de CI está preparado para Linux, Windows e macOS em Node 20/22. A presença do workflow não significa que ele já tenha rodado no GitHub. Consulte [VALIDACAO.md](docs/VALIDACAO.md) para os testes efetivamente executados na entrega.

## Publicação no GitHub

O publicador desta entrega tem destino fixo: `flaviomartil/estrato`, **privado**. O CLI, a skill, os testes e o exemplo fictício Acervo entram na publicação; arquivos privados do IMP não fazem parte da lista permitida.

Com Node.js 20+, Git e GitHub CLI (`gh`) disponíveis, execute na pasta extraída:

```bash
# Sem rede nem escrita remota: verifica a lista e os hashes
node scripts/publish-github.mjs --dry-run

# Autentique o gh no seu computador, caso ainda não esteja autenticado
# gh auth login --hostname github.com

# Cria o repositório privado e publica o snapshot revisado
node scripts/publish-github.mjs --publish
```

O script confere a conta `flaviomartil`, recusa um repositório existente, copia somente os arquivos do manifesto para uma pasta isolada, roda os testes e verifica a privacidade antes do push. Ao final confere o SHA do commit remoto. Não altera a configuração global do Git e não pede nem grava tokens no código.

Sem `--publish`, nenhuma chamada externa é feita. Com `--publish`, há criação real de repositório e envio de código. Se a criação remota for iniciada e uma etapa posterior falhar, a cópia Git é preservada e o script informa o caminho; ele não apaga o repositório nem força sobrescrita. Os hashes correspondem a este pacote e detectam alterações locais; não são uma assinatura de autenticidade.

A integração do ChatGPT foi conectada e confirmou a conta, mas as ações disponibilizadas nesta conversa são de leitura. **Nenhum repositório foi criado nesta entrega.** O publicador foi validado localmente e com respostas simuladas do GitHub; não houve teste de push real. Conectar o plugin no ChatGPT não autentica automaticamente o `gh` do computador.

Documentação dos comandos utilizados: [gh repo create](https://cli.github.com/manual/gh_repo_create), [gh api](https://cli.github.com/manual/gh_api).

## Licença

MIT. Consulte [LICENSE](LICENSE) e [NOTICE.md](NOTICE.md).
