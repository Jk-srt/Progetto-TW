import { Pool } from 'pg';

// Intervallo di default: 5 minuti
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export interface FlightStatusJobOptions {
  intervalMs?: number;
  enabled?: boolean;
  log?: boolean;
}

export class FlightStatusJob {
  private timer: NodeJS.Timeout | null = null;
  private readonly pool: Pool;
  private readonly options: Required<FlightStatusJobOptions>;

  constructor(pool: Pool, options: FlightStatusJobOptions = {}) {
    this.pool = pool;
    this.options = {
      intervalMs: options.intervalMs ?? DEFAULT_INTERVAL_MS,
      enabled: options.enabled ?? true,
      log: options.log ?? true
    };
  }

  start() {
    if (!this.options.enabled) {
      if (this.options.log) console.log('[FlightStatusJob] Disabilitato (ENABLE_FLIGHT_STATUS_JOB=false)');
      return;
    }
    if (this.timer) return; // già avviato

    this.timer = setInterval(() => this.runOnce(), this.options.intervalMs);
    if (this.options.log) console.log(`[FlightStatusJob] Avviato: ogni ${this.options.intervalMs / 1000}s`);

    // Esegui subito una volta
    this.runOnce();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      if (this.options.log) console.log('[FlightStatusJob] Fermato');
    }
  }

  async runOnce() {
    try {
      const client = await this.pool.connect();
      try {
        const sql = `UPDATE flights
          SET status = CASE
            WHEN status IN ('scheduled','delayed') AND NOW() >= arrival_time THEN 'completed'
            WHEN status = 'scheduled' AND NOW() >= departure_time AND NOW() < arrival_time THEN 'in_progress'
            ELSE status
          END
          WHERE status IN ('scheduled','delayed')
            AND (NOW() >= arrival_time OR NOW() >= departure_time);`;
        const result = await client.query(sql);
        if (this.options.log && result.rowCount) {
          console.log(`[FlightStatusJob] Aggiornati ${result.rowCount} voli`);
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[FlightStatusJob] Errore:', err instanceof Error ? err.message : err);
    }
  }
}

export function initFlightStatusJob(pool: Pool) {
  const enabled = (process.env.ENABLE_FLIGHT_STATUS_JOB || 'true').toLowerCase() === 'true';
  const intervalMs = process.env.FLIGHT_STATUS_INTERVAL_MS ? parseInt(process.env.FLIGHT_STATUS_INTERVAL_MS, 10) : undefined;
  const job = new FlightStatusJob(pool, { enabled, intervalMs });
  job.start();
  return job;
}
