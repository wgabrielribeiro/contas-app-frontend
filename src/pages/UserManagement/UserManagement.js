import React, { useState, useEffect } from 'react';
import './UserManagement.css';
import Modal from '../../components/Modal/Modal';
import { startTokenRefreshMonitor, stopTokenRefreshMonitor } from '../../utils/tokenRefresh';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [errorModal, setErrorModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [documentError, setDocumentError] = useState('');
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

  useEffect(() => {
    fetchUsers();

    // Inicia o monitoramento de refresh do token
    const refreshIntervalId = startTokenRefreshMonitor();

    // Cleanup: para o monitoramento quando o componente for desmontado
    return () => {
      stopTokenRefreshMonitor(refreshIntervalId);
    };
  }, []);

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

    // Verifica se não são todos dígitos iguais
    if (/^(\d)\1{10}$/.test(cleanDocument)) {
      return { valid: false, message: 'CPF inválido' };
    }

    // Algoritmo de validação de CPF
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

  // Handler para mudança no CPF com validação reativa
  const handleDocumentChange = (value) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, document: formatted });
    
    // Valida apenas quando o usuário terminar de digitar (11 dígitos)
    const cleanValue = formatted.replace(/\D/g, '');
    if (cleanValue.length === 11) {
      const validation = validateCPF(formatted);
      setDocumentError(validation.valid ? '' : validation.message);
    } else if (cleanValue.length > 0) {
      setDocumentError('');
    } else {
      setDocumentError('');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Auth/listUsers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ordena por role: Admin (0) primeiro, depois User (1)
        const sortedUsers = (data.data || []).sort((a, b) => {
          const roleA = a.role === 'Admin' || a.role === 0 ? 0 : 1;
          const roleB = b.role === 'Admin' || b.role === 0 ? 0 : 1;
          return roleA - roleB;
        });
        setUsers(sortedUsers);
      } else {
        const error = await response.json();
        setErrorModal({
          title: 'Erro ao carregar usuários',
          message: error.message || 'Não foi possível carregar a lista de usuários.'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setErrorModal({
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor. Verifique sua conexão.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    // Validação de senha
    if (formData.password !== formData.rePassword) {
      setErrorModal({
        title: 'Erro de Validação',
        message: 'As senhas não coincidem. Por favor, verifique.'
      });
      return;
    }

    // Validação de CPF
    const cpfValidation = validateCPF(formData.document);
    if (!cpfValidation.valid) {
      setErrorModal({
        title: 'Erro de Validação',
        message: cpfValidation.message || 'CPF inválido. Por favor, verifique.'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        username: formData.username,
        name: formData.name,
        surname: formData.surname,
        document: formData.document,
        password: formData.password,
        rePassword: formData.rePassword,
        email: formData.email,
        birthDate: new Date(formData.birthDate).toISOString()
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Auth/registerUser`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchUsers();
        setShowAddModal(false);
        resetForm();
        alert('Usuário cadastrado com sucesso!');
      } else {
        const error = await response.json();
        setErrorModal({
          title: 'Erro ao Cadastrar',
          message: error.message || 'Não foi possível cadastrar o usuário. Tente novamente.'
        });
      }
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      setErrorModal({
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor. Verifique os dados e tente novamente.'
      });
    }
  };

  const handleUpdateRole = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Converte role: Admin = 0, User = 1
      const roleValue = formData.role === 'Admin' ? 0 : 1;
      
      const payload = {
        idUser: selectedUser.idUser,
        nameRole: formData.role,
        role: roleValue
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Auth/updateRole`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchUsers();
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        setSuccessModal({
          title: 'Sucesso!',
          message: 'Role atualizada com sucesso!'
        });
      } else {
        const error = await response.json();
        setErrorModal({
          title: 'Erro ao Atualizar Role',
          message: error.message || 'Não foi possível atualizar a role. Tente novamente.'
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      setErrorModal({
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor. Tente novamente.'
      });
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username || '',
      name: user.name || '',
      surname: user.surname || '',
      document: user.document || '',
      password: '',
      rePassword: '',
      email: user.email || '',
      birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
      role: user.role || 'User'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
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
  };

  const goBack = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="user-management">
      <header className="page-header">
        <div className="header-content">
          <button className="btn-back" onClick={goBack}>← Voltar</button>
          <h1>👥 Gerenciamento de Usuários</h1>
        </div>
      </header>

      <div className="page-container">
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ Cadastrar Novo Usuário
          </button>
        </div>

        {loading ? (
          <div className="loading">Carregando usuários...</div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th width="150">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.idUser}>
                      <input type="hidden" value={user.idUser} />
                      <td>{user.isConfirmated ? "Confirmado" : "Pendente"}</td>
                      <td>{user.name} {user.surname}</td>
                      <td>{user.email}</td>
                      <td>{user.username}</td>
                      <td>
                        <span className={`role-badge ${user.role === 0 ? 'admin' : 'user'}`}>
                          {`${user.role} - ${user.role === 0 ? 'Admin' : 'User'}`}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditClick(user)}
                          title="Editar Role"
                        >
                          ✏️ Editar Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastrar */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Cadastrar Novo Usuário</h2>
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username"
                required
              />
            </div>
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome"
                required
              />
            </div>
            <div className="form-group">
              <label>Sobrenome *</label>
              <input
                type="text"
                value={formData.surname}
                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                placeholder="Sobrenome"
                required
              />
            </div>
            <div className="form-group">
              <label>Documento (CPF) *</label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => handleDocumentChange(e.target.value)}
                placeholder="000.000.000-00"
                maxLength="14"
                required
                style={{
                  borderColor: documentError ? '#dc2626' : formData.document && !documentError && formData.document.replace(/\D/g, '').length === 11 ? '#059669' : '#e0e0e0'
                }}
              />
              {documentError && (
                <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  {documentError}
                </span>
              )}
              {!documentError && formData.document && formData.document.replace(/\D/g, '').length === 11 && (
                <span style={{ color: '#059669', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  ✓ CPF válido
                </span>
              )}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Data de Nascimento *</label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirmar Senha *</label>
              <input
                type="password"
                value={formData.rePassword}
                onChange={(e) => setFormData({ ...formData, rePassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowAddModal(false); resetForm(); }}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleAddUser}>
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Role */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar Role do Usuário</h2>
            <div className="form-group">
              <label>Usuário</label>
              <input
                type="text"
                value={`${selectedUser?.name} (${selectedUser?.email})`}
                disabled
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group">
              <label>Nova Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleUpdateRole}>
                Atualizar Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
      {errorModal && (
        <Modal
          title={errorModal.title}
          message={errorModal.message}
          onClose={() => setErrorModal(null)}
        />
      )}

      {/* Modal de Sucesso */}
      {successModal && (
        <Modal
          title={successModal.title}
          message={successModal.message}
          type="success"
          onClose={() => setSuccessModal(null)}
        />
      )}
    </div>
  );
}
