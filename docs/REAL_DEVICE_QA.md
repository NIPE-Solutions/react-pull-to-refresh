# Real-device QA

Status vocabulary:

- Automated: covered by unit or Playwright tests.
- Manual pending: requires a physical device or human interaction review.
- Manual verified: includes device, version, date, and tester evidence.

| Device and browser | Status                           |
| ------------------ | -------------------------------- |
| iPhone Safari      | Manual pending                   |
| Android Chrome     | Manual pending                   |
| iPad Safari        | Manual pending                   |
| Desktop Chrome     | Automated; manual pending        |
| Desktop Safari     | Automated WebKit; manual pending |
| Desktop Firefox    | Automated; manual pending        |

For each device:

- Scroll normally from a non-zero offset.
- Attempt upward, diagonal, and horizontal gestures.
- Perform partial and threshold-crossing pulls.
- Reverse below hysteresis before release.
- Cancel before commitment.
- Complete, reject, and rapidly repeat refreshes.
- Scroll while a refresh promise is pending.
- Test a nested card and modal.
- Test Swipe Actions in RTL and LTR.
- Test Bottom Sheet content.
- Rotate portrait and landscape.
- Record browser-native pull-to-refresh interaction.
- Enable reduced motion.

Do not mark manual verified without the physical device, OS version, browser
version, date, and tester.
