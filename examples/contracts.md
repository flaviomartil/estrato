# Acervo: contrato ilustrativo

Este arquivo descreve um sistema fictício para demonstrar documentação.
Não há serviço de produção nem execução de negócio associada.

## Consulta
A interface consulta uma API. A API lê metadados em PostgreSQL.
Arquivos são recuperados em armazenamento de objetos usando acesso autorizado.

## Publicação
A API valida a sessão e registra um job em uma fila durável.
O worker valida o arquivo, extrai conteúdo e persiste os resultados.
Falhas transitórias retornam à fila com limite de tentativas.
Falhas definitivas são registradas para investigação.

## Estados de um job
Um job pode estar recebido, em processamento, aguardando nova tentativa,
concluído ou com falha. Cancelamentos são tratados antes do início.

## Privacidade
Armazene apenas metadados necessários. Os arquivos não ficam no banco relacional.
