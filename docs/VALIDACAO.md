# Validação da versão 0.1.0

Data: 15 de setembro de 2026. Os resultados abaixo são execuções locais reais, não execução de CI remota e não certificação de produção.

## Ambiente

Linux, Node.js 22.16.0, npm 10.9.2 e Chromium de sistema controlado por Playwright Python. A versão exata do navegador aparece em `browser-qa.json`. Node 20, Windows, macOS, Firefox e Safari não foram executados nesta entrega.

## Testes executados

| Verificação | Resultado |
|---|---|
| `npm test` | 72 testes passaram, nenhuma falha ou teste ignorado |
| Sintaxe JavaScript | `npm run check` aprovado |
| Exemplo público | Cinco tipos de mapa compilados em modo estrito, sem erros e sem avisos |
| Fontes do exemplo | Um intervalo e seu SHA-256 conferidos contra `examples/contracts.md` |
| Documento real, entregue separadamente | 16 mapas compilados em modo estrito, 70 intervalos e hashes de arquivos conferidos; zero erros e avisos |
| Navegador, exemplo público | Todos os cinco mapas: contagem de componentes/relações, inspetor, tabela, SVG e PNG |
| Navegador, documento privado | Mesmos testes em todos os 16 mapas |
| Texto dos cartões | Medição de bounding boxes sem texto ultrapassando os cartões nas 21 vistas de teste |
| Interações | Busca, alcance dirigido, caminho, leitura guiada, zoom e exportações JSON/Markdown |
| Temas | Paper, limestone e graphite; a versão de impressão permanece em papel |
| Mobile | 390 × 844: menu e inspetor funcionaram; sem overflow horizontal da página |
| Carregamento externo | Nenhuma requisição externa e nenhum erro de JavaScript ou console nos testes de conteúdo |
| Fonte do documento | Exportação JSON igual à fonte original |
| Determinismo e integridade | Builds repetíveis e detecção de adulteração testados |
| Segurança de entrada | JSON inválido, IDs, campos desconhecidos, referências, hashes, caminhos, symlinks e XSS testados |
| Scanner | Segredos usuais e dependências excluídos; Compose e ordem de inicialização testados como rascunho |
| Servidor | Requisições HTTP reais via Node: documento autorizado, 404 para outros caminhos, 405 para escrita e 403 para Host não permitido |
| Atualização da prévia | JSON inválido preserva a última versão válida; a correção atualiza a revisão |
| Marca no documento | O HTML do documento privado não contém o nome do CLI nem o nome da ferramenta de referência |

O relatório de navegador público está em `browser-qa.json`. O relatório do documento privado permanece fora deste repositório. As contagens de componentes por mapa não representam serviços independentes.

## Instalação do pacote

O `.tgz` foi instalado com npm em um prefixo isolado, sem rede e sem scripts de instalação. O executável instalado passou por `doctor`, compilou os cinco mapas de exemplo em modo estrito, conferiu dez arquivos do bundle com `check` e instalou a skill em um workspace de teste. Nada foi instalado no computador do usuário.

## Limite específico do navegador deste ambiente

O Chromium administrado bloqueia navegação a `file://` e a URLs loopback com `ERR_BLOCKED_BY_ADMINISTRATOR`. Por isso os testes completos de interface usaram `page.set_content` com o HTML final, sem substituir scripts ou estilos, sem conexão externa e com downloads reais. A abertura por duplo clique e a navegação HTTP no navegador não foram validadas de ponta a ponta aqui. O servidor foi exercitado separadamente com um cliente HTTP Node.

O HTML contém todos os assets e dados; o pacote não requer CDN ou serviço remoto. Esse fato estrutural não substitui testar as políticas do navegador de destino.

## Reproduzir

Na raiz do repositório:

```bash
npm run verify
python scripts/qa_browser.py demo/index.html --out browser-results --browser /caminho/do/chromium
```

Para a segunda linha é necessário instalar Playwright Python e ter Chromium disponível. São dependências opcionais de desenvolvimento, não dependências da CLI.

## O que não foi validado

Não houve execução do runtime Archify nem teste de paridade integral com ele. O importador aceita apenas o subconjunto documentado de arquitetura v1. Não houve publicação no GitHub ou no npm, execução de GitHub Actions, instalação de agentes reais para consumir a skill, execução da aplicação de negócio, consultas a bancos, chamadas de modelos ou migrações. Os mapas não atestam o comportamento em produção.

Nenhum validador automático prova que a interpretação do código está semanticamente correta. Referências e hashes fixam local e versão; a relação entre evidência e afirmação exige revisão. Graphs muito extensos podem exigir zoom, posições manuais ou divisão em mais vistas.
