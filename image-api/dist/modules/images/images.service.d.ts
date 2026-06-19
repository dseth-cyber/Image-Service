import type { ImageSearchInput, UpdateMetadataInput } from './images.schema.js';
import type { PaginatedResult } from '../../types/index.js';
export declare function searchImages(params: ImageSearchInput): Promise<PaginatedResult<unknown>>;
export declare function getImageById(id: string): Promise<unknown>;
export declare function updateImageMetadata(id: string, input: UpdateMetadataInput): Promise<unknown>;
export declare function upsertImageTags(id: string, tags: Record<string, string>): Promise<{
    value: string;
    key: string;
}[]>;
export declare function deleteImageTag(id: string, key: string): Promise<void>;
export declare function softDeleteImage(id: string): Promise<void>;
//# sourceMappingURL=images.service.d.ts.map