import { httpServerHandler } from "cloudflare:node";
import "./app.js";

export default httpServerHandler({ port: 3000 });
