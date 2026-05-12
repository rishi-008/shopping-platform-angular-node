import { S3Client } from '@aws-sdk/client-s3';

import { env } from '../env.js';

let client: S3Client | null = null;

export function getSpacesS3Client(): S3Client {
  if (!env.spaces.enabled) {
    throw new Error('Spaces is not configured');
  }

  if (!client) {
    client = new S3Client({
      region: env.spaces.region,
      endpoint: env.spaces.endpoint,
      credentials: {
        accessKeyId: env.spaces.accessKeyId,
        secretAccessKey: env.spaces.secretAccessKey
      }
    });
  }

  return client;
}
