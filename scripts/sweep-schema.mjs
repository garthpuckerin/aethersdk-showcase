export function assertSweepResult(result) {
  if (!result || result.schemaVersion !== 1) throw new Error('schemaVersion must equal 1');
  if (typeof result.checkedAt !== 'string' || Number.isNaN(Date.parse(result.checkedAt)) || !/^\d{4}-\d{2}-\d{2}T/.test(result.checkedAt)) throw new Error('checkedAt must be an ISO date-time');
  try { new URL(result.sourceUrl); } catch { throw new Error('sourceUrl must be an absolute URL'); }
  if (!Array.isArray(result.pages) || !result.pages.length) throw new Error('pages must contain at least one sweep result');
  for (const page of result.pages) {
    if (typeof page.path !== 'string' || !Number.isInteger(page.status)) throw new Error('each page requires path and numeric status');
    for (const key of ['consoleErrors', 'externalRequests', 'missingAssets']) if (!Array.isArray(page[key])) throw new Error(`${key} must be an array`);
  }
  return result;
}
