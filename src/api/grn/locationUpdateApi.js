// "Scan" inventory barcodes through the API instead of the device:
//   PUT https://grn-inventory.../raw-material-inventory/location-update
//   { barcodes: [...], locationId: '100262', locationName: 'B03' }   + header warehouseId: B03
//
// Auth: the Bearer token is taken from the logged-in GRN app's own API calls (so nothing is
// pasted by hand). SCAN_API_TOKEN in .env is used only if no token was seen.

/**
 * @typedef {{ url: string, locationId: string, locationName: string, warehouseId: string, batchSize: number, timeout: number }} LocationUpdateConfig
 * @typedef {{ success: boolean, message?: string, code?: string, barcode: string }} LocationUpdateResult
 */

class LocationUpdateApi {
  /**
   * @param {import('@playwright/test').Page} page  the logged-in GRN app page
   * @param {LocationUpdateConfig} config
   */
  constructor(page, config) {
    this.page   = page;
    this.config = config;
    this.authorization = '';

    // Keep the latest Bearer token the app sends to its own APIs
    page.on('request', async request => {
      if (!/\.flo\.[a-z]+\.brandixlk\.org/.test(request.url())) return;
      const auth = (await request.allHeaders().catch(() => ({})))['authorization'];
      if (auth && /^Bearer /i.test(auth)) this.authorization = auth;
    });
  }

  get token() {
    if (this.authorization) return this.authorization;
    if (process.env.SCAN_API_TOKEN) return `Bearer ${process.env.SCAN_API_TOKEN.replace(/^Bearer\s+/i, '')}`;
    return '';
  }

  /**
   * Sends the barcodes in batches; failed barcodes are sent once more.
   * @param {string[]} barcodes
   * @param {(msg: string) => void} [log]
   * @returns {Promise<{ updated: number, failed: LocationUpdateResult[] }>}
   */
  async updateLocation(barcodes, log = console.log) {
    let failed = await this.sendInBatches(barcodes, log);

    if (failed.length) {
      log(`⚠️ ${failed.length} barcode(s) not updated — sending them once more`);
      failed = await this.sendInBatches(failed.map(f => f.barcode), log);
    }
    return { updated: barcodes.length - failed.length, failed };
  }

  /**
   * @param {string[]} barcodes
   * @param {(msg: string) => void} log
   * @returns {Promise<LocationUpdateResult[]>} failed results
   */
  async sendInBatches(barcodes, log) {
    const { batchSize } = this.config;
    const failed = [];

    for (let i = 0; i < barcodes.length; i += batchSize) {
      const batch   = barcodes.slice(i, i + batchSize);
      const started = Date.now();
      const results = await this.put(batch);

      const byBarcode = new Map(results.map(r => [r.barcode, r]));
      for (const barcode of batch) {
        const r = byBarcode.get(barcode);
        if (!r || !r.success) failed.push(r || { barcode, success: false, message: 'missing from response' });
      }
      log(`→ location-update ${i + 1}–${i + batch.length} of ${barcodes.length}: ` +
          `${batch.length - failed.filter(f => batch.includes(f.barcode)).length} ok (${Math.round((Date.now() - started) / 1000)}s)`);
    }
    return failed;
  }

  /**
   * @param {string[]} barcodes
   * @returns {Promise<LocationUpdateResult[]>}
   */
  async put(barcodes) {
    const { url, locationId, locationName, warehouseId, timeout } = this.config;
    if (!this.token) throw new Error('No API token — the app made no authenticated request yet and SCAN_API_TOKEN is not set');

    const response = await this.page.request.put(url, {
      headers: {
        Accept:            'application/json',
        'Accept-Language': 'en',
        'Content-Type':    'application/json;charset=UTF-8',
        Authorization:     this.token,
        warehouseId,
      },
      data:    { barcodes, locationId, locationName },
      timeout,
    });

    const text = await response.text();
    if (!response.ok()) {
      throw new Error(`location-update HTTP ${response.status()}: ${text.slice(0, 500)}`);
    }

    let body;
    try { body = JSON.parse(text); } catch { throw new Error(`location-update returned non-JSON: ${text.slice(0, 300)}`); }
    if (body.message) console.log(`    ← ${body.message.trim()}`);
    return Array.isArray(body.results) ? body.results : [];
  }
}

module.exports = { LocationUpdateApi };
