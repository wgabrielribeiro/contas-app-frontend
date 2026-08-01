import React, { useState } from 'react';
import './Register.css';
import Modal from '../../components/Modal/Modal';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    surname: '',
    document: '',
    password: '',
    rePassword: '',
    email: '',
    birthDate: ''
  });
  const [errors, setErrors] = useState({});
  const [modalMessage, setModalMessage] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documentError, setDocumentError] = useState('');

  // Máscara de CPF
  const formatCPF = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleanValue.substring(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Validação de CPF
  const validateCPF = (cpf) => {
    const cleanDocument = cpf.replace(/\D/g, '');
    
    if (cleanDocument.length === 0) {
      return { valid: true, message: '' };
    }
    
    if (cleanDocument.length < 11) {
      return { valid: false, message: 'CPF incompleto' };
    }

    if (cleanDocument.length !== 11) {
      return { valid: false, message: 'CPF deve conter 11 dígitos' };
    }

    if (/^(\d)\1{10}$/.test(cleanDocument)) {
      return { valid: false, message: 'CPF inválido' };
    }

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleanDocument.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanDocument.substring(9, 10))) {
      return { valid: false, message: 'CPF inválido' };
    }

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleanDocument.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanDocument.substring(10, 11))) {
      return { valid: false, message: 'CPF inválido' };
    }

    return { valid: true, message: 'CPF válido' };
  };

  // Handler para mudança no CPF
  const handleDocumentChange = (value) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, document: formatted });
    
    const cleanValue = formatted.replace(/\D/g, '');
    if (cleanValue.length === 11) {
      const validation = validateCPF(formatted);
      setDocumentError(validation.valid ? '' : validation.message);
      setErrors({ ...errors, document: validation.valid ? '' : validation.message });
    } else if (cleanValue.length > 0) {
      setDocumentError('');
      setErrors({ ...errors, document: '' });
    } else {
      setDocumentError('');
      setErrors({ ...errors, document: '' });
    }
  };

  // Validação de email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username é obrigatório';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username deve ter pelo menos 3 caracteres';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.surname.trim()) {
      newErrors.surname = 'Sobrenome é obrigatório';
    }

    if (!formData.document.trim()) {
      newErrors.document = 'CPF é obrigatório';
    } else {
      const cpfValidation = validateCPF(formData.document);
      if (!cpfValidation.valid) {
        newErrors.document = cpfValidation.message;
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!formData.rePassword) {
      newErrors.rePassword = 'Confirmação de senha é obrigatória';
    } else if (formData.password !== formData.rePassword) {
      newErrors.rePassword = 'As senhas não coincidem';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.birthDate = 'Você deve ter pelo menos 18 anos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setModalMessage({
        title: 'Erro de Validação',
        message: 'Por favor, corrija os erros no formulário antes de continuar.'
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        username: formData.username,
        name: formData.name,
        surname: formData.surname,
        document: formData.document.replace(/\D/g, ''),
        password: formData.password,
        rePassword: formData.rePassword,
        email: formData.email,
        birthDate: new Date(formData.birthDate).toISOString()
      };

      const response = await fetch(`${process.env.REACT_APP_API_AUTENTICACAO_URL}/registerUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.isSuccess) {
        setModalMessage({
          title: 'Erro no Cadastro',
          message: data.message || 'Não foi possível realizar o cadastro. Tente novamente.'
        });
      } else {
        setSuccessModal({
          title: 'Cadastro Realizado!',
          message: 'Sua conta foi criada com sucesso. Verifique seu email para confirmar sua conta antes de fazer login.'
        });
        
        // Limpa o formulário
        setFormData({
          username: '',
          name: '',
          surname: '',
          document: '',
          password: '',
          rePassword: '',
          email: '',
          birthDate: ''
        });
        setErrors({});
      }
    } catch (err) {
      setModalMessage({
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor. Tente novamente mais tarde.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    // Limpa o erro do campo ao digitar
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1>Criar Conta</h1>
            <p>Preencha os dados abaixo para se cadastrar</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="Digite seu username"
                  disabled={loading}
                  className={errors.username ? 'error' : ''}
                />
                {errors.username && <span className="error-text">{errors.username}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nome *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Digite seu nome"
                  disabled={loading}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="surname">Sobrenome *</label>
                <input
                  type="text"
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => handleChange('surname', e.target.value)}
                  placeholder="Digite seu sobrenome"
                  disabled={loading}
                  className={errors.surname ? 'error' : ''}
                />
                {errors.surname && <span className="error-text">{errors.surname}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="document">CPF *</label>
                <input
                  type="text"
                  id="document"
                  value={formData.document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength="14"
                  disabled={loading}
                  className={errors.document ? 'error' : ''}
                  style={{
                    borderColor: documentError ? '#dc2626' : formData.document && !documentError && formData.document.replace(/\D/g, '').length === 11 ? '#059669' : ''
                  }}
                />
                {documentError && <span className="error-text">{documentError}</span>}
                {!documentError && formData.document && formData.document.replace(/\D/g, '').length === 11 && (
                  <span className="success-text">✓ CPF válido</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="birthDate">Data de Nascimento *</label>
                <input
                  type="date"
                  id="birthDate"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  disabled={loading}
                  className={errors.birthDate ? 'error' : ''}
                />
                {errors.birthDate && <span className="error-text">{errors.birthDate}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="seu@email.com"
                disabled={loading}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Senha *</label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={errors.password ? 'error' : ''}
                />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="rePassword">Confirmar Senha *</label>
                <input
                  type="password"
                  id="rePassword"
                  value={formData.rePassword}
                  onChange={(e) => handleChange('rePassword', e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className={errors.rePassword ? 'error' : ''}
                />
                {errors.rePassword && <span className="error-text">{errors.rePassword}</span>}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-register"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>
          </form>

          <div className="login-prompt">
            Já tem uma conta? <a href="/">Fazer login</a>
          </div>
        </div>
      </div>

      {modalMessage && (
        <Modal
          title={modalMessage.title}
          message={modalMessage.message}
          type="error"
          onClose={() => setModalMessage(null)}
        />
      )}

      {successModal && (
        <Modal
          title={successModal.title}
          message={successModal.message}
          type="success"
          onClose={() => {
            setSuccessModal(null);
            window.location.href = '/';
          }}
        />
      )}
    </div>
  );
}
