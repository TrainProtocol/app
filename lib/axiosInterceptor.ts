import axios from "axios";
import https from "https";

const isDev = process.env.NODE_ENV !== "production";

export const InitializeUnauthInstance = (baseURL?: string) => {
    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
        httpsAgent: isDev
            ? new https.Agent({ rejectUnauthorized: false })
            : undefined,
    });

    return instance;
};

