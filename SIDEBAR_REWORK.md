# Sidebar Rework — Implementation Plan

## Step 1: Sidebar positioning & always-open
- Make sidebar permanently open (remove toggle/collapse behavior)
- Reposition sidebar (left? right? TBD based on design)
- Fix layout so main content and sidebar coexist properly
- Remove open/close state management, cookie persistence, Cmd+B shortcut

## Step 2: Strip sidebar internals
- Remove wizard navigation from sidebar
- Remove login flow / auth block from sidebar
- Remove recover swap tab from sidebar
- Simplify sidebar to only render what it should show (TBD)

## Step 3: Move displaced features back to widget
- Login / auth flows go back to the main widget (how they used to work)
- Settings, RPC config, etc. — restore to widget or modal as appropriate
- Ensure FormButton "Login to continue" still works correctly

## Step 4: Mobile sidebar
- Drop the TrainMenu modal duality (remove mobile-only hamburger menu)
- Implement sidebar for mobile (sheet/drawer or always-visible depending on design)
- Ensure consistent behavior across breakpoints

## Step 5: Cleanup
- Remove dead code (unused hooks, components, imports)
- Remove unused shadcn primitives if no longer needed
- Remove unused MenuStep enum values
- Clean up loginModalStore target field if no longer needed
