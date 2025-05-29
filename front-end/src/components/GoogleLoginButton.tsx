// src/components/GoogleLoginButton.tsx
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/constants';

const GoogleLoginButton = () => {
    const authContext = useAuth();
    if (!authContext) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    const { setUser } = authContext;

    const handleSuccess = async (credentialResponse:any) => {
        const { credential } = credentialResponse;
        // Envoyer le token au backend pour vérification
        const response = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: credential }),
        });
        const data = await response.json();
        if (data.jwt) {
            // Stocker le JWT et les informations utilisateur
            localStorage.setItem('jwt', data.jwt);
            setUser(data.user);
        }
    };

    return (
        <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.log('Login Failed')}
        />
    );
};

export default GoogleLoginButton;
