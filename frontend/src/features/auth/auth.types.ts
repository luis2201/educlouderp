export type AuthUser = {
  id: string;
  persona_id: string;
  username: string;
  email_acceso: string | null;
  estado: string;
  debe_cambiar_clave: boolean;
  persona?: {
    id: number;
    nombres: string;
    apellidos: string;
    correo: string | null;
    estado: string;
  };
};

export type LoginResponse = {
  data: {
    token: string;
    token_tipo: 'Bearer';
    expira_en_segundos: number;
    usuario: AuthUser;
    sesion: {
      id: string;
      estado: string;
      fecha_expira: string;
    };
  };
};

export type MeResponse = {
  data: {
    id: string;
    estado: string;
    fecha_expira: string;
    usuario: AuthUser;
  };
};
