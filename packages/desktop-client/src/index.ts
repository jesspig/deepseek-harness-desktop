/**
 * Desktop client plugin, node half. Pure UI: the empty apply makes the plugin
 * appear in the host cordis.yml / Loader; the browser half ships via
 * exports["./client"], discovered through the package.json dsh.client declaration.
 */

/** Host plugin body — no host-side behavior for this surface plugin. */
export function apply(): void {}
