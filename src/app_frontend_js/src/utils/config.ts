export const BACKEND_CANISTER_ID: string = import.meta.env.VITE_CANISTER_ID_APP_BACKEND;
export const SYSTEM_API_CANISTER_ID: string = import.meta.env.VITE_CANISTER_ID_SYSTEM_API;
export const CLIENT_BIND_HOST: string = import.meta.env.DEV ? "http://127.0.0.1:8080/" : "https://icp0.io/";

(window as any).BACKEND_CANISTER_ID = BACKEND_CANISTER_ID;
(window as any).SYSTEM_API_CANISTER_ID = SYSTEM_API_CANISTER_ID;
(window as any).CLIENT_BIND_HOST = CLIENT_BIND_HOST;