# Origem e escopo

Estrato é uma implementação independente. O fluxo é simples: um agente produz uma representação estruturada; um motor local valida e renderiza a documentação. Todo o código desta distribuição foi implementado especificamente para este projeto, sem runtime, assets ou validadores de terceiros incorporados.

A compatibilidade oferecida é um importador explícito do subconjunto `architecture`, `schema_version: 1`. Não se afirma equivalência integral com a CLI, os schemas, a qualidade geométrica, os exportadores ou as interações do formato de origem. Campos não suportados são reportados.

A documentação gerada é deliberadamente sem marca do gerador. Isso não remove a licença deste código-fonte nem autoriza apagar licenças de código de terceiros incorporado em trabalhos futuros. Fontes tipográficas são famílias de sistema; não há arquivos de fontes distribuídos.

O exemplo Acervo é fictício. A documentação real do IMP é uma entrega privada separada e não integra este repositório nem o pacote npm.
