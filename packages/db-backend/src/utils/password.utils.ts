import bcrypt from 'bcrypt';
import { config } from '../config/environment';

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.bcryptRounds);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

