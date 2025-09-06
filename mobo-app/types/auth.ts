export type AuthContextType = {
    userToken: string | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
    signOut: () => Promise<void>;
};
