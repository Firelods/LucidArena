import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
} from 'react';

type User = {
    email: string;
    nickname?: string;
};

type AuthContextType = {
    user: User | null;
    setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const jwt = localStorage.getItem('jwt');
        if (!jwt) return;

        fetch('http://localhost:8080/api/user/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) setUser(data);
            });
    }, []);

    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
