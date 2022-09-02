import { Environment } from "environment";

export const uri = Environment.BACKEND_URL;

export const optionsWithCookie = {
    withCredentials: true
};

export const optionsWithCookieEmpty = {
    withCredentials: true,
    responseType: "text" as "json"
};
