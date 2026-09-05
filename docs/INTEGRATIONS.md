# Integrations

The documentation site runs these integrations with the published packages.
They are development dependencies of the website only; Pull to Refresh keeps
zero runtime dependencies beyond React peers.

## Swipe Actions

Place swipeable rows inside `PullToRefresh.Content`. Pull to Refresh waits
through its movement slop and rejects horizontal intent, leaving the row
primitive free to claim the gesture.

```tsx
<PullToRefresh.Root onRefresh={refresh}>
  <PullToRefresh.Content>
    <SwipeActions.Group>
      {items.map((item) => (
        <SwipeActions.Root key={item.id}>
          <SwipeActions.Trailing>{/* actions */}</SwipeActions.Trailing>
          <SwipeActions.Content>{/* row */}</SwipeActions.Content>
        </SwipeActions.Root>
      ))}
    </SwipeActions.Group>
  </PullToRefresh.Content>
</PullToRefresh.Root>
```

Ownership is explicit:

- horizontal intent → Swipe Actions;
- ordinary vertical movement → scroll container;
- downward intent at the top → Pull to Refresh.

## Spring Bottom Sheet

Keep the sheet handle outside the feed and pass the feed’s actual scrolling
element explicitly:

```tsx
<Sheet.Content>
  <Sheet.Handle />
  <PullToRefresh.Root
    ref={scrollRef}
    className="sheet-scroll"
    onRefresh={refresh}
    scrollContainer={scrollRef}
  >
    <PullToRefresh.Content>{/* feed */}</PullToRefresh.Content>
  </PullToRefresh.Root>
</Sheet.Content>
```

Make the root itself scrollable. Do not place a default PTR root—with its
mechanical overflow containment—inside a second element that is expected to
receive chained scrolling.

The documentation proof uses the published v5 package. Desktop automation
verifies that the sheet opens, scrolls the dedicated root, and closes.
Combined drag feel on iOS and Android remains manual pending; the alpha does not
claim physical-device verification.
