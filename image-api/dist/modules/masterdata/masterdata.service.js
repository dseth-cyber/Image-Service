import { getPrisma } from '../../lib/prisma.js';
export const MASTERDATA_TYPES = ['camera_type', 'image_category', 'defect_type', 'inspection_type'];
export async function listMasterdata(params) {
    const prisma = getPrisma();
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 200);
    const where = { type: params.type };
    if (params.isActive !== undefined)
        where.isActive = params.isActive;
    const [data, total] = await Promise.all([
        prisma.masterdata.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.masterdata.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getMasterdataById(id) {
    const prisma = getPrisma();
    return prisma.masterdata.findUnique({ where: { id } });
}
export async function createMasterdata(input) {
    const prisma = getPrisma();
    return prisma.masterdata.create({
        data: {
            type: input.type,
            code: input.code,
            nameTh: input.nameTh,
            nameEn: input.nameEn,
            nameCn: input.nameCn,
            nameMm: input.nameMm,
            nameJp: input.nameJp,
            description: input.description,
            sortOrder: input.sortOrder ?? 0,
            isActive: input.isActive ?? true,
        },
    });
}
export async function updateMasterdata(id, input) {
    const prisma = getPrisma();
    const data = {};
    if (input.code !== undefined)
        data.code = input.code;
    if (input.nameTh !== undefined)
        data.nameTh = input.nameTh;
    if (input.nameEn !== undefined)
        data.nameEn = input.nameEn;
    if (input.nameCn !== undefined)
        data.nameCn = input.nameCn;
    if (input.nameMm !== undefined)
        data.nameMm = input.nameMm;
    if (input.nameJp !== undefined)
        data.nameJp = input.nameJp;
    if (input.description !== undefined)
        data.description = input.description;
    if (input.sortOrder !== undefined)
        data.sortOrder = input.sortOrder;
    if (input.isActive !== undefined)
        data.isActive = input.isActive;
    return prisma.masterdata.update({ where: { id }, data });
}
export async function deleteMasterdata(id) {
    const prisma = getPrisma();
    return prisma.masterdata.delete({ where: { id } });
}
//# sourceMappingURL=masterdata.service.js.map