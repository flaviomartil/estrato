# Source contract

The root has `schemaVersion: 1`, `project`, `maps`, and optional `guide`, `evidence`, `findings`, `decisions`. Unknown fields are rejected. Do not attach an arbitrary `svg`, HTML string, executable path or schema extension to the model.

```json
{
  "schemaVersion": 1,
  "project": {
    "name": "Meu sistema",
    "description": "Arquitetura e funcionamento",
    "theme": "paper",
    "language": "pt-BR",
    "scope": "Análise estática do snapshot. Sem execução em produção."
  },
  "maps": [{
    "id": "context",
    "title": "O sistema em uma página",
    "section": "Arquitetura",
    "summary": "Uma interface consulta a API autenticada.",
    "type": "architecture",
    "direction": "LR",
    "nodes": [
      {"id":"web","label":"Interface","kind":"frontend","description":"Apresenta a jornada.","status":"proposed"},
      {"id":"api","label":"API","kind":"backend","description":"Aplica contratos e autorização.","status":"proposed"}
    ],
    "edges": [{"id":"request","from":"web","to":"api","label":"HTTPS","variant":"default"}],
    "steps": [{"title":"Consultar","description":"A interface chama a API.","nodes":["web","api"],"edges":["request"]}],
    "notes": [{"title":"Limite","text":"Exemplo de proposta, não topologia observada."}]
  }],
  "guide": [{"id":"overview","title":"Comece por aqui","body":"Descreva o propósito e as jornadas."}],
  "evidence": [],
  "findings": [],
  "decisions": []
}
```

## Nodes

Required: `id`, `label`. Optional strings: `subtitle`, `kind`, `description`, `technology`, `owner`. `status` is `observed|inferred|proposed`; `evidence` is a list of evidence IDs. `position: [x,y]` is optional but must exist on every node or none. `size: [width,height]` defaults to `[244,126]`, with minimum `[200,100]`. Larger manual nodes may require manual positions. Negative or non-finite positions are rejected.

Kinds are semantic labels, not provider logos: frontend, backend, database, cloud, external, security, messagebus, worker, decision, state, package, module, file, or another descriptive string. Workflow and dataflow use the same generic graph shape system; workflow lanes/BPMN and UML semantics are not automatically inferred.

## Edges

Required: `id`, `from`, `to`. Optional: `label`, `description`, `variant`, `status`, `evidence`. `variant` is `default|emphasis|conditional`. Explicit `via` is a list of orthogonal intermediate `[x,y]` points in the author's coordinate space; `labelAt` is a manual label center. Avoid long labels; full detail belongs in descriptions. The renderer wraps and may truncate long visible labels; the full label remains available in table/inspector/source.

Do not repeat an edge ID, even for two messages with the same source and destination. Self-loops and cycles are valid. Sequence edges are chronological messages; graph modes use directed topology instead of message order.

## Groups and steps

`groups: [{"id":"internal","label":"Internal","nodes":["api"]}]` draws explicit visual boundaries. An empty group has no useful meaning. Boundaries do not authorize access or infer network isolation.

`steps` are objects with `title`, optional `description`, `nodes`, `edges`. References must exist in that view. Steps with text only provide narrative reading without fabricating a highlighted route.

## Evidence

```json
{
  "id": "E01",
  "title": "Entrada do serviço",
  "note": "O trecho mostra o handler; não comprova execução.",
  "references": [{
    "path": "src/server.ts",
    "start": 10,
    "end": 35,
    "sha256": "REPLACE_WITH_THE_ACTUAL_64_HEX_FILE_HASH"
  }]
}
```

The placeholder above is intentionally invalid. Compute the real SHA-256 or omit the field and disclose the missing version pin. `excerpt` can optionally contain a reviewed plain-text excerpt, never executable markup. Evidence files must remain inside `--repo`, including after symlink resolution.

## Findings and decisions

Both contain `id`, `title`, `description`, optional `severity: info|warning|critical`, `status`, and `evidence`. A warning must be a specific statement, not a generic security label. A source hash proves file identity; a status flag is authored, not an automatic certification.
