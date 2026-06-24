import { ClearDataInput } from './admin.schema.js';
import { clearAllData } from './admin.service.js';
export default async function adminRoutes(app) {
    app.post('/clear-all-data', {
        preHandler: [app.authenticate],
    }, async (request, _reply) => {
        const body = ClearDataInput.parse(request.body);
        const user = request.user;
        await clearAllData(user.id, body);
        return { success: true };
    });
}
//# sourceMappingURL=admin.controller.js.map