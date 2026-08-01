import React, { useState } from 'react';
import './Login.css';
import Modal from '../../components/Modal/Modal';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [modalMessage, setModalMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Redireciona se já estiver logado
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    if (token && tokenExpiry) {
      // Verifica se o token ainda é válido
      const expiryTime = new Date(localStorage.getItem('tokenIssuedAt')).getTime() + (parseInt(tokenExpiry) * 1000);
      const now = new Date().getTime();
      
      if (now < expiryTime) {
        // Token ainda válido, redireciona para dashboard
        window.location.href = '/dashboard';
      } else {
        // Token expirado, limpa localStorage
        localStorage.clear();
      }
    }
  }, []);

  const validateInputs = () => {
    if (!identifier.trim()) {
      return 'Por favor, insira seu email ou usuário.';
    }
    if (!password) {
      return 'Por favor, insira sua senha.';
    }
    if (password.length < 4) {
      return 'A senha deve ter pelo menos 4 caracteres.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    
    try {
      // Prepara o payload baseado no tipo de identificador
      const identifierValue = identifier.trim();
      const isEmail = identifierValue.includes('@');
      
      const payload = {
        ...(isEmail ? { email: identifierValue } : { username: identifierValue }),
        password: password,
      };

      const response = await fetch(`${process.env.REACT_APP_API_AUTENTICACAO_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.isSuccess) {
        // Mostra modal com erro retornado pela API
        setModalMessage(data.message || 'Credenciais inválidas. Verifique seu email/usuário e senha.');
      } else {
        // Login bem-sucedido
        if (data.data && data.data.token) {
          // Decodifica o token JWT para extrair informações do usuário
          const token = data.data.token;
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            const userId = decoded.sub || decoded.userId || decoded.id || '';
            
            // Busca informações completas do usuário incluindo isConfirmated
            const userResponse = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Auth/getUserById`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ idUser: parseInt(userId) })
            });
            
            if (!userResponse.ok) {
              setModalMessage('Erro ao buscar informações do usuário. Tente novamente.');
              return;
            }
            
            const userData = await userResponse.json();
            
            if (!userData.isSuccess || !userData.data) {
              setModalMessage('Erro ao buscar informações do usuário. Tente novamente.');
              return;
            }
            
            // Verifica se o usuário está confirmado
            if (!userData.data.isConfirmated) {
              setModalMessage('Sua conta ainda não foi confirmada. Por favor, verifique seu email ou entre em contato com o administrador.');
              return;
            }
            
            // Salva o token e informações do usuário no localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', data.data.refreshToken || '');
            localStorage.setItem('tokenExpiry', data.data.expiresIn);
            localStorage.setItem('tokenIssuedAt', data.data.issuedAt);
            localStorage.setItem('userId', userData.data.idUser.toString());
            localStorage.setItem('userName', `${userData.data.name} ${userData.data.surname}`);
            localStorage.setItem('userEmail', userData.data.email || '');
            localStorage.setItem('userRole', userData.data.role === 0 ? 'Admin' : 'User');
            localStorage.setItem('isConfirmated', userData.data.isConfirmated.toString());
          } catch (decodeError) {
            console.error('Erro ao decodificar token:', decodeError);
          }
          
          // Redireciona para o dashboard
          window.location.href = '/dashboard';
        } else {
          setModalMessage('Resposta inválida do servidor. Tente novamente.');
        }
      }
    } catch (err) {
      // Erro de rede ou servidor
      setModalMessage('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Bem-vindo de volta</h1>
            <p>Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="identifier">Email ou Usuário</label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="seu@email.com ou usuario"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="btn-login"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="login-footer">
              <a href="#forgot" className="forgot-link">Esqueceu sua senha?</a>
            </div>
          </form>

          <div className="divider">
            <span>ou</span>
          </div>

          <div className="social-login">
            <button className="btn-social" disabled={loading}>
              <span>🔷</span> Entrar com Google
            </button>
            <button className="btn-social" disabled={loading}>
              <span>⚫</span> Entrar com GitHub
            </button>
          </div>

          <div className="signup-prompt">
            Não tem uma conta? <a href="/register">Criar conta</a>
          </div>
        </div>
      </div>

      {modalMessage && (
        <Modal 
          message={modalMessage} 
          onClose={() => setModalMessage(null)} 
        />
      )}
    </div>
  );
}
