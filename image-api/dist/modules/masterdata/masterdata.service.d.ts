export declare const MASTERDATA_TYPES: readonly ["camera_type", "image_category", "defect_type", "inspection_type"];
export type MasterdataType = (typeof MASTERDATA_TYPES)[number];
export declare function listMasterdata(params: {
    type: MasterdataType;
    page?: number;
    limit?: number;
    isActive?: boolean;
}): Promise<{
    data: {
        code: string;
        type: string;
        id: string;
        nameTh: string | null;
        nameEn: string | null;
        nameCn: string | null;
        nameMm: string | null;
        nameJp: string | null;
        description: string | null;
        sortOrder: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export declare function getMasterdataById(id: string): Promise<{
    code: string;
    type: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export interface CreateMasterdataInput {
    type: MasterdataType;
    code: string;
    nameTh?: string;
    nameEn?: string;
    nameCn?: string;
    nameMm?: string;
    nameJp?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export declare function createMasterdata(input: CreateMasterdataInput): Promise<{
    code: string;
    type: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export interface UpdateMasterdataInput {
    code?: string;
    nameTh?: string;
    nameEn?: string;
    nameCn?: string;
    nameMm?: string;
    nameJp?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
}
export declare function updateMasterdata(id: string, input: UpdateMasterdataInput): Promise<{
    code: string;
    type: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function deleteMasterdata(id: string): Promise<{
    code: string;
    type: string;
    id: string;
    nameTh: string | null;
    nameEn: string | null;
    nameCn: string | null;
    nameMm: string | null;
    nameJp: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=masterdata.service.d.ts.map