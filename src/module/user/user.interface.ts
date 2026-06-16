export interface IUser {
    id: string;
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}