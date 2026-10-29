
const KEY = 'financas-pessoais-v6';

function loadData() {
    try {
        const saved =
            localStorage.getItem(KEY) ||
            localStorage.getItem('financas-pessoais-v5') ||
            localStorage.getItem('financas-pessoais-v4');

        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return {};
    }
}

let data = loadData();

const defaults = {
    salary: 0,
    investmentMonthly: 0,
    investments: [],
    transactions: [],
    bills: []
};

for (const [key, value] of Object.entries(defaults)) {
    data[key] ??= value;
}

let page = 'dashboard';
let mode = 'transaction';
let editingId = null;

const $ = selector => document.querySelector(selector);

const id = () => crypto.randomUUID();

const sum = (array, fn) =>
    array.reduce((total, item) => total + Number(fn(item) || 0), 0);

const money = value =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(Number(value) || 0);

const br = date =>
    date ? date.split('-').reverse().join('/') : '';

const today = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const esc = value =>
    String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Não foi possível salvar os dados.');
    }
}

// ==============================
// TABELAS
// ==============================

function table(rows, cols, key) {
    if (!rows.length) {
        return '<p class="note">Nenhum registro encontrado.</p>';
    }

    return `
        <div style="overflow:auto">
            <table>
                <thead>
                    <tr>
                        ${cols.map(col => `<th>${col[0]}</th>`).join('')}
                        <th>Ações</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${cols.map(col => `
                                <td>${esc(col[1](row))}</td>
                            `).join('')}

                            <td>
                                <button data-edit="${key}:${row.id}">
                                    Editar
                                </button>

                                <button data-delete="${key}:${row.id}">
                                    Excluir
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==============================
// DASHBOARD
// ==============================

function dashboard() {
    const transactions = data.transactions;

    const income =
        Number(data.salary) +
        sum(
            transactions.filter(x => x.type === 'receita'),
            x => x.amount
        );

    const expense = sum(
        transactions.filter(x => x.type === 'despesa'),
        x => x.amount
    );

    const pending = sum(
        data.bills.filter(x => x.status === 'Pendente'),
        x => x.amount
    );

    const invested = sum(
        data.investments,
        x => x.amount
    );

    const available =
        income - expense - Number(data.investmentMonthly);

    $('#content').innerHTML = `
        <div class="grid">

            ${[
                ['Salário mensal e receitas', income, 'good'],
                ['Aporte mensal', data.investmentMonthly, 'bad'],
                [
                    'Disponível após aporte',
                    available,
                    available >= 0 ? 'good' : 'bad'
                ],
                ['Total investido', invested, 'good']
            ].map(item => `
                <article class="card">
                    <small>${item[0]}</small>

                    <strong class="${item[2]}">
                        ${money(item[1])}
                    </strong>
                </article>
            `).join('')}

        </div>

        <article class="panel">

            <h3>Uso planejado do salário</h3>

            <div class="form-grid">

                <div>
                    <small>SALÁRIO E RECEITAS</small>
                    <h3>${money(income)}</h3>
                </div>

                <div>
                    <small>INVESTIMENTO SEPARADO</small>
                    <h3 class="bad">
                        − ${money(data.investmentMonthly)}
                    </h3>
                </div>

                <div>
                    <small>DESPESAS LANÇADAS</small>
                    <h3 class="bad">
                        − ${money(expense)}
                    </h3>
                </div>

                <div>
                    <small>CONTAS PENDENTES</small>
                    <h3 class="bad">
                        − ${money(pending)}
                    </h3>
                </div>

            </div>

            <p class="note">
                Saldo projetado após contas pendentes:
                ${money(available - pending)}.
            </p>

        </article>
    `;
}

// ==============================
// SALÁRIO
// ==============================

function salary() {
    $('#content').innerHTML = `
        <article class="panel">

            <h3>Salário mensal</h3>

            <form id="salaryForm" class="form-grid">

                <label>
                    Salário líquido

                    <input
                        name="salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${Number(data.salary)}"
                        required
                    >
                </label>

                <div>
                    <button class="primary">
                        Salvar salário
                    </button>
                </div>

            </form>

        </article>
    `;

    $('#salaryForm').onsubmit = event => {
        event.preventDefault();

        data.salary = Number(
            new FormData(event.target).get('salary')
        );

        save();
        render();
    };
}

// ==============================
// INVESTIMENTOS
// ==============================

function investments() {
    const total = sum(
        data.investments,
        x => x.amount
    );

    const types = ['Poupança', 'Emergencial', 'Sonho'];

    $('#content').innerHTML = `
        <div class="grid">

            ${types.map(type => `
                <article class="card">
                    <small>${type.toUpperCase()}</small>

                    <strong class="good">
                        ${money(
                            sum(
                                data.investments.filter(
                                    x => x.type === type
                                ),
                                x => x.amount
                            )
                        )}
                    </strong>
                </article>
            `).join('')}

            <article class="card">
                <small>TOTAL INVESTIDO</small>
                <strong class="good">${money(total)}</strong>
            </article>

        </div>

        <article class="panel">

            <h3>Aporte mensal</h3>

            <p class="note">
                Este valor é separado do salário no planejamento mensal.
                Registre os aportes abaixo e escolha a finalidade
                de cada investimento.
            </p>

            <form id="investForm" class="form-grid">

                <label>
                    Valor mensal a investir

                    <input
                        name="monthly"
                        type="number"
                        min="0"
                        step="0.01"
                        value="${Number(data.investmentMonthly)}"
                        required
                    >
                </label>

                <div>
                    <button class="primary">
                        Salvar aporte
                    </button>
                </div>

            </form>

        </article>

        <article class="panel">

            <div class="toolbar">
                <h3>Histórico de aportes</h3>

                <button id="newInvest" class="primary">
                    Registrar aporte
                </button>
            </div>

            ${table(
                data.investments,
                [
                    ['Tipo', x => x.type || 'Poupança'],
                    ['Descrição', x => x.name],
                    ['Valor', x => money(x.amount)],
                    ['Data', x => br(x.date)]
                ],
                'investments'
            )}

        </article>
    `;

    $('#investForm').onsubmit = event => {
        event.preventDefault();

        data.investmentMonthly = Number(
            new FormData(event.target).get('monthly')
        );

        save();
        render();
    };

    $('#newInvest').onclick = () => {
        mode = 'investment';
        editingId = null;
        openForm();
    };
}

// ==============================
// MOVIMENTAÇÕES E CONTAS
// ==============================

function records() {
    $('#content').innerHTML = `
        <article class="panel">

            <div class="toolbar">
                <h3>Movimentações</h3>

                <button id="newTx" class="primary">
                    Adicionar movimentação
                </button>
            </div>

            ${table(
                data.transactions,
                [
                    ['Tipo', x => x.type],
                    ['Descrição', x => x.description],
                    ['Categoria', x => x.category],
                    ['Valor', x => money(x.amount)],
                    ['Data', x => br(x.date)]
                ],
                'transactions'
            )}

        </article>

        <article class="panel">

            <div class="toolbar">
                <h3>Contas a pagar</h3>

                <button id="newBill" class="primary">
                    Adicionar conta
                </button>
            </div>

            ${table(
                data.bills,
                [
                    ['Descrição', x => x.description],
                    ['Categoria', x => x.category],
                    ['Valor', x => money(x.amount)],
                    ['Vencimento', x => br(x.due)],
                    ['Status', x => x.status]
                ],
                'bills'
            )}

        </article>
    `;

    $('#newTx').onclick = () => {
        mode = 'transaction';
        editingId = null;
        openForm();
    };

    $('#newBill').onclick = () => {
        mode = 'bill';
        editingId = null;
        openForm();
    };
}

// ==============================
// CONFIGURAÇÃO DOS FORMULÁRIOS
// ==============================

const cats =
    'Alimentação,Moradia,Transporte,Saúde,Educação,Lazer,Assinaturas,Compras,Outros';

const defs = {
    transaction: [
        ['type', 'Tipo', 'select', 'receita,despesa'],
        ['description', 'Descrição', 'text'],
        ['amount', 'Valor', 'number'],
        ['category', 'Categoria', 'select', cats],
        ['date', 'Data', 'date']
    ],

    bill: [
        ['description', 'Descrição', 'text'],
        ['amount', 'Valor', 'number'],
        ['category', 'Categoria', 'select', cats],
        ['due', 'Vencimento', 'date'],
        ['status', 'Status', 'select', 'Pendente,Paga']
    ],

    investment: [
        ['type', 'Tipo de investimento', 'select', 'Poupança,Emergencial,Sonho'],
        ['name', 'Descrição', 'text'],
        ['amount', 'Valor do aporte', 'number'],
        ['date', 'Data', 'date']
    ]
};

const keyFor = {
    transaction: 'transactions',
    bill: 'bills',
    investment: 'investments'
};

const titles = {
    dashboard: 'Visão geral',
    salary: 'Salário mensal',
    investments: 'Investimentos',
    records: 'Movimentações e contas'
};

// ==============================
// RENDERIZAÇÃO
// ==============================

function render() {
    $('#heading').textContent = titles[page];

    $('#add').hidden = true;

    document.querySelectorAll('nav button').forEach(button => {
        button.classList.toggle(
            'active',
            button.dataset.page === page
        );
    });

    const pages = {
        dashboard,
        salary,
        investments,
        records
    };

    pages[page]();

    // Excluir registros
    document.querySelectorAll('[data-delete]').forEach(button => {
        button.onclick = () => {
            const [key, itemId] = button.dataset.delete.split(':');

            if (!confirm('Deseja realmente excluir este registro?')) {
                return;
            }

            data[key] = data[key].filter(
                item => item.id !== itemId
            );

            save();
            render();
        };
    });

    // Editar registros
    document.querySelectorAll('[data-edit]').forEach(button => {
        button.onclick = () => {
            const [key, itemId] = button.dataset.edit.split(':');

            mode = {
                transactions: 'transaction',
                bills: 'bill',
                investments: 'investment'
            }[key];

            editingId = itemId;

            openForm();
        };
    });
}

// ==============================
// ABRIR FORMULÁRIO
// ==============================

function openForm() {
    const fields = defs[mode];
    const key = keyFor[mode];

    const old = editingId
        ? data[key].find(item => item.id === editingId)
        : null;

    $('#formTitle').textContent =
        (old ? 'Editar ' : 'Registrar ') +
        (
            mode === 'bill'
                ? 'conta'
                : mode === 'investment'
                    ? 'aporte'
                    : 'movimentação'
        );

    $('#formFields').innerHTML = fields.map(
        ([name, label, type, options]) => {

            const value = old?.[name] ??
                (
                    name === 'date' || name === 'due'
                        ? today()
                        : ''
                );

            if (type === 'select') {
                return `
                    <label>
                        ${label}

                        <select name="${name}" required>
                            ${options.split(',').map(option => `
                                <option
                                    value="${esc(option)}"
                                    ${option === value ? 'selected' : ''}
                                >
                                    ${esc(option)}
                                </option>
                            `).join('')}
                        </select>
                    </label>
                `;
            }

            return `
                <label>
                    ${label}

                    <input
                        name="${name}"
                        type="${type}"
                        value="${esc(value)}"
                        required
                        ${type === 'number'
                            ? 'min="0" step="0.01"'
                            : ''}
                    >
                </label>
            `;
        }
    ).join('');

    $('#modal').showModal();
}

// ==============================
// NAVEGAÇÃO
// ==============================

document.querySelectorAll('nav button').forEach(button => {
    button.onclick = () => {
        page = button.dataset.page;
        editingId = null;
        render();
    };
});

// ==============================
// CANCELAR FORMULÁRIO
// ==============================

$('#cancel').onclick = () => {
    $('#modal').close();
    editingId = null;
};

// ==============================
// SALVAR FORMULÁRIO
// ==============================

$('#form').onsubmit = event => {
    event.preventDefault();

    const row = Object.fromEntries(
        new FormData(event.target)
    );

    if ('amount' in row) {
        row.amount = Number(row.amount);
    }

    const key = keyFor[mode];

    if (editingId) {
        row.id = editingId;

        data[key] = data[key].map(item =>
            item.id === editingId ? row : item
        );
    } else {
        row.id = id();
        data[key].push(row);
    }

    save();

    editingId = null;

    $('#modal').close();

    render();
};

// ==============================
// EXPORTAR BACKUP
// ==============================

$('#export').onclick = () => {
    const backup = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
    );

    const url = URL.createObjectURL(backup);

    const link = document.createElement('a');

    link.href = url;
    link.download = 'financas-backup.json';

    link.click();

    URL.revokeObjectURL(url);
};

// ==============================
// INICIALIZAÇÃO
// ==============================

render();
