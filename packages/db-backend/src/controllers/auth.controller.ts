import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Basic validation
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      // Register user
      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Basic validation
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Login user
      const result = await authService.login({ email, password });

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(401).json({ error: error.message });
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await authService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error: any) {
      console.error('Get me error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();

