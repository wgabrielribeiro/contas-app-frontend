import React, { useState, useEffect, useCallback } from 'react';
import './Dashboard.css';
import { startTokenRefreshMonitor, stopTokenRefreshMonitor } from '../../utils/tokenRefresh';

export default function Dashboard() {
  const commonMonthlyCategories = [
    'Moradia',
    'Alimentação',
    'Transporte',
    'Saúde',
    'Educação',
    'Lazer',
    'Internet e Telefonia',
    'Assinaturas',
    'Impostos e Taxas',
    'Cartão de Crédito',
    'Investimentos',
    'Outros'
  ];

  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${now.getFullYear()}-${month}`;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDebts, setSelectedDebts] = useState(new Set());
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [formData, setFormData] = useState({
    idGastos: 0,
    descricaoGasto: '',
    categoria: '',
    quantidadeParcela: '',
    valorParcela: '',
    dataVencimento: ''
  });

  useEffect(() => {
    // Busca informações do usuário do localStorage
    const name = localStorage.getItem('userName');
    const id = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    setUserName(name || 'Usuário');
    setUserId(id);
    setUserRole(role || 'User');

    // Inicia o monitoramento de refresh do token
    const refreshIntervalId = startTokenRefreshMonitor();

    // Cleanup: para o monitoramento quando o componente for desmontado
    return () => {
      stopTokenRefreshMonitor(refreshIntervalId);
    };
  }, []);

  const fetchDebts = useCallback(async (monthReference) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const dateParam = `${monthReference}-01`;
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Contas/GetAllContasByDate/${userId}?date=${encodeURIComponent(dateParam)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDebts(data.data || data || []);
      } else {
        setDebts([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dívidas:', error);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchDebts(selectedMonth);
    }
  }, [userId, selectedMonth, fetchDebts]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('tokenIssuedAt');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };

  const navigateToUserManagement = () => {
    window.location.href = '/user-management';
  };

  const handleAddDebt = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Prepara o payload no formato esperado pela API
      const payload = {
        idUser: parseInt(userId),
        idGastos: 0, // Novo registro, ID será gerado pela API
        categoria: formData.categoria || 'Geral',
        descricaoGasto: formData.descricaoGasto,
        quantidadeParcela: parseInt(formData.quantidadeParcela) || 1,
        valorParcela: parseFloat(parseCurrencyInput(formData.valorParcela)),
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        flFinalizado: false
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Contas/addConta`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchDebts(selectedMonth);
        setShowAddModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert('Erro ao adicionar dívida: ' + (error.message || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro ao adicionar dívida:', error);
      alert('Erro ao adicionar dívida. Verifique os dados e tente novamente.');
    }
  };

  const handleUpdateDebt = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Prepara o payload no formato esperado pela API
      const payload = {
        idUser: parseInt(userId),
        idGastos: formData.idGastos,
        categoria: formData.categoria || 'Geral',
        descricaoGasto: formData.descricaoGasto,
        quantidadeParcela: parseInt(formData.quantidadeParcela) || 1,
        valorParcela: parseFloat(parseCurrencyInput(formData.valorParcela)),
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        flFinalizado: false
      };
      
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/Contas/updateConta`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchDebts(selectedMonth);
        setShowEditModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert('Erro ao atualizar dívida: ' + (error.message || 'Tente novamente'));
      }
    } catch (error) {
      console.error('Erro ao atualizar dívida:', error);
      alert('Erro ao atualizar dívida. Verifique os dados e tente novamente.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDebts.size === 0) return;
    
    if (window.confirm(`Deseja realmente excluir ${selectedDebts.size} dívida(s)?`)) {
      try {
        const token = localStorage.getItem('token');
        await Promise.all(
          Array.from(selectedDebts).map(id =>
            fetch(`${process.env.REACT_APP_API_BASE_URL}/Contas/deleteConta/${id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
          )
        );
        await fetchDebts(selectedMonth);
        setSelectedDebts(new Set());
      } catch (error) {
        console.error('Erro ao excluir dívidas:', error);
      }
    }
  };

  const handleEditClick = (debt) => {
    setFormData({
      idGastos: debt.idGastos,
      descricaoGasto: debt.descricaoGasto,
      categoria: debt.categoria,
      quantidadeParcela: debt.quantidadeParcela,
      valorParcela: formatCurrencyInput(debt.valorParcela),
      dataVencimento: debt.dataVencimento ? debt.dataVencimento.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const toggleSelectDebt = (id) => {
    const newSelected = new Set(selectedDebts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDebts(newSelected);
  };

  const resetForm = () => {
    setFormData({
      idGastos: 0,
      descricaoGasto: '',
      categoria: '',
      quantidadeParcela: '',
      valorParcela: '',
      dataVencimento: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value) || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Formata valor para moeda brasileira (exibição)
  const formatCurrencyInput = (value) => {
    if (!value) return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Remove formatação e retorna número decimal (para enviar ao backend)
  const parseCurrencyInput = (value) => {
    if (!value) return '';
    return value.replace(/\./g, '').replace(',', '.');
  };

  // Manipula mudança no campo de valor
  const handleCurrencyChange = (value) => {
    // Remove tudo exceto dígitos
    const cleanValue = value.replace(/\D/g, '');
    
    if (!cleanValue) return '';
    
    // Converte para número e divide por 100 para obter centavos
    const numValue = parseFloat(cleanValue) / 100;
    
    // Formata como moeda brasileira
    return numValue.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const formatMonthLabel = (monthKey) => {
    if (!monthKey || monthKey === 'sem-data') return 'Sem data de vencimento';
    const [year, month] = monthKey.split('-');
    const monthDate = new Date(Number(year), Number(month) - 1, 1);
    return monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const groupedDebtsByMonth = debts.reduce((acc, debt) => {
    const parsedDate = debt.dataVencimento ? new Date(debt.dataVencimento) : null;
    const monthKey = parsedDate && !isNaN(parsedDate)
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`
      : 'sem-data';

    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }

    acc[monthKey].push(debt);
    return acc;
  }, {});

  const monthGroups = Object.entries(groupedDebtsByMonth).sort(([monthA], [monthB]) => monthA.localeCompare(monthB));

  const categoryTotals = debts.reduce((acc, debt) => {
    const categoryName = debt.categoria || 'Sem categoria';
    const value = Number(debt.valorParcela) || 0;
    acc[categoryName] = (acc[categoryName] || 0) + value;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryTotals).sort(([, valueA], [, valueB]) => valueB - valueA);
  const maxCategoryValue = categoryChartData.length > 0 ? categoryChartData[0][1] : 0;

  const totalDebts = debts.reduce((sum, debt) => sum + (Number(debt.valorParcela) || 0), 0);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>💰 Gerenciador de Dívidas</h1>
          <div className="user-section">
            <div className="user-info" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer', position: 'relative' }}>
              <span className="user-icon">👤</span>
              <span className="user-name">{userName}</span>
              <span style={{ marginLeft: '5px', fontSize: '12px' }}>▼</span>
              {showUserMenu && (
                <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  {userRole === 'Admin' && (
                    <>
                      <button className="dropdown-item" onClick={navigateToUserManagement}>
                        👥 Gerenciar Usuários
                      </button>
                      <div className="dropdown-divider"></div>
                    </>
                  )}
                  <button className="dropdown-item" onClick={handleLogout}>
                    🚪 Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <div className="dashboard-summary">
          <div className="summary-card">
            <div className="summary-icon">📊</div>
            <div className="summary-info">
              <p className="summary-label">Total de Dívidas</p>
              <h2 className="summary-value">{formatCurrency(totalDebts)}</h2>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">📝</div>
            <div className="summary-info">
              <p className="summary-label">Quantidade</p>
              <h2 className="summary-value">{debts.length}</h2>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <div className="month-filter">
            <label htmlFor="monthSelector"><strong>Mês de referência</strong></label>
            <input
              id="monthSelector"
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDebts(new Set());
              }}
            />
          </div>
          <div className="dashboard-actions-right">
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ Adicionar Nova Dívida
            </button>
            {selectedDebts.size > 0 && (
              <button className="btn-danger" onClick={handleDeleteSelected}>
                🗑️ Excluir Selecionadas ({selectedDebts.size})
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-insights-grid">
          <section className="insight-card">
            <h3>📅 Visão por mês</h3>
            <p>
              Exibindo dados de <strong>{formatMonthLabel(selectedMonth)}</strong>.
            </p>
            <small>Use o seletor acima para alternar o período.</small>
          </section>

          <section className="insight-card">
            <h3>📈 Gastos por categoria</h3>
            {categoryChartData.length === 0 ? (
              <p className="empty-chart">Sem dados para o período selecionado.</p>
            ) : (
              <div className="category-chart">
                {categoryChartData.map(([category, value]) => {
                  const percentage = maxCategoryValue > 0 ? (value / maxCategoryValue) * 100 : 0;
                  return (
                    <div key={category} className="chart-row">
                      <div className="chart-header">
                        <span>{category}</span>
                        <strong>{formatCurrency(value)}</strong>
                      </div>
                      <div className="chart-bar-track">
                        <div className="chart-bar-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {loading ? (
          <div className="loading">Carregando dívidas...</div>
        ) : (
          <div className="months-container">
            {monthGroups.length === 0 ? (
              <div className="debts-table-container">
                <table className="debts-table">
                  <tbody>
                    <tr>
                      <td colSpan="7" className="empty-state">
                        Nenhuma dívida cadastrada para {formatMonthLabel(selectedMonth)}.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              monthGroups.map(([monthKey, monthDebts]) => (
                <section className="month-section" key={monthKey}>
                  <div className="month-section-header">
                    <h3>{formatMonthLabel(monthKey)}</h3>
                    <span>{monthDebts.length} registro(s)</span>
                  </div>

                  <div className="debts-table-container">
                    <table className="debts-table">
                      <thead>
                        <tr>
                          <th width="50">
                            <input
                              type="checkbox"
                              checked={monthDebts.length > 0 && monthDebts.every(d => selectedDebts.has(d.idGastos))}
                              onChange={(e) => {
                                const newSelected = new Set(selectedDebts);
                                if (e.target.checked) {
                                  monthDebts.forEach((d) => newSelected.add(d.idGastos));
                                } else {
                                  monthDebts.forEach((d) => newSelected.delete(d.idGastos));
                                }
                                setSelectedDebts(newSelected);
                              }}
                            />
                          </th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th>Valor</th>
                          <th>Parcelas</th>
                          <th>Vencimento</th>
                          <th width="150">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthDebts.map(debt => (
                          <tr key={debt.idGastos || debt.id} className={selectedDebts.has(debt.idGastos) ? 'selected' : ''}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedDebts.has(debt.idGastos)}
                                onChange={() => toggleSelectDebt(debt.idGastos)}
                              />
                            </td>
                            <td className="debt-description">{debt.descricaoGasto}</td>
                            <td className="debt-category">{debt.categoria || 'Sem categoria'}</td>
                            <td className="debt-amount">{formatCurrency(debt.valorParcela)}</td>
                            <td className="debt-amount">{debt.quantidadeParcela}</td>
                            <td>{formatDate(debt.dataVencimento)}</td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-edit"
                                  onClick={() => handleEditClick(debt)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => {
                                    setSelectedDebts(new Set([debt.idGastos]));
                                    handleDeleteSelected();
                                  }}
                                  title="Excluir"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Adicionar */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Adicionar Nova Dívida</h2>
            <div className="form-group">
              <label>Descrição *</label>
              <input
                type="text"
                value={formData.descricaoGasto}
                onChange={(e) => setFormData({ ...formData, descricaoGasto: e.target.value })}
                placeholder="Ex: Conta de Luz"
                required
              />
            </div>
            <div className='form-group'>
              <label>Categoria</label>
              <select
                value={formData.categoria || ''}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              >
                <option value="">Selecione uma categoria</option>
                {commonMonthlyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
                <label>Quantidade de Parcelas *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantidadeParcela}
                  onChange={(e) => setFormData({ ...formData, quantidadeParcela: e.target.value })}
                  placeholder="1"
                  required
                />
            </div>
            <div className="form-group">
              <label>Valor da Parcela (R$) *</label>
              <input
                type="text"
                value={formData.valorParcela}
                onChange={(e) => {
                  const formatted = handleCurrencyChange(e.target.value);
                  setFormData({ ...formData, valorParcela: formatted });
                }}
                placeholder="0,00"
                required
              />
            </div>
            <div className="form-group">
              <label>Data de Vencimento *</label>
              <input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowAddModal(false); resetForm(); }}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleAddDebt}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-form" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar Dívida</h2>
            <input type="hidden" value={formData.idGastos} />
            <div className="form-group">
              <label>Descrição *</label>
              <input
                type="text"
                value={formData.descricaoGasto}
                onChange={(e) => setFormData({ ...formData, descricaoGasto: e.target.value })}
                placeholder="Ex: Conta de Luz"
                required
              />
            </div>
            <div className='form-group'>
              <label>Categoria *</label>
              <select
                value={formData.categoria || ''}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                required
              >
                <option value="">Selecione uma categoria</option>
                {commonMonthlyCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantidade de Parcelas *</label>
              <input
                type="number"
                min="1"
                value={formData.quantidadeParcela}
                onChange={(e) => setFormData({ ...formData, quantidadeParcela: e.target.value })}
                placeholder="1"
                required
              />
            </div>
            <div className="form-group">
              <label>Valor da Parcela (R$) *</label>
              <input
                type="text"
                value={formData.valorParcela}
                onChange={(e) => {
                  const formatted = handleCurrencyChange(e.target.value);
                  setFormData({ ...formData, valorParcela: formatted });
                }}
                placeholder="0,00"
                required
              />
            </div>
            <div className="form-group">
              <label>Data de Vencimento *</label>
              <input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                required
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setShowEditModal(false); resetForm(); }}>
                Cancelar
              </button>
              <button className="btn-save" onClick={handleUpdateDebt}>
                Atualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
