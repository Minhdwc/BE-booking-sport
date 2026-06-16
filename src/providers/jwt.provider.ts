import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

interface IJwtPayload {
    [key: string]: string;
}

export interface JwtPayloadResponse {
    id: string;
    email: string;
    username: string;
    role: string;
}

export interface RefreshTokensResult {
    accessToken: string;
    refreshToken: string;
    accessTokenRenewed: boolean;
}

const FIVE_MINUTES_IN_SECONDS = 5 * 60;

export const generateToken = (payload: IJwtPayload, secretSignature: string, tokenLife: string | number): string => {
    const options: SignOptions = { algorithm: "HS256", expiresIn: tokenLife as SignOptions['expiresIn'] }
    return jwt.sign(payload, secretSignature, options);
}

export const generateRefreshToken = (payload: IJwtPayload, secretSignature: string, tokenLife: string | number): string => {
    const options: SignOptions = { algorithm: "HS256", expiresIn: tokenLife as SignOptions['expiresIn'] }
    return jwt.sign(payload, secretSignature, options);
}

export const verifyToken = (token: string, secretSignature: string): JwtPayloadResponse | null => {
    try {
        return jwt.verify(token, secretSignature) as JwtPayloadResponse;
    } catch {
        return null;
    }
}

export const getTokenRemainingSeconds = (token: string): number | null => {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded?.exp) return null;
    return decoded.exp - Math.floor(Date.now() / 1000);
}

export const shouldRenewAccessToken = (
    accessToken: string,
    thresholdSeconds = FIVE_MINUTES_IN_SECONDS
): boolean => {
    const remaining = getTokenRemainingSeconds(accessToken);
    if (remaining === null) return true;
    return remaining < thresholdSeconds;
}

export const refreshTokens = (
    accessToken: string,
    refreshToken: string,
    accessSecret: string,
    refreshSecret: string,
    accessTokenLife: string | number,
): RefreshTokensResult | null => {
    const refreshPayload = verifyToken(refreshToken, refreshSecret);
    if (!refreshPayload) {
        return null;
    }

    const payload: IJwtPayload = {
        id: refreshPayload.id,
        email: refreshPayload.email,
        username: refreshPayload.username,
        role: refreshPayload.role,
    };

    let newAccessToken = accessToken;
    let accessTokenRenewed = false;

    if (shouldRenewAccessToken(accessToken)) {
        newAccessToken = generateToken(payload, accessSecret, accessTokenLife);
        accessTokenRenewed = true;
    }

    return {
        accessToken: newAccessToken,
        refreshToken,
        accessTokenRenewed,
    };
}

export const JwtProvider = {
    generateToken,
    verifyToken,
    generateRefreshToken,
    getTokenRemainingSeconds,
    shouldRenewAccessToken,
    refreshTokens,
}
