# Publicação: estado real

Em 15 de setembro de 2026, o conector GitHub confirmou a conta `flaviomartil`. A ferramenta de leitura retornou 404 para `flaviomartil/estrato`; isso, isoladamente, não prova inexistência de um repositório inacessível. Não há operação de criação/push entre as ações liberadas nesta conversa, e nenhum repositório remoto foi criado.

Foi incluído `scripts/publish-github.mjs` com um manifesto explícito de arquivos. O modo padrão só verifica arquivos locais. O modo `--publish` usa o GitHub CLI autenticado no computador e verifica a identidade novamente. Contas diferentes, repositórios existentes, hashes divergentes e erros de acesso que não sejam 404 impedem a criação. O código só é enviado depois de verificar que o destino criado é privado. Não há publicação no npm.

Os 72 testes existentes foram preservados. Oito novos testes de publicação verificam lista permitida, integridade, conta divergente, repositório existente, falha de acesso, sequência de publicação, privacidade e confirmação do commit. Esses oito testes usam respostas simuladas para GitHub e Git; não equivalem a um envio real nem validam o cliente gh instalado pelo usuário.

A documentação do IMP é uma entrega separada e não será lida pelo publicador.
