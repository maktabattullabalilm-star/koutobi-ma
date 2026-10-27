// Single source of truth for the release shown in the UI.
// Must match package.json "version". Bump per docs/versioning.md:
// fix/small feature → PATCH, big feature → MINOR, new release → MAJOR
// (always reset every number to the right of the bumped one to 0).
export const APP_VERSION = '1.1.12';
