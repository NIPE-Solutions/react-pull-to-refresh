# Contributing

Thanks for helping make pull-to-refresh boringly reliable.

1. Use Node 24 and install with `npm ci`.
2. Create a focused branch.
3. Add a failing behavior test before changing mechanics.
4. Run `npm run check` and `npm run test:e2e`.
5. Distinguish automated browser results from physical-device and human
   assistive-technology validation.

Do not combine application data behavior with gesture mechanics. New public
configuration needs a demonstrated composition use case.
