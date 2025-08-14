import axios from "axios";
import LayerSwapApiClient from "./trainApiClient";

export const InitializeUnauthInstance = (baseURL?: string) => {

    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return instance;
}

