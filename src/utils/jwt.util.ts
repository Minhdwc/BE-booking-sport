import JWT, { JwtPayload, SignOptions } from 'jsonwebtoken';

export interface JwtPayloadReturn {
  id: string;
  email: string;
  role: string;
}

const generateToken = (payload: JwtPayload, secretSignature: string, tokenLife: string): string => {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: tokenLife as SignOptions['expiresIn'],
  };

  return JWT.sign(payload, secretSignature, options);
};

const verifyToken = (token: string, secretSignature: string): JwtPayloadReturn | null => {
  try {
    return JWT.verify(token, secretSignature) as JwtPayloadReturn;
  } catch {
    return null;
  }
};

export const JwtProvider = { generateToken, verifyToken };
