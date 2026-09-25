declare module "jsonwebtoken" {
  export interface JwtPayload {
    sub?: string;
    [key: string]: unknown;
  }
  export function sign(
    payload: Record<string, unknown>,
    secretOrPrivateKey: string,
    options?: { expiresIn?: string | number }
  ): string;
  export function verify(token: string, secret: string): JwtPayload;
}
declare module "bcryptjs" {
  export function hash(password: string, salt: number): Promise<string>;
  export function compare(password: string, hash: string): Promise<boolean>;
}
declare module "cookie" {
  export function parse(str: string): Record<string, string>;
  export function serialize(name: string, value: string, options?: Record<string, unknown>): string;
}
