import { SmbClient, jobFilePath } from './smb.js';
import { scanCameraDirectory } from './scanner.js';
import { computeChecksum } from './checksum.js';
import { Tracker } from './tracker.js';
import { JobProducer } from './producer.js';
import * as api from './api-client.js';
import { logger } from './logger.js';
import { config } from '../config/index.js';
import type { CameraConfig, SyncFile, PollResult } from '../types/index.js';

const cameraPollIntervals = new Map<string, number>();

export class CameraPoller {
  constructor(
    private tracker: Tracker,
    private producer: JobProducer,
  ) {}

  async pollAllCameras(): Promise<PollResult[]> {
    const results: PollResult[] = [];

    try {
      const cameras = await api.fetchCameras();
      const activeCameras = cameras.filter((c) => c.enabled && c.status === 'active');

      logger.info({ total: cameras.length, active: activeCameras.length }, 'Camera fetch complete');

      const pollPromises = activeCameras.map((camera) =>
        this.pollSingleCamera(camera).catch((err) => {
          logger.error({ cameraId: camera.id, cameraName: camera.name, err }, 'Camera poll error');
          return {
            cameraId: camera.id,
            cameraName: camera.name,
            scanned: 0,
            newFiles: 0,
            duplicates: 0,
            errors: 1,
            durationMs: 0,
          } as PollResult;
        }),
      );

      const pollResults = await Promise.all(pollPromises);
      results.push(...pollResults);

      const totalNew = results.reduce((s, r) => s + r.newFiles, 0);
      const totalErrors = results.reduce((s, r) => s + r.errors, 0);
      logger.info(
        { cameras: results.length, newFiles: totalNew, errors: totalErrors },
        'Poll cycle complete',
      );
    } catch (err) {
      logger.error({ err }, 'Poll cycle failed');
    }

    return results;
  }

  private async pollSingleCamera(camera: CameraConfig): Promise<PollResult> {
    const startTime = Date.now();
    const stats = { scanned: 0, newFiles: 0, duplicates: 0, errors: 0 };

    if (!this.shouldPoll(camera)) {
      return {
        cameraId: camera.id,
        cameraName: camera.name,
        scanned: 0,
        newFiles: 0,
        duplicates: 0,
        errors: 0,
        durationMs: 0,
      };
    }

    const smb = new SmbClient(camera);

    try {
      await smb.connect();
      logger.info({ camera: camera.name, path: camera.smbSharePath }, 'Connected to SMB share');

      const files = await scanCameraDirectory(smb, camera);
      stats.scanned = files.length;

      if (files.length === 0) {
        logger.debug({ camera: camera.name }, 'No new files found');
        await api.updateCameraPoll(camera.id);
        return this.buildResult(camera, stats, startTime);
      }

      const toProcess: Array<{ file: SyncFile; checksum: string }> = [];

      for (const file of files) {
        const smbPath = file.originalFilename;
        let checksum: string;

        try {
          const stream = smb.createReadStream(smbPath);
          checksum = await computeChecksum(stream, config.checksum.algorithm);
        } catch (err) {
          logger.error({ camera: camera.name, file: file.originalFilename, err }, 'Checksum failed');
          stats.errors++;
          continue;
        }

        const alreadyProcessed = await this.tracker.isProcessed(camera.id, checksum);
        if (alreadyProcessed) {
          logger.debug(
            { camera: camera.name, file: file.originalFilename, checksum: checksum.slice(0, 16) },
            'Duplicate file, skipping',
          );
          stats.duplicates++;
          continue;
        }

        toProcess.push({ file, checksum });
      }

      logger.info(
        { camera: camera.name, scanned: stats.scanned, toProcess: toProcess.length, duplicates: stats.duplicates },
        'Scan complete',
      );

      for (const { file, checksum } of toProcess) {
        try {
          const existing = await api.findImageByChecksum(checksum);
          if (existing) {
            logger.info(
              { camera: camera.name, file: file.originalFilename, imageId: existing.id },
              'Image already registered, skipping',
            );
            await this.tracker.markProcessed(camera.id, checksum, existing.id);
            stats.duplicates++;
            continue;
          }

          const { id: imageId } = await api.registerImage({
            cameraId: camera.id,
            originalFilename: file.originalFilename,
            fileSizeBytes: file.fileSizeBytes,
            checksumMd5: checksum,
          });

          const jobPath = jobFilePath(camera, file.originalFilename);

          await this.producer.enqueue({
            imageId,
            cameraId: camera.id,
            smbPath: jobPath,
            originalFilename: file.originalFilename,
            fileSizeBytes: file.fileSizeBytes,
            checksumMd5: checksum,
          });

          await this.tracker.markProcessed(camera.id, checksum, imageId);

          stats.newFiles++;
          logger.info(
            { camera: camera.name, file: file.originalFilename, imageId },
            'File queued for processing',
          );
        } catch (err) {
          logger.error(
            { camera: camera.name, file: file.originalFilename, err },
            'Failed to process file',
          );
          stats.errors++;
        }
      }

      await api.updateCameraPoll(camera.id, {
        scanned: stats.scanned,
        newFiles: stats.newFiles,
        errors: stats.errors,
      });

      updateCameraInterval(camera);
    } catch (err) {
      logger.error({ camera: camera.name, err }, 'SMB connection or scan error');
      stats.errors++;
      await api.reportError(camera.id, `Scan failed: ${(err as Error).message}`);
    } finally {
      await smb.close();
    }

    return this.buildResult(camera, stats, startTime);
  }

  private shouldPoll(camera: CameraConfig): boolean {
    const lastPoll = cameraPollIntervals.get(camera.id);
    if (!lastPoll) return true;
    const elapsed = Date.now() - lastPoll;
    return elapsed >= camera.pollIntervalSeconds * 1000;
  }

  private buildResult(
    camera: CameraConfig,
    stats: { scanned: number; newFiles: number; duplicates: number; errors: number },
    startTime: number,
  ): PollResult {
    return {
      cameraId: camera.id,
      cameraName: camera.name,
      scanned: stats.scanned,
      newFiles: stats.newFiles,
      duplicates: stats.duplicates,
      errors: stats.errors,
      durationMs: Date.now() - startTime,
    };
  }
}

function updateCameraInterval(camera: CameraConfig): void {
  cameraPollIntervals.set(camera.id, Date.now());
}

export function resetCameraInterval(cameraId: string): void {
  cameraPollIntervals.delete(cameraId);
}
