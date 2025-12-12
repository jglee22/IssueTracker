import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// TypeScript가 JWT_SECRET이 string임을 인식하도록 타입 단언
const secret: string = JWT_SECRET;

export const generateToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    secret,
    {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions
  );
};

export const verifyToken = (token: string): { userId: string } => {
  return jwt.verify(token, secret) as { userId: string };
};

