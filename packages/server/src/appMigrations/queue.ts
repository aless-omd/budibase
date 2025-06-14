import { queue, logging } from "@budibase/backend-core"
import { Job } from "bull"
import { processMigrations } from "./migrationsProcessor"

const MAX_ATTEMPTS = 3
// max number of migrations to run at same time, per node
const MIGRATION_CONCURRENCY = 5

export type AppMigrationJob = {
  appId: string
}

// always create app migration queue - so that events can be pushed and read from it
// across the different api and automation services
const appMigrationQueue = new queue.BudibaseQueue<AppMigrationJob>(
  queue.JobQueue.APP_MIGRATION,
  {
    jobOptions: {
      attempts: MAX_ATTEMPTS,
      removeOnComplete: true,
      removeOnFail: true,
    },
    maxStalledCount: MAX_ATTEMPTS,
    removeStalledCb: async (job: Job) => {
      logging.logAlert(
        `App migration failed, queue job ID: ${job.id} - reason: ${job.failedReason}`
      )
    },
  }
)

export function init() {
  return appMigrationQueue.process(MIGRATION_CONCURRENCY, processMessage)
}

async function processMessage(job: Job<AppMigrationJob>) {
  const { appId } = job.data

  await processMigrations(appId)
}

export function getAppMigrationQueue() {
  return appMigrationQueue
}
