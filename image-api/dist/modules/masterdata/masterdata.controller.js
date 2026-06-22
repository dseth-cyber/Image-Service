import * as masterdataService from './masterdata.service.js';
async function listHandler(request, reply) {
    const query = request.query;
    const type = String(query.type);
    if (!masterdataService.MASTERDATA_TYPES.includes(type)) {
        return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: `Invalid type. Must be one of: ${masterdataService.MASTERDATA_TYPES.join(', ')}` });
    }
    const result = await masterdataService.listMasterdata({
        type: type,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
    });
    return reply.send(result);
}
async function getByIdHandler(request, reply) {
    const { id } = request.params;
    const item = await masterdataService.getMasterdataById(id);
    if (!item)
        return reply.status(404).send({ statusCode: 404, error: 'NotFound', message: 'Masterdata not found' });
    return reply.send(item);
}
async function createHandler(request, reply) {
    const body = request.body;
    const type = String(body.type);
    if (!masterdataService.MASTERDATA_TYPES.includes(type)) {
        return reply.status(400).send({ statusCode: 400, error: 'BadRequest', message: `Invalid type. Must be one of: ${masterdataService.MASTERDATA_TYPES.join(', ')}` });
    }
    const item = await masterdataService.createMasterdata({
        type: type,
        code: String(body.code),
        nameTh: body.nameTh ? String(body.nameTh) : undefined,
        nameEn: body.nameEn ? String(body.nameEn) : undefined,
        nameCn: body.nameCn ? String(body.nameCn) : undefined,
        nameMm: body.nameMm ? String(body.nameMm) : undefined,
        nameJp: body.nameJp ? String(body.nameJp) : undefined,
        description: body.description ? String(body.description) : undefined,
        sortOrder: body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });
    return reply.status(201).send(item);
}
async function updateHandler(request, reply) {
    const { id } = request.params;
    const body = request.body;
    const item = await masterdataService.updateMasterdata(id, {
        code: body.code !== undefined ? String(body.code) : undefined,
        nameTh: body.nameTh !== undefined ? String(body.nameTh) : undefined,
        nameEn: body.nameEn !== undefined ? String(body.nameEn) : undefined,
        nameCn: body.nameCn !== undefined ? String(body.nameCn) : undefined,
        nameMm: body.nameMm !== undefined ? String(body.nameMm) : undefined,
        nameJp: body.nameJp !== undefined ? String(body.nameJp) : undefined,
        description: body.description !== undefined ? String(body.description) : undefined,
        sortOrder: body.sortOrder !== undefined ? parseInt(String(body.sortOrder), 10) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });
    return reply.send(item);
}
async function deleteHandler(request, reply) {
    const { id } = request.params;
    await masterdataService.deleteMasterdata(id);
    return reply.status(204).send();
}
export async function masterdataRoutes(app) {
    app.get('/', { preHandler: [app.authenticate] }, listHandler);
    app.get('/:id', { preHandler: [app.authenticate] }, getByIdHandler);
    app.post('/', { preHandler: [app.authenticate] }, createHandler);
    app.patch('/:id', { preHandler: [app.authenticate] }, updateHandler);
    app.delete('/:id', { preHandler: [app.authenticate] }, deleteHandler);
}
//# sourceMappingURL=masterdata.controller.js.map