BigInt.prototype.toJSON = function () {
    return Number(this);
};
import { startApp } from './app.js';
startApp().catch((err) => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map