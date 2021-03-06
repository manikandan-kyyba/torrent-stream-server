"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupStreamApi = void 0;
const pump_1 = __importDefault(require("pump"));
const range_parser_1 = __importDefault(require("range-parser"));
const utils_1 = require("../utils");
function setupStreamApi(app, config, logger, client) {
    app.get('/stream', async (req, res) => {
        const data = config.security.streamApi ?
            utils_1.verifyJwrRoken(String(req.query.token), config.security.streamApi.key, config.security.streamApi.maxAge) :
            req.query;
        if (!data) {
            logger.warn(`Access denied`);
            return res.send(403);
        }
        const link = data.torrent;
        if (!link) {
            return res.send(400);
        }
        let torrent;
        try {
            torrent = await client.addAndGet(link);
        }
        catch (error) {
            logger.warn(`Bad torrent: ${error}`);
            return res.sendStatus(400).send(String(error));
        }
        const file = torrent.files.find(f => f.name === data.file) || torrent.files[0];
        if (!file) {
            return res.send(400);
        }
        const parsedRange = req.headers.range ? range_parser_1.default(file.length, req.headers.range) : undefined;
        const range = parsedRange instanceof Array ? parsedRange[0] : undefined;
        res.setHeader('Accept-Ranges', 'bytes');
        res.type(file.name);
        req.connection.setTimeout(3600000);
        if (!range) {
            res.setHeader('Content-Length', file.length);
            if (req.method === 'HEAD') {
                return res.end();
            }
            return pump_1.default(file.createReadStream(), res);
        }
        res.statusCode = 206;
        res.setHeader('Content-Length', range.end - range.start + 1);
        res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length);
        if (req.method === 'HEAD') {
            return res.end();
        }
        return pump_1.default(file.createReadStream(range), res);
    });
    return app;
}
exports.setupStreamApi = setupStreamApi;
