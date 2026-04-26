# Repeater (SHELL — Sprint 9 owns the real implementation)

Sprint 5 ships only the structural shell. The Repeater renders its first
child once inside a wrapper carrying `data-component-id` and
`data-component-type="Repeater"`. Sprint 9 will replace this with N
renders driven by `node.dataBinding` (data source, filters, sort, limit,
empty state, RM-token resolution).

## Props

None in Sprint 5. `node.dataBinding` exists in the schema but is **not
read** here.

## Style controls (PROJECT_SPEC.md §6.4)

- Background, padding, margin, border, border radius, shadow.
- Width / height.
- Visibility (always / desktop / mobile).
- Animation preset on enter and on hover.

## AI ops supported (Tier 1, PROJECT_SPEC.md §9.4)

In Sprint 5 the Repeater is treated as a structural container. Sprint 9
adds `setDataBinding` for source / filters / connectedInputs / sort /
limit / emptyState.

- `setStyle`, `setAnimation`, `setVisibility`.
- `addComponent` (the template child), `removeComponent`, `moveComponent`.

## Data binding

Reserved for Sprint 9 — see `PROJECT_SPEC.md` §8.9.

## Children policy

`one` — the single child is the template. Sprint 9 will render it once
per row of the bound data source.

## Sprint 5 invariants

- `Repeater/index.tsx` MUST NOT import from `@/lib/rm-api`.
- `Repeater/index.tsx` MUST NOT import `@tanstack/react-query`.
- `Repeater/index.tsx` MUST NOT contain the substring representing the
  open RM-token braces (the unit test enforces this).
- `Repeater/index.tsx` MUST NOT reference `node.dataBinding` other than
  to ignore it.
