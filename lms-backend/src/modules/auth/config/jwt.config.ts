import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  // ACCESS_TOKEN_TTL is in seconds (e.g., 1800 = 30 min). Number values are interpreted as seconds by jsonwebtoken.
  expiresIn: Number(process.env.ACCESS_TOKEN_TTL ?? 1800),
}));
