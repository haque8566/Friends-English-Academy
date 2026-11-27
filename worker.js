import { Container } from "@cloudflare/containers";

export class AppContainer extends Container {
    defaultPort = 3000;
    sleepAfter = "10m";

    constructor(ctx, env) {
        super(ctx, env);
        this.envVars = {
            PORT: "3000",
            NODE_ENV: "production",
            ...(env.MONGO_URI ? { MONGO_URI: env.MONGO_URI } : {}),
            ...(env.SESSION_SECRET ? { SESSION_SECRET: env.SESSION_SECRET } : {}),
            ...(env.ADMIN_SECRET_KEY ? { ADMIN_SECRET_KEY: env.ADMIN_SECRET_KEY } : {}),
        };
    }
}

export default {
    async fetch(request, env) {
        const container = env.APP_CONTAINER.getByName("main-app");
        return await container.fetch(request);
    },
};
