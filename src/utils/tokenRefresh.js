// Função para verificar e renovar o token automaticamente
export const checkAndRefreshToken = async () => {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  const tokenIssuedAt = localStorage.getItem('tokenIssuedAt');

  if (!token || !refreshToken || !tokenExpiry || !tokenIssuedAt) {
    return false;
  }

  // Calcula o tempo de expiração
  const expiryTime = new Date(tokenIssuedAt).getTime() + (parseInt(tokenExpiry) * 1000);
  const now = new Date().getTime();
  const timeUntilExpiry = expiryTime - now;

  // Se faltar menos de 5 minutos para expirar (300000ms), renova o token
  if (timeUntilExpiry < 300000 && timeUntilExpiry > 0) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_AUTENTICACAO_URL}/refreshToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          IdToken: refreshToken
        }),
      });

      const data = await response.json();

      if (response.ok && data.isSuccess && data.data) {
        // Decodifica o novo token
        const newToken = data.data.token;
        const base64Url = newToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const decoded = JSON.parse(jsonPayload);

        // Atualiza o localStorage com os novos tokens
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('tokenExpiry', data.data.expiresIn);
        localStorage.setItem('tokenIssuedAt', data.data.issuedAt);
        localStorage.setItem('userId', decoded.sub || decoded.userId || decoded.id || '');
        localStorage.setItem('userName', decoded.name || decoded.username || decoded.email || 'Usuário');
        localStorage.setItem('userEmail', decoded.email || '');
        localStorage.setItem('userRole', decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'User');

        console.log('Token renovado com sucesso');
        return true;
      } else {
        // Falha ao renovar, desloga o usuário
        localStorage.clear();
        window.location.href = '/';
        return false;
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      // Em caso de erro de rede, mantém o usuário logado se o token ainda for válido
      if (timeUntilExpiry > 0) {
        return true;
      }
      localStorage.clear();
      window.location.href = '/';
      return false;
    }
  }

  // Se o token já expirou, desloga
  if (timeUntilExpiry <= 0) {
    localStorage.clear();
    window.location.href = '/';
    return false;
  }

  return true;
};

// Inicia o monitoramento automático do token
export const startTokenRefreshMonitor = () => {
  // Verifica a cada 2 minutos
  const intervalId = setInterval(() => {
    checkAndRefreshToken();
  }, 120000); // 2 minutos

  // Também verifica imediatamente
  checkAndRefreshToken();

  return intervalId;
};

// Para o monitoramento
export const stopTokenRefreshMonitor = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
  }
};
