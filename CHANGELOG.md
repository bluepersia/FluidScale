# Changelog

## [0.0.1678-alpha]- 2025-07-15

### Fixed

Background position errors when building JSON.

## [0.0.1676-alpha]- 2025-07-14

### Fixed

1. % values and transitions/parent-resizing bug.
2. Scroll jank when scrolling immediately after resize.
3. Racing conditions on initialization and page load.
4. string values (like 'auto') fixes.
5. Break not parsing correctly fix.

### Added

1. max-width and max-height as properties.
2. Background positions (left, top, etc.) - algorithm may need tuning.
3. New break syntax --break.

### Modified

Interpolate to the last matching rule.

## [0.0.1675-alpha]- 2025-07-12

### Added

1. JSON loading deactivated in 'dev' mode.
2. `usingJSON` flag to halt stylesheet parsing.

## [0.0.1674-alpha]- 2025-07-11

### Modified

Changed math eval to new Function() approach.

## [0.0.1673-alpha]- 2025-07-11

### Added

1. Performance optimization. Only compute on-screen elements.
2. Custom scroll anchoring algorithm.

## [0.0.1671-alpha]- 2025-07-07

### Changed

Rewrote the update algorithm for fluid properties.

### Added

1. Support for inline styles
2. Support for dynamic pseudo selectors
3. --force
4. Spanning with --span-start and --span-end

### Fixed

Negative numbers work now.

## [0.0.1668-alpha]- 2025-07-05

1.Locking values now spans across to the last breakpoint, if no intercepting value is defined.
2.Transitions enabled again, only from starting values.

## [0.0.1667-alpha]- 2025-07-05

### Added

Engine now updates before repaint! Many glitches are fixed.

### Changed

Transitions are now disabled by default.
See readme for transition settings.

### Fixed

Root font size should now be correct.

## [0.0.1665-alpha]- 2025-07-04

### Added

Shorthand + Longhand mixed support (e.g. padding -> padding-left)

### Fixed

Text-based value glitches fixed ('auto', etc.). These values still don't scale fluidly as of now.

## [0.0.1659-alpha]- 2025-07-03

### Fixed

Unnecessary removeProperty calls

### Changed

Viewport computation inclusion margin increased to 50%.

### Added

Do not removeProperty back to default if the screen size didn't change.

## [0.0.1658-alpha]- 2025-07-03

1. % should work correctly now
2. Some visual improvements

## [0.0.1657-alpha]- 2025-07-02

1. Minmax, max, min, clamp and calc support.
2. Mixed units support (rem -> vw)
3. Performance adjustments
4. Break

## [0.0.1656-alpha]- 2025-06-30

### Fixed

- auto-fit, auto-fill scales properly.

## [0.0.1654-alpha]- 2025-06-29

### Added

1. Multi-values support for border-radius

## [0.0.1653-alpha] - 2025-06-29

### Added

1. Grid support
2. Multi-values support (2rem 2rem -> 3rem 2rem 4rem)
3. Base breakpoint option (instead of media query in CSS)

### Fixed

1. Multiple stylesheets bug fix
