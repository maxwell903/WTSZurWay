# FlowGroup

Engine-managed horizontal flex container. The user never sees this in the
component picker, layer tree, breadcrumb, or AI-chat selection chip — it
is inserted automatically when the user drops a sibling on the left or
right edge of an existing component, and dissolved automatically when its
child count drops below 2.

Renders as `<div style="display:flex;flex-direction:row;width:100%">`.
Width can be overridden via `style.width` (the engine sets this when a
FlowGroup is itself a child of another container that needs a specific
share of horizontal space).

## childrenPolicy

`many` — accepts any non-FlowGroup ComponentType.

## props

None. FlowGroup is layout-only.
