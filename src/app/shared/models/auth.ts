export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Resposta de `POST /auth/login` e `POST /auth/refresh`. */
export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
  /** Validade do token, em segundos. */
  expires_in: number;
}
