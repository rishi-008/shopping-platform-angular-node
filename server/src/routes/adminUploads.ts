import type { Router } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getSpacesS3Client } from '../spaces/s3.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  // Keep alphanumerics, dots, dashes, underscores.
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function registerAdminUploadRoutes(router: Router) {
  router.post('/admin/uploads/presign', requireAuth, requireAdmin, async (req, res) => {
    if (!env.spaces.enabled) {
      return res.status(500).json({ error: 'Spaces upload is not configured on the server' });
    }

    const { filename, contentType } = req.body as Record<string, unknown>;

    if (!isNonEmptyString(filename)) return res.status(400).json({ error: 'filename is required' });
    if (!isNonEmptyString(contentType)) return res.status(400).json({ error: 'contentType is required' });

    if (!contentType.toLowerCase().startsWith('image/')) {
      return res.status(400).json({ error: 'Only image uploads are allowed' });
    }

    const safe = sanitizeFilename(filename);
    const unique = crypto.randomBytes(8).toString('hex');

    const key = `${env.spaces.productsPrefix}/${Date.now()}_${unique}_${safe}`;

    try {
      const s3 = getSpacesS3Client();

      const cmd = new PutObjectCommand({
        Bucket: env.spaces.bucket,
        Key: key,
        ACL: 'public-read',
        ContentType: contentType,
        CacheControl: 'public, max-age=86400'
      });

      const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
      const publicUrl = `${env.spaces.publicBaseUrl}/${key}`;

      return res.json({ uploadUrl, key, publicUrl });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}
