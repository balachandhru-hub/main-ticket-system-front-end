export interface User {
  email: string;
  password: string;
  name: string;
  aribaType: string;
  isActive: boolean;
  role: 'admin' | 'user';
}

const dummyUsers: User[] = [
  {
    email: 'john.doe@example.com',
    password: 'password123',
    name: 'John Doe',
    aribaType: 'Ariba Buyer',
    isActive: true,
    role: 'admin',
  },
  {
    email: 'jane.smith@example.com',
    password: 'pass456',
    name: 'Jane Smith',
    aribaType: 'Ariba Network',
    isActive: true,
    role: 'user',
    
  },
];

export function loginUser(email: string, password: string): User | null {
  const user = dummyUsers.find(
    (u) => u.email === email && u.password === password && u.isActive
  );
  return user || null;
}
