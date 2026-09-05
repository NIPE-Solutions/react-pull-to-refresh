# Integrations

## Swipe Actions

Place swipeable rows inside PullToRefresh.Content. Pull-to-refresh waits through
a small movement slop, then rejects horizontal or upward intent. This lets
@nipe-solutions/react-swipe-actions own row gestures without a runtime
dependency.

```tsx
<PullToRefresh.Root onRefresh={refresh}>
  <PullToRefresh.Content>
    {items.map((item) => (
      <SwipeActions.Root key={item.id}>{/* row actions */}</SwipeActions.Root>
    ))}
  </PullToRefresh.Content>
</PullToRefresh.Root>
```

Automated intent tests cover horizontal rejection. Combined physical-device
testing remains in the manual matrix.

## Spring Bottom Sheet

Use the sheet’s actual scrolling element as the explicit owner:

```tsx
<BottomSheet>
  <div ref={scrollRef} className="sheet-scroll">
    <PullToRefresh.Root onRefresh={refresh} scrollContainer={scrollRef}>
      <PullToRefresh.Content>{/* feed */}</PullToRefresh.Content>
    </PullToRefresh.Root>
  </div>
</BottomSheet>
```

The sheet continues to own drag gestures outside its scrolling content. Exact
ownership depends on sheet configuration, so the combined physical-device
scenario is not claimed as verified in this alpha.
