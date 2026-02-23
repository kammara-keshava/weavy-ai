import type { TriggerConfig } from '@trigger.dev/sdk/v3';

export const config: TriggerConfig = {
  project: process.env.TRIGGER_PROJECT_ID || 'your-project-id',
  logLevel: 'log',
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./trigger'],
};
