import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../config/environment';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  const secret = config.jwtSecret as Secret;
  const expiresIn = config.jwtExpiresIn as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const secret = config.jwtRefreshSecret as Secret;
  const expiresIn = config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

