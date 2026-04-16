import crypto from "node:crypto";

export const hashIt = (payload: string) => {
    return crypto.createHash('sha512').update(payload).digest('base64');
}