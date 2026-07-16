const apiUrlFromEnv = import.meta.env.VITE_API_URL;
const defaultApiUrl = import.meta.env.DEV ? '' : window.location.origin;
export const API_URL = apiUrlFromEnv ?? defaultApiUrl;
