import { Queue } from 'bullmq';

(async () => {
  const queue = new Queue('scanner', {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    },
  });
  const job = await queue.add('day-trade-scan', {}, { attempts: 3, backoff: { type: 'fixed', delay: 10000 } });
  console.log('Job kuyruga eklendi:', job.id);
  await queue.close();
})();
