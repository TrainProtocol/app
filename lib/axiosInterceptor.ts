import axios from "axios";
import LayerSwapApiClient from "./layerSwapApiClient";

export const InitializeUnauthInstance = (baseURL?: string) => {

    const instance = axios.create({
        baseURL: baseURL || "",
        headers: {
            "Content-Type": "application/json",
        },
    });

    return instance;
}

